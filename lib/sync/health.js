// Apple Health ueber Health Auto Export: JSON-Dateien aus einem iCloud-Ordner lesen.
// Liefert Gewicht (Renpho) und Ernaehrung (MyFitnessPal).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getSetting, upsert, list } from '../store';

const MOBILE = path.join(os.homedir(), 'Library', 'Mobile Documents');

const NAMES = {
  weight: ['weight_body_mass', 'body_mass', 'weight'],
  fat_pct: ['body_fat_percentage'],
  kcal: ['dietary_energy', 'dietary_energy_consumed', 'energy_consumed'],
  protein: ['protein', 'dietary_protein'],
  carbs: ['carbohydrates', 'dietary_carbohydrates'],
  fat: ['total_fat', 'dietary_fat_total', 'fat_total'],
};
const norm = (s) => String(s || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
const FIELD = {};
for (const [f, names] of Object.entries(NAMES)) for (const n of names) FIELD[n] = f;

// Moegliche Ordner von Health Auto Export in iCloud Drive finden.
export function candidates() {
  const out = [];
  try {
    for (const d of fs.readdirSync(MOBILE)) {
      if (/health/i.test(d) && /export/i.test(d)) out.push(path.join(MOBILE, d, 'Documents'));
    }
    const drive = path.join(MOBILE, 'com~apple~CloudDocs');
    for (const d of fs.readdirSync(drive)) {
      if (/health/i.test(d) && /export/i.test(d)) out.push(path.join(drive, d));
    }
  } catch {}
  return out.filter((p) => fs.existsSync(p));
}

function walk(dir, files, stats, depth = 0) {
  if (depth > 6) return;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files, stats, depth + 1);
    else if (e.name.endsWith('.icloud')) stats.placeholders++;
    else if (e.name.toLowerCase().endsWith('.json')) {
      try {
        const st = fs.statSync(p);
        if (st.size < 80 * 1024 * 1024) files.push({ p, mtime: st.mtimeMs });
      } catch {}
    }
  }
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function syncHealth() {
  const cfg = getSetting('config', {});
  const dir = cfg.healthDir || candidates()[0];
  if (!dir) return { configured: false };
  if (!fs.existsSync(dir)) throw new Error('Ordner für Health Auto Export nicht gefunden: ' + dir);

  const stats = { placeholders: 0 };
  const files = [];
  walk(dir, files, stats);
  files.sort((a, b) => a.mtime - b.mtime);

  // Pro Datei Tageswerte bilden. Spaetere Dateien ueberschreiben fruehere fuer denselben Tag,
  // damit ueberlappende Exporte nicht doppelt zaehlen.
  const days = {}; // date -> { field: value }
  const found = new Set();
  let read = 0;

  for (const f of files) {
    let json;
    try { json = JSON.parse(fs.readFileSync(f.p, 'utf8')); } catch { continue; }
    const metrics = json?.data?.metrics;
    if (!Array.isArray(metrics)) continue;
    read++;
    for (const m of metrics) {
      const field = FIELD[norm(m.name)];
      if (!field) continue;
      found.add(norm(m.name));
      const units = String(m.units || '').toLowerCase();
      const perDay = {};
      for (const e of m.data || []) {
        const date = String(e.date || '').slice(0, 10);
        let q = num(e.qty);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || q === null) continue;
        if (field === 'kcal' && units.includes('kj')) q = q / 4.184;
        if (field === 'weight' && units.includes('lb')) q = q * 0.45359237;
        if (field === 'fat_pct' && q <= 1) q = q * 100;
        (perDay[date] ||= []).push(q);
      }
      for (const [date, vals] of Object.entries(perDay)) {
        const sum = vals.reduce((a, b) => a + b, 0);
        // Gewicht und Koerperfett: Mittel des Tages. Naehrwerte: Summe des Tages.
        const v = field === 'weight' || field === 'fat_pct' ? sum / vals.length : sum;
        (days[date] ||= {})[field] = v;
      }
    }
  }

  const r1 = (v) => Math.round(v * 10) / 10;
  const weights = [];
  const nutrition = [];
  for (const [date, d] of Object.entries(days)) {
    if (d.weight !== undefined) {
      const row = { date, kg: Math.round(d.weight * 100) / 100 };
      if (d.fat_pct !== undefined) row.fat_pct = r1(d.fat_pct);
      weights.push(row);
    }
    if (d.kcal !== undefined && d.kcal > 0) {
      nutrition.push({
        date,
        kcal: Math.round(d.kcal),
        protein: Math.round(d.protein || 0),
        carbs: Math.round(d.carbs || 0),
        fat: Math.round(d.fat || 0),
      });
    }
  }
  upsert('weights', weights);
  upsert('nutrition', nutrition);

  const lastOf = (t) => list(t).map((r) => r.date).sort().pop() || null;
  return {
    configured: true,
    dir,
    files: read,
    placeholders: stats.placeholders,
    metrics: [...found],
    lastWeight: lastOf('weights'),
    lastNutrition: lastOf('nutrition'),
  };
}

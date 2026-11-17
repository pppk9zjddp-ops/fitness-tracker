// Lokaler Datenspeicher: eine JSON-Datei im Datenordner (standardmaessig in iCloud Drive).
import fs from 'fs';
import os from 'os';
import path from 'path';

export const PK = {
  weights: 'date',       // { date, kg, fat_pct }
  nutrition: 'date',     // { date, kcal, protein, carbs, fat }
  recovery: 'date',      // { date, sleep_h, sleep_perf, rhr, hrv, recovery, strain }
  measurements: 'date',  // { date, waist, arm, chest, shoulder, thigh }
  workouts: 'id',        // { id, source, date, title, duration_min, strain, avg_hr }
  sets: 'id',            // { id, workout_id, date, exercise, template_id, muscle, set_no, type, weight, reps, rpe }
  templates: 'id',       // { id, title, muscle, secondary }
  settings: 'key',       // { key, value }
};

const ICLOUD = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');

export function dataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (fs.existsSync(ICLOUD)) return path.join(ICLOUD, 'FitnessDashboard');
  return path.join(process.cwd(), '.data');
}

export function inICloud() {
  return dataDir().startsWith(ICLOUD);
}

const file = () => path.join(dataDir(), 'db.json');

let cache = null;
let cacheMtime = 0;

function read() {
  try {
    const m = fs.statSync(file()).mtimeMs;
    if (cache && m === cacheMtime) return cache;
    cache = JSON.parse(fs.readFileSync(file(), 'utf8'));
    cacheMtime = m;
    return cache;
  } catch {
    return cache || {};
  }
}

// Erst in eine temporaere Datei schreiben, dann umbenennen: so bleibt nie eine halbe Datei zurueck.
function write(data) {
  fs.mkdirSync(dataDir(), { recursive: true });
  const tmp = file() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file());
  cache = data;
  cacheMtime = fs.statSync(file()).mtimeMs;
}

function check(table) {
  if (!PK[table]) throw new Error('Unbekannte Tabelle: ' + table);
}

export function list(table, { filters = [], order, limit } = {}) {
  check(table);
  let rows = read()[table] || [];
  for (const [col, op, val] of filters) {
    if (op === 'eq') rows = rows.filter((r) => r[col] === val);
    else if (op === 'gte') rows = rows.filter((r) => r[col] >= val);
    else if (op === 'lte') rows = rows.filter((r) => r[col] <= val);
    else throw new Error('Unbekannter Filter');
  }
  if (order) {
    const dir = order.asc === false ? -1 : 1;
    rows = [...rows].sort((a, b) => (a[order.col] > b[order.col] ? dir : a[order.col] < b[order.col] ? -dir : 0));
  }
  return limit ? rows.slice(0, limit) : rows;
}

export function upsert(table, rows) {
  check(table);
  if (!Array.isArray(rows) || !rows.length) return [];
  const pk = PK[table];
  const data = { ...read() };
  const index = new Map((data[table] || []).map((r) => [r[pk], r]));
  for (const r of rows) {
    if (r[pk] === undefined || r[pk] === null || r[pk] === '') throw new Error('Schluessel fehlt');
    index.set(r[pk], { ...(index.get(r[pk]) || {}), ...r });
  }
  data[table] = [...index.values()];
  write(data);
  return rows;
}

export function remove(table, id) {
  check(table);
  const pk = PK[table];
  const data = { ...read() };
  data[table] = (data[table] || []).filter((x) => x[pk] !== id);
  write(data);
  return true;
}

export function removeWhere(table, pred) {
  check(table);
  const data = { ...read() };
  data[table] = (data[table] || []).filter((x) => !pred(x));
  write(data);
}

export function getSetting(key, fallback = null) {
  const row = (read().settings || []).find((r) => r.key === key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  upsert('settings', [{ key, value }]);
}

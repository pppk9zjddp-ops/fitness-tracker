'use client';
import { DEFAULT_PLAN, DEFAULT_TARGETS, DEFAULT_TEMPLATES } from './plan';

async function call(body) {
  const r = await fetch('/api/data', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (r.status === 401) {
    window.dispatchEvent(new Event('aufbau-unauth'));
    throw new Error('Nicht angemeldet');
  }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Fehler');
  return j.data;
}

export const db = {
  list: (table, opts = {}) => call({ op: 'list', table, ...opts }),
  upsert: (table, rows) => call({ op: 'upsert', table, rows: Array.isArray(rows) ? rows : [rows] }),
  remove: (table, id) => call({ op: 'delete', table, id }),
};

export async function getSetting(key, fallback) {
  const rows = await db.list('settings', { filters: [['key', 'eq', key]] });
  return rows[0]?.value ?? fallback;
}
export const setSetting = (key, value) => db.upsert('settings', { key, value });

export const getPlan = () => getSetting('plan', DEFAULT_PLAN);
export const getTargets = () => getSetting('targets', DEFAULT_TARGETS);

// Vorlagen beim ersten Aufruf einmalig anlegen.
export async function getTemplates() {
  const rows = await db.list('meal_templates', { order: { col: 'sort' } });
  if (rows.length) return rows;
  const seeded = await getSetting('templates_seeded', false);
  if (seeded) return rows;
  await db.upsert('meal_templates', DEFAULT_TEMPLATES);
  await setSetting('templates_seeded', true);
  return DEFAULT_TEMPLATES;
}

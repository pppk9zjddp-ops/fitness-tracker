'use client';

async function call(body) {
  const r = await fetch('/api/data', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Fehler');
  return j.data;
}

export const db = {
  list: (table, opts = {}) => call({ op: 'list', table, ...opts }),
  upsert: (table, rows) => call({ op: 'upsert', table, rows: Array.isArray(rows) ? rows : [rows] }),
  remove: (table, id) => call({ op: 'delete', table, id }),
};

export const DEFAULT_TARGETS = { kcal: 3600, protein: 160 };

export async function getSetting(key, fallback) {
  const rows = await db.list('settings', { filters: [['key', 'eq', key]] });
  return rows[0]?.value ?? fallback;
}
export const getTargets = () => getSetting('targets', DEFAULT_TARGETS);
export const setTargets = (value) => db.upsert('settings', { key: 'targets', value });

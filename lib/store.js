// Server-seitiger Datenzugriff. Supabase, wenn konfiguriert, sonst eine lokale JSON-Datei.
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const PK = {
  weights: 'date',
  recovery: 'date',
  measurements: 'date',
  meals: 'id',
  meal_templates: 'id',
  sets: 'id',
  settings: 'key',
};

const OPS = ['eq', 'gte', 'lte'];
let client = null;

function supabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export function backend() {
  return supabase() ? 'supabase' : 'local';
}

function check(table) {
  if (!PK[table]) throw new Error('Unbekannte Tabelle: ' + table);
}

// ---- lokale Datei ----
function file() {
  return process.env.LOCAL_DATA_FILE || path.join(process.cwd(), '.data', 'local.json');
}
function readLocal() {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8'));
  } catch {
    return {};
  }
}
function writeLocal(data) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(data));
}

export async function list(table, { filters = [], order, limit } = {}) {
  check(table);
  for (const f of filters) if (!OPS.includes(f[1])) throw new Error('Unbekannter Filter');
  const sb = supabase();
  if (sb) {
    let q = sb.from(table).select('*');
    for (const [col, op, val] of filters) q = q[op](col, val);
    if (order) q = q.order(order.col, { ascending: order.asc !== false });
    q = q.limit(limit || 10000);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data;
  }
  let rows = readLocal()[table] || [];
  for (const [col, op, val] of filters) {
    rows = rows.filter((r) =>
      op === 'eq' ? r[col] === val : op === 'gte' ? r[col] >= val : r[col] <= val
    );
  }
  if (order) {
    const dir = order.asc === false ? -1 : 1;
    rows = [...rows].sort((a, b) => (a[order.col] > b[order.col] ? dir : a[order.col] < b[order.col] ? -dir : 0));
  }
  return limit ? rows.slice(0, limit) : rows;
}

export async function upsert(table, rows) {
  check(table);
  if (!Array.isArray(rows) || !rows.length) return [];
  const pk = PK[table];
  for (const r of rows) if (r[pk] === undefined || r[pk] === null || r[pk] === '') throw new Error('Schluessel fehlt');
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb.from(table).upsert(rows, { onConflict: pk }).select();
    if (error) throw new Error(error.message);
    return data;
  }
  const data = readLocal();
  const cur = data[table] || [];
  for (const r of rows) {
    const i = cur.findIndex((x) => x[pk] === r[pk]);
    if (i >= 0) cur[i] = { ...cur[i], ...r };
    else cur.push(r);
  }
  data[table] = cur;
  writeLocal(data);
  return rows;
}

export async function remove(table, id) {
  check(table);
  const pk = PK[table];
  const sb = supabase();
  if (sb) {
    const { error } = await sb.from(table).delete().eq(pk, id);
    if (error) throw new Error(error.message);
    return true;
  }
  const data = readLocal();
  data[table] = (data[table] || []).filter((x) => x[pk] !== id);
  writeLocal(data);
  return true;
}

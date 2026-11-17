// Whoop: offizielle API v2 mit OAuth. Liefert Schlaf, Recovery, Ruhepuls, HRV, Tages-Strain und Workouts.
import { getSetting, setSetting, upsert, list } from '../store';
import { localDate } from './time';

const API = () => process.env.WHOOP_BASE || 'https://api.prod.whoop.com';
export const REDIRECT = 'http://localhost:3210/api/whoop/callback';
export const SCOPES = 'offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement';

const cfg = () => getSetting('config', {});
const saveCfg = (patch) => setSetting('config', { ...cfg(), ...patch });

export function authUrl(state) {
  const q = new URLSearchParams({
    client_id: cfg().whoopClientId || '',
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPES,
    state,
  });
  return `${API()}/oauth/oauth2/auth?${q}`;
}

async function token(params) {
  const c = cfg();
  const body = new URLSearchParams({ client_id: c.whoopClientId, client_secret: c.whoopClientSecret, ...params });
  const r = await fetch(`${API()}/oauth/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Whoop-Anmeldung fehlgeschlagen. Bitte in den Einstellungen neu verbinden.');
  // Refresh-Tokens rotieren: das neue sofort speichern, sonst bricht der naechste Abruf.
  saveCfg({
    whoopTokens: {
      access: j.access_token,
      refresh: j.refresh_token || c.whoopTokens?.refresh,
      expires: Date.now() + (j.expires_in || 3600) * 1000,
    },
  });
  return j.access_token;
}

export const exchangeCode = (code) => token({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT });

async function accessToken() {
  const t = cfg().whoopTokens;
  if (!t?.refresh) return null;
  if (t.access && t.expires > Date.now() + 60000) return t.access;
  return token({ grant_type: 'refresh_token', refresh_token: t.refresh, scope: 'offline' });
}

async function collect(pathname, access, start) {
  const out = [];
  let next = null;
  for (let i = 0; i < 60; i++) {
    const q = new URLSearchParams({ limit: '25', start });
    if (next) q.set('nextToken', next);
    const r = await fetch(`${API()}/developer/v2${pathname}?${q}`, { headers: { authorization: `Bearer ${access}` } });
    if (r.status === 429) throw new Error('Whoop-Limit erreicht. Später erneut versuchen.');
    if (!r.ok) throw new Error(`Whoop antwortet mit Fehler ${r.status}`);
    const j = await r.json();
    out.push(...(j.records || []));
    next = j.next_token;
    if (!next) break;
  }
  return out;
}

export async function syncWhoop() {
  const c = cfg();
  if (!c.whoopClientId || !c.whoopTokens?.refresh) return { configured: false };
  const access = await accessToken();

  const have = list('recovery').some((r) => r.recovery != null);
  const start = new Date(Date.now() - (have ? 21 : 200) * 86400000).toISOString();

  const [sleeps, recoveries, cycles, workouts] = [
    await collect('/activity/sleep', access, start),
    await collect('/recovery', access, start),
    await collect('/cycle', access, start),
    await collect('/activity/workout', access, start),
  ];

  const days = {};
  const day = (d) => (days[d] ||= { date: d });
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

  // Schlaf zaehlt zu dem Tag, an dem man aufwacht.
  const sleepDate = {};
  for (const s of sleeps) {
    if (s.nap || s.score_state !== 'SCORED' || !s.score) continue;
    const date = localDate(s.end, s.timezone_offset);
    sleepDate[s.id] = date;
    const st = s.score.stage_summary || {};
    const asleep = (st.total_in_bed_time_milli || 0) - (st.total_awake_time_milli || 0);
    Object.assign(day(date), { sleep_h: r1(asleep / 3600000), sleep_perf: r1(s.score.sleep_performance_percentage) });
  }
  const cycleDate = {};
  for (const c2 of cycles) {
    const date = localDate(c2.start, c2.timezone_offset);
    cycleDate[c2.id] = date;
    if (c2.score_state === 'SCORED' && c2.score) day(date).strain = r1(c2.score.strain);
  }
  for (const r of recoveries) {
    if (r.score_state !== 'SCORED' || !r.score) continue;
    const date = sleepDate[r.sleep_id] || cycleDate[r.cycle_id];
    if (!date) continue;
    Object.assign(day(date), {
      recovery: r1(r.score.recovery_score),
      rhr: r1(r.score.resting_heart_rate),
      hrv: r1(r.score.hrv_rmssd_milli),
    });
  }
  upsert('recovery', Object.values(days));

  upsert('workouts', workouts.filter((w) => w.score_state === 'SCORED').map((w) => ({
    id: `whoop|${w.id}`,
    source: 'whoop',
    date: localDate(w.start, w.timezone_offset),
    title: w.sport_name || 'Workout',
    duration_min: Math.round((new Date(w.end) - new Date(w.start)) / 60000),
    strain: r1(w.score?.strain),
    avg_hr: w.score?.average_heart_rate ?? null,
  })));

  const last = list('recovery').filter((r) => r.recovery != null).map((r) => r.date).sort().pop() || null;
  return { configured: true, days: Object.keys(days).length, last };
}

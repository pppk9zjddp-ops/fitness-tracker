// Hevy: Workouts mit Saetzen, Uebungsvorlagen (Muskelgruppen) und Routinen (Wiederholungsbereiche).
import { getSetting, setSetting, upsert, removeWhere, list } from '../store';
import { localDate } from './time';

const BASE = () => process.env.HEVY_BASE || 'https://api.hevyapp.com';

async function get(pathname, key) {
  const r = await fetch(BASE() + pathname, { headers: { 'api-key': key, accept: 'application/json' } });
  if (r.status === 401 || r.status === 403) throw new Error('Hevy lehnt den API-Key ab. Key prüfen und Hevy Pro aktiv?');
  if (!r.ok) throw new Error(`Hevy antwortet mit Fehler ${r.status}`);
  return r.json();
}

async function syncTemplates(key) {
  const state = getSetting('hevy_templates_at', 0);
  if (Date.now() - state < 7 * 86400000 && list('templates').length) return;
  const rows = [];
  for (let page = 1; page <= 50; page++) {
    const j = await get(`/v1/exercise_templates?page=${page}&pageSize=100`, key);
    for (const t of j.exercise_templates || []) {
      rows.push({ id: t.id, title: t.title, muscle: t.primary_muscle_group || 'other', secondary: t.secondary_muscle_groups || [] });
    }
    if (page >= (j.page_count || 1)) break;
  }
  upsert('templates', rows);
  setSetting('hevy_templates_at', Date.now());
}

// Wiederholungsbereiche aus den Routinen: Grundlage fuer den Progressionshinweis.
async function syncRoutines(key) {
  const ranges = {};
  for (let page = 1; page <= 20; page++) {
    const j = await get(`/v1/routines?page=${page}&pageSize=10`, key);
    for (const r of j.routines || []) {
      for (const ex of r.exercises || []) {
        const sets = (ex.sets || []).filter((s) => s.type !== 'warmup');
        const withRange = sets.filter((s) => s.rep_range && s.rep_range.end);
        if (!withRange.length) continue;
        ranges[ex.exercise_template_id] = {
          min: Math.min(...withRange.map((s) => s.rep_range.start || s.rep_range.end)),
          max: Math.max(...withRange.map((s) => s.rep_range.end)),
          sets: sets.length,
          routine: r.title,
        };
      }
    }
    if (page >= (j.page_count || 1)) break;
  }
  setSetting('hevy_ranges', ranges);
}

export async function syncHevy() {
  const key = getSetting('config', {}).hevyKey;
  if (!key) return { configured: false };

  await syncTemplates(key);
  await syncRoutines(key).catch(() => {});

  const muscleOf = new Map(list('templates').map((t) => [t.id, t.muscle]));
  const known = new Map(list('workouts').filter((w) => w.source === 'hevy').map((w) => [w.id, w.updated_at]));
  let changed = 0;

  for (let page = 1; page <= 500; page++) {
    const j = await get(`/v1/workouts?page=${page}&pageSize=10`, key);
    const workouts = j.workouts || [];
    let fresh = 0;
    for (const w of workouts) {
      const id = `hevy|${w.id}`;
      if (known.get(id) === w.updated_at) continue;
      fresh++;
      const date = localDate(w.start_time);
      const duration = w.end_time ? Math.round((new Date(w.end_time) - new Date(w.start_time)) / 60000) : null;
      const sets = [];
      (w.exercises || []).forEach((ex, ei) => {
        (ex.sets || []).forEach((s, si) => {
          sets.push({
            id: `${id}|${ei}|${si}`,
            workout_id: id,
            date,
            exercise: ex.title,
            template_id: ex.exercise_template_id,
            muscle: muscleOf.get(ex.exercise_template_id) || 'other',
            set_no: si + 1,
            type: s.type || 'normal',
            weight: s.weight_kg ?? null,
            reps: s.reps ?? null,
            rpe: s.rpe ?? null,
          });
        });
      });
      removeWhere('sets', (s) => s.workout_id === id);
      upsert('sets', sets);
      upsert('workouts', [{ id, source: 'hevy', date, title: w.title, duration_min: duration, updated_at: w.updated_at }]);
      changed++;
    }
    // Workouts kommen neueste zuerst. Eine Seite ohne Neues heisst: der Rest ist bekannt.
    if (!workouts.length || fresh === 0 || page >= (j.page_count || 1)) break;
  }

  const last = list('workouts').filter((w) => w.source === 'hevy').map((w) => w.date).sort().pop() || null;
  return { configured: true, changed, last };
}

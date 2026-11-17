export const iso = (d = new Date()) => {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
};

export const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const parseNum = (s) => {
  if (s === '' || s === null || s === undefined) return null;
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export const fmt = (n, digits = 1) =>
  n === null || n === undefined || Number.isNaN(n)
    ? '–'
    : Number(n).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const fmtDate = (dateStr) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

export const mean = (arr) => {
  const v = arr.filter((x) => x !== null && x !== undefined && !Number.isNaN(Number(x))).map(Number);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

// Mittel eines Feldes ueber ein Datumsfenster [from, to], inklusive.
export const windowMean = (rows, field, from, to) => {
  const v = rows.filter((r) => r.date >= from && r.date <= to).map((r) => r[field]);
  return { mean: mean(v), n: v.filter((x) => x !== null && x !== undefined).length };
};

// Kalorienregel aus dem Plan: Mittel der letzten 7 Tage gegen die 7 Tage davor.
export function weightTrend(weights, today = iso()) {
  const cur = windowMean(weights, 'kg', addDays(today, -6), today);
  const prev = windowMean(weights, 'kg', addDays(today, -13), addDays(today, -7));
  if (cur.n < 4 || prev.n < 4) {
    return { cur: cur.mean, prev: prev.mean, rate: null, level: 'info', text: 'Noch zu wenig Messungen für den Trend (mindestens 4 pro Woche).' };
  }
  const rate = cur.mean - prev.mean;
  if (rate < 0.15) return { cur: cur.mean, prev: prev.mean, rate, level: 'warn', text: 'Unter 0,15 kg pro Woche: 200-250 kcal mehr essen.' };
  if (rate > 0.5) return { cur: cur.mean, prev: prev.mean, rate, level: 'warn', text: 'Über 0,5 kg pro Woche: 150-200 kcal weniger essen.' };
  return { cur: cur.mean, prev: prev.mean, rate, level: 'ok', text: 'Im Zielbereich: Kalorien so lassen.' };
}

// Warnsignal aus dem Plan: Ruhepuls deutlich ueber, HRV deutlich unter dem 4-Wochen-Mittel.
export function recoverySignal(rows, today = iso()) {
  const base = {
    rhr: windowMean(rows, 'rhr', addDays(today, -30), addDays(today, -3)),
    hrv: windowMean(rows, 'hrv', addDays(today, -30), addDays(today, -3)),
  };
  const last = {
    rhr: windowMean(rows, 'rhr', addDays(today, -2), today),
    hrv: windowMean(rows, 'hrv', addDays(today, -2), today),
  };
  if (base.rhr.n < 7 || last.rhr.n < 2) return { level: 'info', text: 'Noch zu wenig Daten für das Warnsignal.', base, last };
  const rhrUp = last.rhr.mean - base.rhr.mean >= 5;
  const hrvDown = base.hrv.mean && last.hrv.mean !== null ? last.hrv.mean < base.hrv.mean * 0.85 : false;
  if (rhrUp && hrvDown) {
    return { level: 'warn', text: 'Ruhepuls erhöht und HRV niedrig. Fühlst du dich zusätzlich schwach oder krank: Volumen halbieren oder pausieren.', base, last };
  }
  return { level: 'ok', text: 'Kein Warnsignal. Nach Plan trainieren.', base, last };
}

export const e1rm = (weight, reps) => (weight && reps ? weight * (1 + reps / 30) : null);

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);

// ---- Training ----
export const weekStart = (d) => {
  const day = new Date(d + 'T12:00:00').getDay();
  return addDays(d, -((day + 6) % 7));
};

// Muskelgruppen aus Hevy, zusammengefasst, mit den direkten Wochensaetzen aus dem Plan als Ziel.
export const GROUPS = [
  { key: 'chest', label: 'Brust', target: 14, m: ['chest'] },
  { key: 'back', label: 'Rücken', target: 13, m: ['lats', 'upper_back'] },
  { key: 'shoulders', label: 'Schultern', target: 13, m: ['shoulders'] },
  { key: 'biceps', label: 'Bizeps', target: 9, m: ['biceps'] },
  { key: 'triceps', label: 'Trizeps', target: 9, m: ['triceps'] },
  { key: 'quads', label: 'Quadrizeps', target: 13, m: ['quadriceps'] },
  { key: 'hams', label: 'Beinbeuger', target: 9, m: ['hamstrings'] },
  { key: 'glutes', label: 'Gesäß', target: 3, m: ['glutes'] },
  { key: 'calves', label: 'Waden', target: 6, m: ['calves'] },
  { key: 'abs', label: 'Bauch', target: 5, m: ['abdominals'] },
];

export const working = (s) => s.type !== 'warmup' && s.reps != null && Number(s.reps) > 0;

// Direkte Arbeitssaetze je Muskelgruppe in der Woche ab `start`.
export function weekVolume(sets, start) {
  const end = addDays(start, 6);
  const count = {};
  for (const s of sets) {
    if (s.date < start || s.date > end || !working(s)) continue;
    count[s.muscle] = (count[s.muscle] || 0) + 1;
  }
  return GROUPS.map((g) => ({ ...g, sets: g.m.reduce((a, m) => a + (count[m] || 0), 0) }));
}

// Einheiten einer Uebung, aelteste zuerst, je mit bestem geschaetzten 1RM.
export function exerciseSessions(sets, exercise) {
  const g = {};
  for (const s of sets) {
    if (s.exercise === exercise && working(s) && s.weight != null) (g[s.date] ||= []).push(s);
  }
  return Object.keys(g).sort().map((d) => {
    const l = g[d].sort((a, b) => a.set_no - b.set_no);
    return { date: d, list: l, best: Math.max(...l.map((s) => e1rm(Number(s.weight), Number(s.reps)))) };
  });
}

// Progressionshinweis nach Doppelprogression. `range` kommt aus der Hevy-Routine, falls dort hinterlegt.
export function progression(sessions, range) {
  if (!sessions.length) return { level: 'info', text: 'Noch keine Daten.' };
  const last = sessions[sessions.length - 1];
  if (range && last.list.length >= Math.min(range.sets || 1, last.list.length) && last.list.every((s) => Number(s.reps) >= range.max)) {
    return { level: 'ok', text: `Alle Sätze bei ${range.max}+ Wdh.: nächstes Mal Gewicht erhöhen.` };
  }
  if (sessions.length >= 4) {
    const recent = sessions.slice(-3).map((s) => s.best);
    const before = Math.max(...sessions.slice(0, -3).slice(-3).map((s) => s.best));
    if (Math.max(...recent) <= before * 1.005) {
      return { level: 'warn', text: 'Seit 3 Einheiten kein Fortschritt: Gewichtstrend und Schlaf prüfen, sonst 1-2 Sätze ergänzen.' };
    }
  }
  if (sessions.length >= 2 && last.best > sessions[sessions.length - 2].best) {
    return { level: 'ok', text: 'Zuletzt gesteigert. Weiter so: gleiches Gewicht, mehr Wiederholungen.' };
  }
  return { level: 'info', text: 'Gleiches Gewicht, Ziel: mehr Wiederholungen als letztes Mal.' };
}

export const ago = (ms) => {
  if (!ms) return 'nie';
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `vor ${h} h`;
  return `vor ${Math.round(h / 24)} Tagen`;
};

// Zustand der Datenquellen fuer die Hinweise auf der Uebersicht.
export function sourceNotes(status, today = iso()) {
  const out = [];
  const old = (d, days) => !d || d < addDays(today, -days);
  const src = [
    ['hevy', 'Hevy (Training)', null],
    ['health', 'Apple Health (Gewicht, Ernährung)', (s) => (old(s.lastNutrition, 2) ? 'Keine Ernährungsdaten aus den letzten 2 Tagen.' : null)],
    ['whoop', 'Whoop (Schlaf, Erholung)', (s) => (old(s.last, 2) ? 'Keine Whoop-Daten aus den letzten 2 Tagen.' : null)],
  ];
  for (const [key, label, staleFn] of src) {
    const s = status?.[key];
    if (!s || s.configured === false) { out.push({ level: 'info', text: `${label}: noch nicht verbunden.`, setup: true }); continue; }
    if (s.ok === false) { out.push({ level: 'bad', text: `${label}: ${s.error}` }); continue; }
    if (s.at && Date.now() - s.at > 48 * 3600000) { out.push({ level: 'warn', text: `${label}: seit über 48 Stunden nicht aktualisiert.` }); continue; }
    const stale = staleFn && staleFn(s);
    if (stale) out.push({ level: 'warn', text: `${label}: ${stale}` });
  }
  return out;
}

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

// Tagessummen. Gibt es eine Apple-Health-Tagessumme, zaehlt nur sie (sonst wuerde doppelt gezaehlt).
export function dayTotals(meals) {
  const health = meals.find((m) => m.source === 'health');
  const rows = health ? [health] : meals;
  const sum = (f) => rows.reduce((a, m) => a + Number(m[f] || 0), 0);
  return { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), health: !!health && meals.length > 1 };
}

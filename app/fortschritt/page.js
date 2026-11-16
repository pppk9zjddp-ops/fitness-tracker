'use client';
import { useEffect, useMemo, useState } from 'react';
import Num from '@/components/Num';
import LineChart from '@/components/LineChart';
import { db, getPlan } from '@/lib/api';
import { addDays, e1rm, fmt, fmtDate, iso, mean, weightTrend } from '@/lib/util';

const MEASURES = [
  ['waist', 'Taille'],
  ['arm', 'Oberarm'],
  ['chest', 'Brust'],
  ['shoulder', 'Schulter'],
  ['thigh', 'Oberschenkel'],
];

const weekStart = (d) => {
  const day = new Date(d + 'T12:00:00').getDay();
  return addDays(d, -((day + 6) % 7));
};

export default function Fortschritt() {
  const today = iso();
  const [weights, setWeights] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [sets, setSets] = useState([]);
  const [plan, setPlan] = useState([]);
  const [exercise, setExercise] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [w, m, s, p] = await Promise.all([
        db.list('weights', { order: { col: 'date' } }),
        db.list('measurements', { order: { col: 'date' } }),
        db.list('sets', { order: { col: 'date' } }),
        getPlan(),
      ]);
      setWeights(w); setMeasures(m); setSets(s); setPlan(p);
      setExercise(p[0]?.exercises[0]?.name || s[0]?.exercise || '');
      setReady(true);
    })().catch(() => {});
  }, []);

  const trend = weightTrend(weights, today);

  const recent = weights.filter((w) => w.date >= addDays(today, -90));
  const rolling = recent.map((w) => ({
    date: w.date,
    y: mean(weights.filter((x) => x.date <= w.date && x.date >= addDays(w.date, -6)).map((x) => x.kg)),
  }));

  const weeks = useMemo(() => {
    const g = {};
    for (const w of weights) (g[weekStart(w.date)] ||= []).push(Number(w.kg));
    const keys = Object.keys(g).sort();
    return keys.map((k, i) => ({
      start: k,
      mean: mean(g[k]),
      n: g[k].length,
      delta: i > 0 && keys[i - 1] === addDays(k, -7) ? mean(g[k]) - mean(g[keys[i - 1]]) : null,
    })).slice(-8).reverse();
  }, [weights]);

  const names = useMemo(() => {
    const s = new Set(plan.flatMap((d) => d.exercises.map((e) => e.name)));
    sets.forEach((x) => s.add(x.exercise));
    return [...s];
  }, [plan, sets]);

  const sessions = useMemo(() => {
    const g = {};
    for (const s of sets) if (s.exercise === exercise && s.weight != null && s.reps != null) (g[s.date] ||= []).push(s);
    return Object.keys(g).sort().map((d) => {
      const list = g[d].sort((a, b) => a.set_no - b.set_no);
      return { date: d, list, best: Math.max(...list.map((s) => e1rm(Number(s.weight), Number(s.reps)))) };
    });
  }, [sets, exercise]);

  const mToday = measures.find((m) => m.date === today);
  const saveMeasure = async (field, v) => {
    const row = { date: today, waist: null, arm: null, chest: null, shoulder: null, thigh: null, ...(mToday || {}), [field]: v };
    setMeasures([...measures.filter((m) => m.date !== today), row].sort((a, b) => (a.date > b.date ? 1 : -1)));
    await db.upsert('measurements', row);
  };

  if (!ready) return null;

  return (
    <>
      <div className="head"><h1>Fortschritt</h1></div>

      <div className="card">
        <div className="row between">
          <h2>Gewicht</h2>
          <span className="sub">{trend.rate !== null ? `${trend.rate >= 0 ? '+' : ''}${fmt(trend.rate, 2)} kg/Woche` : ''}</span>
        </div>
        <LineChart
          digits={1}
          series={[
            { name: 'Tageswert', color: '#5f6b75', dotsOnly: true, points: recent.map((w) => ({ date: w.date, y: Number(w.kg) })) },
            { name: '7-Tage-Mittel', color: '#86e08f', width: 2.5, points: rolling },
          ]}
        />
        <div className={`note ${trend.level === 'ok' ? 'ok' : trend.level === 'warn' ? 'warn' : ''}`} style={{ marginTop: 10 }}>{trend.text}</div>
        {!!weeks.length && (
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Woche ab</th><th className="right">Mittel</th><th className="right">Änderung</th><th className="right">Messungen</th></tr></thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start}>
                  <td>{fmtDate(w.start)}</td>
                  <td className="right">{fmt(w.mean, 2)} kg</td>
                  <td className="right">{w.delta === null ? '–' : `${w.delta >= 0 ? '+' : ''}${fmt(w.delta, 2)} kg`}</td>
                  <td className="right">{w.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="row between">
          <h2>Kraft</h2>
          <select value={exercise} onChange={(e) => setExercise(e.target.value)} style={{ maxWidth: 260 }}>
            {names.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <p className="sub" style={{ marginBottom: 6 }}>Geschätztes Maximum (1RM) aus dem besten Satz je Einheit</p>
        <LineChart series={[{ name: 'e1RM', color: '#6fb1f5', dots: true, points: sessions.map((s) => ({ date: s.date, y: s.best })) }]} />
        {!!sessions.length && (
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Datum</th><th>Sätze</th><th className="right">e1RM</th></tr></thead>
            <tbody>
              {sessions.slice(-6).reverse().map((s) => (
                <tr key={s.date}>
                  <td>{fmtDate(s.date)}</td>
                  <td>{s.list.map((x) => `${fmt(x.weight, 2)}×${fmt(x.reps, 0)}`).join('  ')}</td>
                  <td className="right">{fmt(s.best, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Umfänge (cm)</h2>
        <p className="sub" style={{ marginBottom: 8 }}>Alle 4 Wochen messen, morgens, immer an derselben Stelle.</p>
        <div className="grid5">
          {MEASURES.map(([f, label]) => (
            <Num key={f} label={label} value={mToday?.[f] ?? null} onCommit={(v) => saveMeasure(f, v)} />
          ))}
        </div>
        {!!measures.length && (
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Datum</th>{MEASURES.map(([f, l]) => <th key={f} className="right">{l}</th>)}</tr></thead>
            <tbody>
              {[...measures].reverse().slice(0, 6).map((m) => (
                <tr key={m.date}>
                  <td>{fmtDate(m.date)}</td>
                  {MEASURES.map(([f]) => <td key={f} className="right">{fmt(m[f], 1)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

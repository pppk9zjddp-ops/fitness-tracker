'use client';
import { useEffect, useMemo, useState } from 'react';
import Num from '@/components/Num';
import LineChart from '@/components/LineChart';
import { useSync } from '@/components/Shell';
import { db } from '@/lib/api';
import { addDays, fmt, fmtDate, iso, mean, weekStart, weightTrend } from '@/lib/util';

const MEASURES = [
  ['waist', 'Taille'],
  ['arm', 'Oberarm'],
  ['chest', 'Brust'],
  ['shoulder', 'Schulter'],
  ['thigh', 'Oberschenkel'],
];

export default function Koerper() {
  const today = iso();
  const { version } = useSync();
  const [weights, setWeights] = useState(null);
  const [measures, setMeasures] = useState([]);

  useEffect(() => {
    Promise.all([db.list('weights', { order: { col: 'date' } }), db.list('measurements', { order: { col: 'date' } })])
      .then(([w, m]) => { setWeights(w); setMeasures(m); })
      .catch(() => {});
  }, [version]);

  const weeks = useMemo(() => {
    const g = {};
    for (const w of weights || []) (g[weekStart(w.date)] ||= []).push(Number(w.kg));
    const keys = Object.keys(g).sort();
    return keys.map((k, i) => ({
      start: k, mean: mean(g[k]), n: g[k].length,
      delta: i > 0 && keys[i - 1] === addDays(k, -7) ? mean(g[k]) - mean(g[keys[i - 1]]) : null,
    })).slice(-10).reverse();
  }, [weights]);

  if (!weights) return null;

  const trend = weightTrend(weights, today);
  const recent = weights.filter((w) => w.date >= addDays(today, -120));
  const rolling = recent.map((w) => ({
    date: w.date,
    y: mean(weights.filter((x) => x.date <= w.date && x.date >= addDays(w.date, -6)).map((x) => x.kg)),
  }));
  const todayW = weights.find((w) => w.date === today)?.kg ?? null;
  const mToday = measures.find((m) => m.date === today);

  const saveWeight = async (kg) => {
    const rest = weights.filter((w) => w.date !== today);
    if (kg === null) { setWeights(rest); await db.remove('weights', today); return; }
    setWeights([...rest, { date: today, kg }].sort((a, b) => (a.date > b.date ? 1 : -1)));
    await db.upsert('weights', { date: today, kg });
  };

  const saveMeasure = async (field, v) => {
    const row = { date: today, waist: null, arm: null, chest: null, shoulder: null, thigh: null, ...(mToday || {}), [field]: v };
    setMeasures([...measures.filter((m) => m.date !== today), row].sort((a, b) => (a.date > b.date ? 1 : -1)));
    await db.upsert('measurements', row);
  };

  return (
    <>
      <div className="head">
        <div>
          <h1>Körper</h1>
          <p className="sub">Gewicht aus Renpho über Apple Health · Umfänge von Hand</p>
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h2>Gewicht</h2>
          <span className="sub">7-Tage-Mittel {fmt(trend.cur, 2)} kg{trend.rate !== null ? ` · ${trend.rate >= 0 ? '+' : ''}${fmt(trend.rate, 2)} kg pro Woche` : ''}</span>
        </div>
        <LineChart series={[
          { name: 'Tageswert', color: '#5f6b75', dotsOnly: true, points: recent.map((w) => ({ date: w.date, y: Number(w.kg) })) },
          { name: '7-Tage-Mittel', color: '#86e08f', width: 2.5, points: rolling },
        ]} />
        <div className={`note ${trend.level === 'ok' ? 'ok' : trend.level === 'warn' ? 'warn' : ''}`} style={{ marginTop: 10 }}>{trend.text}</div>
        <div className="row" style={{ marginTop: 10 }}>
          <span className="sub">Heute von Hand nachtragen (falls die Waage nicht synchronisiert):</span>
          <div style={{ width: 110 }}><Num value={todayW} onCommit={saveWeight} placeholder="kg" /></div>
        </div>
      </div>

      {!!weeks.length && (
        <div className="card">
          <h2>Wochenmittel</h2>
          <table>
            <thead><tr><th>Woche ab</th><th className="right">Mittel</th><th className="right">Änderung</th><th className="right">Messungen</th></tr></thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start}>
                  <td>{fmtDate(w.start)}</td>
                  <td className="right">{fmt(w.mean, 2)} kg</td>
                  <td className={`right ${w.delta == null ? '' : w.delta >= 0.15 && w.delta <= 0.5 ? 'pos' : 'neg'}`}>{w.delta === null ? '–' : `${w.delta >= 0 ? '+' : ''}${fmt(w.delta, 2)} kg`}</td>
                  <td className="right">{w.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>Umfänge (cm)</h2>
        <p className="sub" style={{ marginBottom: 8 }}>Alle 4 Wochen messen, morgens, immer an derselben Stelle. Die Taille zeigt Fettzunahme, die übrigen Maße Muskelzuwachs.</p>
        <div className="grid5">
          {MEASURES.map(([f, label]) => (
            <Num key={f} label={label} value={mToday?.[f] ?? null} onCommit={(v) => saveMeasure(f, v)} />
          ))}
        </div>
        {!!measures.length && (
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Datum</th>{MEASURES.map(([f, l]) => <th key={f} className="right">{l}</th>)}</tr></thead>
            <tbody>
              {[...measures].reverse().slice(0, 8).map((m) => (
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

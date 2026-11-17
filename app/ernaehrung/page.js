'use client';
import { useEffect, useState } from 'react';
import LineChart from '@/components/LineChart';
import { useSync } from '@/components/Shell';
import { db, getTargets, DEFAULT_TARGETS } from '@/lib/api';
import { addDays, fmt, fmtDate, iso, mean } from '@/lib/util';

export default function Ernaehrung() {
  const today = iso();
  const { version } = useSync();
  const [rows, setRows] = useState(null);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);

  useEffect(() => {
    Promise.all([db.list('nutrition', { order: { col: 'date' } }), getTargets()])
      .then(([n, t]) => { setRows(n); setTargets(t || DEFAULT_TARGETS); })
      .catch(() => {});
  }, [version]);

  if (!rows) return null;

  if (!rows.length) {
    return (
      <>
        <div className="head"><h1>Ernährung</h1></div>
        <div className="card"><p className="muted">Noch keine Ernährungsdaten. Sie kommen aus MyFitnessPal über Apple Health und Health Auto Export, die Schritte stehen in den Einstellungen.</p></div>
      </>
    );
  }

  // Heute ist noch nicht vollstaendig und zaehlt nicht in die Mittelwerte.
  const full = rows.filter((r) => r.date < today);
  const win = (days) => full.filter((r) => r.date >= addDays(today, -days));
  const w7 = win(7), w28 = win(28);
  const recent = rows.filter((r) => r.date >= addDays(today, -42));
  const first = recent[0]?.date, last = recent[recent.length - 1]?.date;
  const hit = w7.filter((r) => r.kcal >= targets.kcal * 0.95).length;

  return (
    <>
      <div className="head">
        <div>
          <h1>Ernährung</h1>
          <p className="sub">Aus MyFitnessPal über Apple Health · Ziel {fmt(targets.kcal, 0)} kcal und {fmt(targets.protein, 0)} g Protein</p>
        </div>
      </div>

      <div className="tiles" style={{ marginBottom: 12 }}>
        <div className="card">
          <h2>Kalorien</h2>
          <div className="row" style={{ alignItems: 'baseline' }}><span className="big">{fmt(mean(w7.map((r) => r.kcal)), 0)}</span><span className="sub">kcal im 7-Tage-Mittel</span></div>
          <div className="bar" style={{ margin: '6px 0 8px' }}><i style={{ width: `${Math.min(100, ((mean(w7.map((r) => r.kcal)) || 0) / targets.kcal) * 100)}%` }} /></div>
          <div className="kv"><span>28-Tage-Mittel</span><span>{fmt(mean(w28.map((r) => r.kcal)), 0)} kcal</span></div>
          <div className="kv"><span>Tage am Ziel (mind. 95 %)</span><span>{hit} von {w7.length}</span></div>
          <div className="kv"><span>Tage mit Daten</span><span>{w7.length} von 7</span></div>
        </div>
        <div className="card">
          <h2>Protein</h2>
          <div className="row" style={{ alignItems: 'baseline' }}><span className="big">{fmt(mean(w7.map((r) => r.protein)), 0)}</span><span className="sub">g im 7-Tage-Mittel</span></div>
          <div className="bar blue" style={{ margin: '6px 0 8px' }}><i style={{ width: `${Math.min(100, ((mean(w7.map((r) => r.protein)) || 0) / targets.protein) * 100)}%` }} /></div>
          <div className="kv"><span>28-Tage-Mittel</span><span>{fmt(mean(w28.map((r) => r.protein)), 0)} g</span></div>
          <div className="kv"><span>Kohlenhydrate (7 Tage)</span><span>{fmt(mean(w7.map((r) => r.carbs)), 0)} g</span></div>
          <div className="kv"><span>Fett (7 Tage)</span><span>{fmt(mean(w7.map((r) => r.fat)), 0)} g</span></div>
        </div>
      </div>

      <div className="card">
        <h2>Kalorien pro Tag</h2>
        <LineChart digits={0} series={[
          { name: 'Kalorien', color: '#86e08f', dots: true, points: recent.map((r) => ({ date: r.date, y: Number(r.kcal) })) },
          { name: 'Ziel', color: '#8a949d', width: 1.5, points: first === last ? [] : [{ date: first, y: targets.kcal }, { date: last, y: targets.kcal }] },
        ]} />
      </div>

      <div className="card">
        <h2>Letzte 14 Tage</h2>
        <table>
          <thead><tr><th>Datum</th><th className="right">kcal</th><th className="right">zum Ziel</th><th className="right">Protein</th><th className="right">Kohlenh.</th><th className="right">Fett</th></tr></thead>
          <tbody>
            {[...rows].reverse().slice(0, 14).map((r) => {
              const diff = r.kcal - targets.kcal;
              return (
                <tr key={r.date}>
                  <td>{fmtDate(r.date)}{r.date === today ? ' (läuft)' : ''}</td>
                  <td className="right">{fmt(r.kcal, 0)}</td>
                  <td className={`right ${r.date === today ? 'muted' : diff >= -targets.kcal * 0.05 ? 'pos' : 'neg'}`}>{diff >= 0 ? '+' : ''}{fmt(diff, 0)}</td>
                  <td className={`right ${r.protein >= targets.protein || r.date === today ? '' : 'neg'}`}>{fmt(r.protein, 0)} g</td>
                  <td className="right">{fmt(r.carbs, 0)} g</td>
                  <td className="right">{fmt(r.fat, 0)} g</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

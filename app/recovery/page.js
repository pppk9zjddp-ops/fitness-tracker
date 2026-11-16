'use client';
import { useEffect, useState } from 'react';
import DateNav from '@/components/DateNav';
import RecoveryForm from '@/components/RecoveryForm';
import LineChart from '@/components/LineChart';
import { db } from '@/lib/api';
import { addDays, fmt, fmtDate, iso, recoverySignal, windowMean } from '@/lib/util';

const COLS = [
  ['sleep_h', 'Schlaf (h)', 1],
  ['rhr', 'Ruhepuls', 0],
  ['hrv', 'HRV (ms)', 0],
  ['recovery', 'Recovery %', 0],
];

export default function Recovery() {
  const today = iso();
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    db.list('recovery', { order: { col: 'date' } }).then((r) => { setRows(r); setReady(true); }).catch(() => {});
  }, []);

  if (!ready) return null;

  const signal = recoverySignal(rows, today);
  const recent = rows.filter((r) => r.date >= addDays(today, -60));
  const pts = (f) => recent.filter((r) => r[f] != null).map((r) => ({ date: r.date, y: Number(r[f]) }));

  return (
    <>
      <div className="head">
        <div>
          <h1>Recovery</h1>
          <p className="sub">Morgens die Werte aus der Whoop-App eintragen</p>
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      <div className="card">
        <RecoveryForm
          date={date}
          row={rows.find((r) => r.date === date)}
          onSaved={(row) => setRows([...rows.filter((r) => r.date !== row.date), row].sort((a, b) => (a.date > b.date ? 1 : -1)))}
        />
        <div className={`note ${signal.level === 'warn' ? 'warn' : signal.level === 'ok' ? 'ok' : ''}`} style={{ marginTop: 10 }}>{signal.text}</div>
      </div>

      <div className="card">
        <h2>Mittelwerte</h2>
        <table>
          <thead><tr><th /><th className="right">7 Tage</th><th className="right">28 Tage</th></tr></thead>
          <tbody>
            {COLS.map(([f, label, d]) => (
              <tr key={f}>
                <td>{label}</td>
                <td className="right">{fmt(windowMean(rows, f, addDays(today, -6), today).mean, d)}</td>
                <td className="right">{fmt(windowMean(rows, f, addDays(today, -27), today).mean, d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Ruhepuls und HRV</h2>
        <LineChart digits={0} series={[
          { name: 'HRV (ms)', color: '#86e08f', points: pts('hrv') },
          { name: 'Ruhepuls', color: '#f3b950', points: pts('rhr') },
        ]} />
      </div>

      <div className="card">
        <h2>Schlaf (h)</h2>
        <LineChart digits={1} series={[{ name: 'Schlaf', color: '#6fb1f5', dots: true, points: pts('sleep_h') }]} />
      </div>

      <div className="card">
        <h2>Letzte 14 Tage</h2>
        <table>
          <thead><tr><th>Datum</th>{COLS.map(([f, l]) => <th key={f} className="right">{l}</th>)}</tr></thead>
          <tbody>
            {[...rows].reverse().slice(0, 14).map((r) => (
              <tr key={r.date}>
                <td>{fmtDate(r.date)}</td>
                {COLS.map(([f, , d]) => <td key={f} className="right">{fmt(r[f], d)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

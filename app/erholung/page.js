'use client';
import { useEffect, useState } from 'react';
import LineChart from '@/components/LineChart';
import { useSync } from '@/components/Shell';
import { db } from '@/lib/api';
import { addDays, fmt, fmtDate, iso, recoverySignal, windowMean } from '@/lib/util';

const COLS = [
  ['recovery', 'Recovery %', 0],
  ['sleep_h', 'Schlaf (h)', 1],
  ['sleep_perf', 'Schlafleistung %', 0],
  ['rhr', 'Ruhepuls', 0],
  ['hrv', 'HRV (ms)', 0],
  ['strain', 'Tages-Strain', 1],
];

export default function Erholung() {
  const today = iso();
  const { version } = useSync();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    db.list('recovery', { order: { col: 'date' } }).then(setRows).catch(() => {});
  }, [version]);

  if (!rows) return null;

  if (!rows.length) {
    return (
      <>
        <div className="head"><h1>Erholung</h1></div>
        <div className="card"><p className="muted">Noch keine Whoop-Daten. Sobald du das Whoop hast, verbindest du es in den Einstellungen.</p></div>
      </>
    );
  }

  const signal = recoverySignal(rows, today);
  const recent = rows.filter((r) => r.date >= addDays(today, -60));
  const pts = (f) => recent.filter((r) => r[f] != null).map((r) => ({ date: r.date, y: Number(r[f]) }));
  const sleepSd = (() => {
    const v = rows.filter((r) => r.date >= addDays(today, -13) && r.sleep_h != null).map((r) => Number(r.sleep_h));
    if (v.length < 4) return null;
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
  })();

  return (
    <>
      <div className="head">
        <div>
          <h1>Erholung</h1>
          <p className="sub">Aus Whoop · Trends zählen, nicht der einzelne Tageswert</p>
        </div>
      </div>

      <div className={`note ${signal.level === 'warn' ? 'warn' : signal.level === 'ok' ? 'ok' : ''}`} style={{ marginBottom: 12 }}>{signal.text}</div>

      <div className="tiles" style={{ marginBottom: 12 }}>
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
          <h2>Schlaf (h)</h2>
          <LineChart digits={1} series={[{ name: 'Schlaf', color: '#6fb1f5', dots: true, points: pts('sleep_h') }]} />
          <div className="kv" style={{ marginTop: 8 }}><span>Ziel</span><span>7,5 bis 9 h</span></div>
          <div className="kv"><span>Streuung der letzten 14 Nächte</span><span className={sleepSd != null && sleepSd > 1 ? 'neg' : ''}>{sleepSd == null ? '–' : `± ${fmt(sleepSd, 1)} h`}</span></div>
        </div>
      </div>

      <div className="card">
        <h2>Ruhepuls und HRV</h2>
        <LineChart digits={0} series={[
          { name: 'HRV (ms)', color: '#86e08f', points: pts('hrv') },
          { name: 'Ruhepuls', color: '#f3b950', points: pts('rhr') },
        ]} />
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

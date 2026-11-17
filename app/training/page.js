'use client';
import { useEffect, useMemo, useState } from 'react';
import LineChart from '@/components/LineChart';
import { useSync } from '@/components/Shell';
import { db, getSetting } from '@/lib/api';
import { addDays, exerciseSessions, fmt, fmtDate, iso, progression, weekStart, weekVolume, working } from '@/lib/util';

const cls = (l) => (l === 'ok' ? 'ok' : l === 'warn' ? 'warn' : '');
const setsText = (list) => list.map((x) => `${fmt(x.weight, 2)}×${fmt(x.reps, 0)}`).join('  ');

export default function Training() {
  const today = iso();
  const { version } = useSync();
  const [sets, setSets] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [ranges, setRanges] = useState({});
  const [week, setWeek] = useState(weekStart(today));
  const [exercise, setExercise] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, w, r] = await Promise.all([
        db.list('sets', { order: { col: 'date' } }),
        db.list('workouts', { order: { col: 'date' } }),
        getSetting('hevy_ranges', {}),
      ]);
      setSets(s); setWorkouts(w); setRanges(r || {}); setReady(true);
    })().catch(() => {});
  }, [version]);

  const volume = useMemo(() => weekVolume(sets, week), [sets, week]);

  // Alle Uebungen der letzten 5 Wochen mit Stand und Hinweis.
  const overview = useMemo(() => {
    const recent = new Map();
    for (const s of sets) if (s.date >= addDays(today, -35) && working(s)) recent.set(s.exercise, s.template_id);
    return [...recent.entries()].map(([name, tpl]) => {
      const ses = exerciseSessions(sets, name);
      const last = ses[ses.length - 1];
      const ref = ses.length > 1 ? ses[Math.max(0, ses.length - 4)] : null;
      return {
        name, last, n: ses.length,
        change: last && ref && ref !== last ? ((last.best - ref.best) / ref.best) * 100 : null,
        hint: progression(ses, ranges[tpl]),
        range: ranges[tpl],
      };
    }).filter((x) => x.last).sort((a, b) => (a.last.date < b.last.date ? 1 : -1));
  }, [sets, ranges, today]);

  useEffect(() => {
    if (!exercise && overview.length) setExercise(overview[0].name);
  }, [overview, exercise]);

  const sessions = useMemo(() => exerciseSessions(sets, exercise), [sets, exercise]);
  const current = overview.find((o) => o.name === exercise);

  const hevy = workouts.filter((w) => w.source === 'hevy');
  const weekList = hevy.filter((w) => w.date >= week && w.date <= addDays(week, 6));
  const whoopByDate = Object.fromEntries(workouts.filter((w) => w.source === 'whoop').map((w) => [w.date, w]));
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(today), -7 * i)).map((ws) => ({
    ws, n: hevy.filter((w) => w.date >= ws && w.date <= addDays(ws, 6)).length,
  }));

  if (!ready) return null;

  if (!hevy.length) {
    return (
      <>
        <div className="head"><h1>Training</h1></div>
        <div className="card"><p className="muted">Noch keine Trainingsdaten. Verbinde Hevy in den Einstellungen und logge deine erste Einheit.</p></div>
      </>
    );
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Training</h1>
          <p className="sub">Woche ab {fmtDate(week)} · {weekList.length} von 5 Einheiten</p>
        </div>
        <div className="row">
          <button className="icon ghost" onClick={() => setWeek(addDays(week, -7))} aria-label="Woche zurück">‹</button>
          <button className="icon ghost" disabled={week >= weekStart(today)} onClick={() => setWeek(addDays(week, 7))} aria-label="Woche vor">›</button>
        </div>
      </div>

      <div className="tiles" style={{ marginBottom: 12 }}>
        <div className="card">
          <h2>Wochenvolumen je Muskelgruppe</h2>
          <p className="sub" style={{ marginBottom: 6 }}>Direkte Arbeitssätze, Strich = Ziel aus dem Plan</p>
          {volume.map((g) => {
            const max = Math.max(g.target, g.sets, 1) * 1.15;
            return (
              <div className="vol" key={g.key}>
                <span>{g.label}</span>
                <div className="track">
                  <i className={g.sets < g.target * 0.75 ? 'low' : ''} style={{ width: `${(g.sets / max) * 100}%` }} />
                  <b style={{ left: `${(g.target / max) * 100}%` }} />
                </div>
                <span className="right num">{g.sets} / {g.target}</span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2>Einheiten dieser Woche</h2>
          {!weekList.length && <p className="muted small">Keine Einheit in dieser Woche.</p>}
          {!!weekList.length && (
            <table>
              <thead><tr><th>Tag</th><th>Einheit</th><th className="right">Dauer</th><th className="right">Sätze</th><th className="right">Strain</th></tr></thead>
              <tbody>
                {weekList.map((w) => (
                  <tr key={w.id}>
                    <td>{fmtDate(w.date)}</td>
                    <td>{w.title}</td>
                    <td className="right">{w.duration_min != null ? `${w.duration_min} min` : '–'}</td>
                    <td className="right">{sets.filter((s) => s.workout_id === w.id && working(s)).length}</td>
                    <td className="right">{fmt(whoopByDate[w.date]?.strain, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h2 style={{ marginTop: 16 }}>Einheiten pro Woche</h2>
          <table>
            <tbody>
              <tr>{weeks.slice().reverse().map((w) => <td key={w.ws} className="sub" style={{ textAlign: 'center' }}>{fmtDate(w.ws).slice(4)}</td>)}</tr>
              <tr>{weeks.slice().reverse().map((w) => <td key={w.ws} style={{ textAlign: 'center' }} className={w.n >= 5 ? 'pos' : w.n <= 2 ? 'neg' : ''}><strong>{w.n}</strong></td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Progression je Übung</h2>
        <p className="sub" style={{ marginBottom: 6 }}>Übungen der letzten 5 Wochen. Veränderung des geschätzten Maximums über die letzten 3 Einheiten. Zeile anklicken für den Verlauf.</p>
        <table>
          <thead><tr><th>Übung</th><th>Zuletzt</th><th>Sätze (kg × Wdh.)</th><th className="right">Veränderung</th><th>Hinweis</th></tr></thead>
          <tbody>
            {overview.map((o) => (
              <tr key={o.name} onClick={() => setExercise(o.name)} style={{ cursor: 'pointer', background: o.name === exercise ? '#1b2126' : undefined }}>
                <td>{o.name}</td>
                <td>{fmtDate(o.last.date)}</td>
                <td>{setsText(o.last.list)}</td>
                <td className={`right ${o.change == null ? '' : o.change > 0 ? 'pos' : 'neg'}`}>{o.change == null ? '–' : `${o.change >= 0 ? '+' : ''}${fmt(o.change, 1)} %`}</td>
                <td className={o.hint.level === 'warn' ? 'neg' : o.hint.level === 'ok' ? 'pos' : 'muted'}>{o.hint.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {current && (
        <div className="card">
          <div className="row between">
            <h2>{exercise}</h2>
            <span className="sub">{current.range ? `Ziel ${current.range.sets} × ${current.range.min}-${current.range.max} (aus Hevy-Routine)` : 'Kein Wiederholungsbereich in der Hevy-Routine hinterlegt'}</span>
          </div>
          <p className="sub" style={{ marginBottom: 6 }}>Geschätztes Maximum (1RM) aus dem besten Satz je Einheit</p>
          <LineChart series={[{ name: 'e1RM', color: '#6fb1f5', dots: true, points: sessions.map((s) => ({ date: s.date, y: s.best })) }]} />
          <div className={`note ${cls(current.hint.level)}`} style={{ margin: '10px 0' }}>{current.hint.text}</div>
          <table>
            <thead><tr><th>Datum</th><th>Sätze (kg × Wdh.)</th><th className="right">e1RM</th></tr></thead>
            <tbody>
              {sessions.slice(-8).reverse().map((s) => (
                <tr key={s.date}><td>{fmtDate(s.date)}</td><td>{setsText(s.list)}</td><td className="right">{fmt(s.best, 1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

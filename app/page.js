'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSync } from '@/components/Shell';
import { db, getTargets, DEFAULT_TARGETS } from '@/lib/api';
import { addDays, fmt, fmtDate, iso, mean, recoverySignal, sourceNotes, weekStart, weightTrend, windowMean, working } from '@/lib/util';

const cls = (l) => (l === 'ok' ? 'ok' : l === 'warn' ? 'warn' : l === 'bad' ? 'bad' : '');

export default function Uebersicht() {
  const today = iso();
  const { status, version } = useSync();
  const [d, setD] = useState(null);

  useEffect(() => {
    (async () => {
      const from = addDays(today, -35);
      const [weights, nutrition, recovery, workouts, sets, targets] = await Promise.all([
        db.list('weights', { filters: [['date', 'gte', from]], order: { col: 'date' } }),
        db.list('nutrition', { filters: [['date', 'gte', from]], order: { col: 'date' } }),
        db.list('recovery', { filters: [['date', 'gte', from]], order: { col: 'date' } }),
        db.list('workouts', { filters: [['date', 'gte', from]], order: { col: 'date' } }),
        db.list('sets', { filters: [['date', 'gte', from]] }),
        getTargets(),
      ]);
      setD({ weights, nutrition, recovery, workouts, sets, targets: targets || DEFAULT_TARGETS });
    })().catch(() => {});
  }, [today, version]);

  if (!d) return null;

  const notes = sourceNotes(status, today);
  const trend = weightTrend(d.weights, today);
  const lastW = d.weights[d.weights.length - 1];

  // Ernaehrung: letzter vollstaendiger Tag und 7-Tage-Mittel, heute zaehlt noch nicht.
  const yesterday = addDays(today, -1);
  const full = d.nutrition.filter((n) => n.date <= yesterday);
  const lastN = full[full.length - 1];
  const n7 = full.filter((n) => n.date >= addDays(today, -7));
  const kcal7 = mean(n7.map((n) => n.kcal));
  const prot7 = mean(n7.map((n) => n.protein));

  const ws = weekStart(today);
  const hevy = d.workouts.filter((w) => w.source === 'hevy');
  const weekSessions = hevy.filter((w) => w.date >= ws);
  const weekSets = d.sets.filter((s) => s.date >= ws && working(s)).length;
  const lastWorkout = hevy[hevy.length - 1];

  const recRows = d.recovery.filter((r) => r.recovery != null || r.sleep_h != null);
  const lastR = recRows[recRows.length - 1];
  const signal = recoverySignal(d.recovery, today);
  const sleep7 = windowMean(d.recovery, 'sleep_h', addDays(today, -6), today).mean;

  return (
    <>
      <div className="head">
        <div>
          <h1>Übersicht</h1>
          <p className="sub">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {!!notes.length && (
        <div className="stack" style={{ marginBottom: 12 }}>
          {notes.map((n, i) => (
            <div key={i} className={`note ${cls(n.level)}`}>
              {n.text} {n.setup && <Link href="/einstellungen" style={{ textDecoration: 'underline' }}>Einrichten</Link>}
            </div>
          ))}
        </div>
      )}

      <div className="tiles">
        <Link href="/koerper" className="card">
          <div className="row between"><h2>Gewicht</h2><span className="sub">{lastW ? `zuletzt ${fmtDate(lastW.date)}` : ''}</span></div>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="big">{fmt(trend.cur, 1)}</span><span className="sub">kg im 7-Tage-Mittel</span>
          </div>
          <div className="kv"><span>Veränderung zur Vorwoche</span><span className={trend.rate == null ? '' : trend.level === 'ok' ? 'pos' : 'neg'}>{trend.rate == null ? '–' : `${trend.rate >= 0 ? '+' : ''}${fmt(trend.rate, 2)} kg`}</span></div>
          <div className="kv"><span>Ziel</span><span>+0,2 bis +0,4 kg pro Woche</span></div>
          <div className={`note ${cls(trend.level)}`} style={{ marginTop: 8 }}>{trend.text}</div>
        </Link>

        <Link href="/ernaehrung" className="card">
          <div className="row between"><h2>Ernährung</h2><span className="sub">{lastN ? `letzter Tag ${fmtDate(lastN.date)}` : ''}</span></div>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="big">{fmt(kcal7, 0)}</span><span className="sub">kcal im 7-Tage-Mittel, Ziel {fmt(d.targets.kcal, 0)}</span>
          </div>
          <div className="bar" style={{ margin: '6px 0 8px' }}><i style={{ width: `${Math.min(100, ((kcal7 || 0) / d.targets.kcal) * 100)}%` }} /></div>
          <div className="kv"><span>Protein im 7-Tage-Mittel</span><span>{fmt(prot7, 0)} g von {fmt(d.targets.protein, 0)} g</span></div>
          <div className="kv"><span>Letzter Tag</span><span>{lastN ? `${fmt(lastN.kcal, 0)} kcal · ${fmt(lastN.protein, 0)} g Protein` : '–'}</span></div>
          <div className="kv"><span>Tage mit Daten (7 Tage)</span><span>{n7.length} von 7</span></div>
        </Link>

        <Link href="/training" className="card">
          <div className="row between"><h2>Training</h2><span className="sub">diese Woche</span></div>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="big">{weekSessions.length}</span><span className="sub">von 5 Einheiten · {weekSets} Arbeitssätze</span>
          </div>
          <div className="bar" style={{ margin: '6px 0 8px' }}><i style={{ width: `${Math.min(100, (weekSessions.length / 5) * 100)}%` }} /></div>
          <div className="kv"><span>Letzte Einheit</span><span>{lastWorkout ? `${fmtDate(lastWorkout.date)} · ${lastWorkout.title}` : '–'}</span></div>
          <div className="kv"><span>Einheiten in den letzten 28 Tagen</span><span>{hevy.filter((w) => w.date >= addDays(today, -27)).length}</span></div>
        </Link>

        <Link href="/erholung" className="card">
          <div className="row between"><h2>Erholung</h2><span className="sub">{lastR ? fmtDate(lastR.date) : ''}</span></div>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="big">{lastR?.recovery != null ? `${fmt(lastR.recovery, 0)} %` : '–'}</span><span className="sub">Recovery</span>
          </div>
          <div className="kv"><span>Schlaf letzte Nacht / 7-Tage-Mittel</span><span>{fmt(lastR?.sleep_h, 1)} h / {fmt(sleep7, 1)} h</span></div>
          <div className="kv"><span>Ruhepuls · HRV</span><span>{fmt(lastR?.rhr, 0)} · {fmt(lastR?.hrv, 0)} ms</span></div>
          <div className={`note ${cls(signal.level)}`} style={{ marginTop: 8 }}>{signal.text}</div>
        </Link>
      </div>
    </>
  );
}

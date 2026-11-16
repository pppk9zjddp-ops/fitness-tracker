'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Num from '@/components/Num';
import RecoveryForm from '@/components/RecoveryForm';
import { db, getPlan, getTargets } from '@/lib/api';
import { addDays, dayTotals, fmt, iso, weightTrend, recoverySignal } from '@/lib/util';
import { DEFAULT_TARGETS } from '@/lib/plan';

export default function Heute() {
  const today = iso();
  const [weights, setWeights] = useState([]);
  const [meals, setMeals] = useState([]);
  const [recovery, setRecovery] = useState([]);
  const [sets, setSets] = useState([]);
  const [plan, setPlan] = useState([]);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [w, m, r, s, p, t] = await Promise.all([
        db.list('weights', { filters: [['date', 'gte', addDays(today, -20)]], order: { col: 'date' } }),
        db.list('meals', { filters: [['date', 'eq', today]] }),
        db.list('recovery', { filters: [['date', 'gte', addDays(today, -31)]], order: { col: 'date' } }),
        db.list('sets', { filters: [['date', 'eq', today]] }),
        getPlan(),
        getTargets(),
      ]);
      setWeights(w); setMeals(m); setRecovery(r); setSets(s); setPlan(p); setTargets(t); setReady(true);
    })().catch(() => {});
  }, [today]);

  if (!ready) return null;

  const todayW = weights.find((w) => w.date === today)?.kg ?? null;
  const trend = weightTrend(weights, today);
  const { kcal, protein } = dayTotals(meals);
  const day = plan.find((d) => d.weekday === new Date().getDay());
  const planned = day ? day.exercises.reduce((a, e) => a + e.sets, 0) : 0;
  const recRow = recovery.find((r) => r.date === today);
  const signal = recoverySignal(recovery, today);

  const saveWeight = async (kg) => {
    if (kg === null) {
      setWeights(weights.filter((w) => w.date !== today));
      await db.remove('weights', today);
    } else {
      setWeights([...weights.filter((w) => w.date !== today), { date: today, kg }].sort((a, b) => (a.date > b.date ? 1 : -1)));
      await db.upsert('weights', { date: today, kg });
    }
  };

  return (
    <>
      <div className="head">
        <div>
          <h1>Heute</h1>
          <p className="sub">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link href="/einstellungen" className="btn ghost small">Einstellungen</Link>
      </div>

      <div className="card">
        <div className="row between">
          <h2>Gewicht</h2>
          <span className="sub">7-Tage-Mittel {fmt(trend.cur, 2)} kg{trend.rate !== null && ` · ${trend.rate >= 0 ? '+' : ''}${fmt(trend.rate, 2)} kg/Woche`}</span>
        </div>
        <div className="row">
          <div style={{ width: 130 }}>
            <Num value={todayW} onCommit={saveWeight} placeholder="kg heute" />
          </div>
          <div className={`note grow ${trend.level === 'ok' ? 'ok' : trend.level === 'warn' ? 'warn' : ''}`}>{trend.text}</div>
        </div>
      </div>

      <Link href="/essen" className="card" style={{ display: 'block' }}>
        <div className="row between">
          <h2>Ernährung</h2>
          <span className="sub">{meals.length} Einträge ›</span>
        </div>
        <div className="grid2">
          <div>
            <div className="row between"><span className="big">{fmt(kcal, 0)}</span><span className="sub">von {fmt(targets.kcal, 0)} kcal</span></div>
            <div className="bar"><i style={{ width: `${Math.min(100, (kcal / targets.kcal) * 100)}%` }} /></div>
          </div>
          <div>
            <div className="row between"><span className="big">{fmt(protein, 0)}</span><span className="sub">von {fmt(targets.protein, 0)} g Protein</span></div>
            <div className="bar blue"><i style={{ width: `${Math.min(100, (protein / targets.protein) * 100)}%` }} /></div>
          </div>
        </div>
      </Link>

      <Link href="/training" className="card" style={{ display: 'block' }}>
        <div className="row between">
          <h2>Training</h2>
          <span className="sub">{day ? `${sets.length} von ${planned} Sätzen ›` : 'öffnen ›'}</span>
        </div>
        {day ? (
          <>
            <p><strong>{day.title}</strong></p>
            <p className="sub">{day.exercises.map((e) => e.name).join(' · ')}</p>
          </>
        ) : (
          <p className="muted">Pausentag. Ein ausgefallenes Training kannst du heute nachholen.</p>
        )}
      </Link>

      <div className="card">
        <div className="row between">
          <h2>Recovery (Whoop)</h2>
          <Link href="/recovery" className="sub">Verlauf ›</Link>
        </div>
        <RecoveryForm
          date={today}
          row={recRow}
          onSaved={(row) => setRecovery([...recovery.filter((r) => r.date !== today), row])}
        />
        <div className={`note ${signal.level === 'warn' ? 'warn' : signal.level === 'ok' ? 'ok' : ''}`} style={{ marginTop: 10 }}>{signal.text}</div>
      </div>
    </>
  );
}

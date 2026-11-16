'use client';
import { useEffect, useMemo, useState } from 'react';
import Num from '@/components/Num';
import DateNav from '@/components/DateNav';
import { db, getPlan } from '@/lib/api';
import { fmt, fmtDate, iso } from '@/lib/util';

const short = (s) => `${fmt(s.weight, 2)}×${fmt(s.reps, 0)}`;

function hint(ex, last) {
  if (!last.length) return `Erste Einheit: Gewicht wählen, mit dem ${ex.min}-${ex.max} Wdh. bei 1-2 in Reserve gehen.`;
  if (last.length >= ex.sets && last.every((s) => Number(s.reps) >= ex.max)) {
    return 'Alle Sätze am oberen Ende: heute Gewicht erhöhen.';
  }
  return 'Gleiches Gewicht, Ziel: mehr Wiederholungen als letztes Mal.';
}

export default function Training() {
  const [plan, setPlan] = useState([]);
  const [dayKey, setDayKey] = useState(null);
  const [date, setDate] = useState(iso());
  const [sets, setSets] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([getPlan(), db.list('sets', { order: { col: 'date' } })]);
      setPlan(p);
      setSets(s);
      const logged = s.find((x) => x.date === iso())?.day_key;
      const byWeekday = p.find((d) => d.weekday === new Date().getDay())?.key;
      setDayKey(logged || byWeekday || p[0]?.key);
      setReady(true);
    })().catch(() => {});
  }, []);

  const day = plan.find((d) => d.key === dayKey);

  // exercise -> date -> Saetze
  const history = useMemo(() => {
    const h = {};
    for (const s of sets) {
      ((h[s.exercise] ||= {})[s.date] ||= []).push(s);
    }
    for (const e of Object.values(h)) for (const d of Object.values(e)) d.sort((a, b) => a.set_no - b.set_no);
    return h;
  }, [sets]);

  const save = async (ex, n, field, value) => {
    const id = `${date}|${ex.name}|${n}`;
    const cur = sets.find((s) => s.id === id);
    const row = {
      id, date, day_key: dayKey, exercise: ex.name, set_no: n,
      weight: cur?.weight ?? null, reps: cur?.reps ?? null, rir: cur?.rir ?? null,
      [field]: value,
    };
    if (row.weight === null && row.reps === null && row.rir === null) {
      setSets(sets.filter((s) => s.id !== id));
      if (cur) await db.remove('sets', id);
      return;
    }
    setSets([...sets.filter((s) => s.id !== id), row]);
    await db.upsert('sets', row);
  };

  if (!ready) return null;

  const doneCount = day ? day.exercises.reduce((a, e) => a + (history[e.name]?.[date]?.filter((s) => s.reps !== null).length || 0), 0) : 0;
  const total = day ? day.exercises.reduce((a, e) => a + e.sets, 0) : 0;

  return (
    <>
      <div className="head">
        <div>
          <h1>Training</h1>
          <p className="sub">{day ? `${day.title} · ${doneCount} von ${total} Sätzen` : ''}</p>
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      <div className="chips" style={{ marginBottom: 12 }}>
        {plan.map((d) => (
          <button key={d.key} className={`chip ${d.key === dayKey ? 'on' : ''}`} onClick={() => setDayKey(d.key)}>
            {d.label} · {d.title}
          </button>
        ))}
      </div>

      {day?.exercises.map((ex) => {
        const byDate = history[ex.name] || {};
        const today = byDate[date] || [];
        const lastDate = Object.keys(byDate).filter((d) => d < date).sort().pop();
        const last = lastDate ? byDate[lastDate] : [];
        return (
          <div className="card" key={ex.name}>
            <div className="row between">
              <h3>{ex.name}</h3>
              <span className="sub num">{ex.sets} × {ex.min}-{ex.max}</span>
            </div>
            {ex.hint && <p className="sub">{ex.hint}</p>}
            <p className="small" style={{ marginTop: 6 }}>
              <span className="muted">{lastDate ? `Zuletzt ${fmtDate(lastDate)}: ` : ''}</span>
              {last.length ? last.map(short).join('  ') : ''}
            </p>
            <p className="small" style={{ color: 'var(--accent)' }}>{hint(ex, last)}</p>

            <div className="sethead"><span /><span>kg</span><span>Wdh.</span><span>RIR</span></div>
            {Array.from({ length: ex.sets }, (_, i) => i + 1).map((n) => {
              const cur = today.find((s) => s.set_no === n);
              const ref = last.find((s) => s.set_no === n) || last[last.length - 1];
              const prevSet = today.find((s) => s.set_no === n - 1);
              return (
                <div className={`setrow ${cur?.reps != null ? 'done' : ''}`} key={`${date}-${n}`}>
                  <span className="n">{cur?.reps != null ? '✓' : n}</span>
                  <Num value={cur?.weight ?? null} placeholder={fmtPh(prevSet?.weight ?? ref?.weight)} onCommit={(v) => save(ex, n, 'weight', v)} />
                  <Num value={cur?.reps ?? null} placeholder={fmtPh(ref?.reps)} onCommit={(v) => save(ex, n, 'reps', v)} />
                  <Num value={cur?.rir ?? null} placeholder={fmtPh(ref?.rir)} onCommit={(v) => save(ex, n, 'rir', v)} />
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

function fmtPh(v) {
  return v === null || v === undefined ? '' : String(v).replace('.', ',');
}

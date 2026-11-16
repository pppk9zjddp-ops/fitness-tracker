'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Num from '@/components/Num';
import { useAppInfo } from '@/components/Shell';
import { db, getPlan, getTargets, setSetting } from '@/lib/api';
import { DEFAULT_PLAN, DEFAULT_TARGETS } from '@/lib/plan';
import { iso } from '@/lib/util';

const TABLES = ['weights', 'recovery', 'measurements', 'meals', 'meal_templates', 'sets', 'settings'];

export default function Einstellungen() {
  const info = useAppInfo();
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [planText, setPlanText] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getTargets().then(setTargets).catch(() => {});
    getPlan().then((p) => setPlanText(JSON.stringify(p, null, 2))).catch(() => {});
  }, []);

  const saveTarget = async (field, v) => {
    const next = { ...targets, [field]: v || DEFAULT_TARGETS[field] };
    setTargets(next);
    await setSetting('targets', next);
  };

  const savePlan = async () => {
    try {
      const p = JSON.parse(planText);
      if (!Array.isArray(p) || !p.every((d) => d.key && d.title && Array.isArray(d.exercises))) throw new Error();
      await setSetting('plan', p);
      setMsg('Plan gespeichert.');
    } catch {
      setMsg('Plan ist kein gültiges JSON in der erwarteten Form.');
    }
  };

  const resetPlan = async () => {
    await setSetting('plan', DEFAULT_PLAN);
    setPlanText(JSON.stringify(DEFAULT_PLAN, null, 2));
    setMsg('Plan zurückgesetzt.');
  };

  const exportAll = async () => {
    const out = {};
    for (const t of TABLES) out[t] = await db.list(t);
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `aufbau-export-${iso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logout = async () => {
    await fetch('/api/login', { method: 'DELETE' });
    window.location.href = '/';
  };

  return (
    <>
      <div className="head">
        <h1>Einstellungen</h1>
        <Link href="/" className="btn ghost small">Zurück</Link>
      </div>

      <div className="card">
        <h2>Tagesziele</h2>
        <div className="grid2">
          <Num label="Kalorien (kcal)" value={targets.kcal} onCommit={(v) => saveTarget('kcal', v)} />
          <Num label="Protein (g)" value={targets.protein} onCommit={(v) => saveTarget('protein', v)} />
        </div>
        <p className="sub" style={{ marginTop: 8 }}>Kalorien alle 2 Wochen nach dem Gewichtstrend anpassen.</p>
      </div>

      <div className="card">
        <h2>Trainingsplan</h2>
        <p className="sub" style={{ marginBottom: 8 }}>Als JSON bearbeitbar: Übungen umbenennen, Sätze und Wiederholungsbereiche ändern.</p>
        <textarea value={planText} onChange={(e) => setPlanText(e.target.value)} style={{ minHeight: 220, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} spellCheck={false} />
        <div className="row wrapflex" style={{ marginTop: 8 }}>
          <button className="primary" onClick={savePlan}>Plan speichern</button>
          <button onClick={resetPlan}>Auf Standard zurücksetzen</button>
        </div>
        {msg && <p className="sub" style={{ marginTop: 8 }}>{msg}</p>}
      </div>

      <div className="card">
        <h2>Daten</h2>
        <p className="sub" style={{ marginBottom: 8 }}>
          Speicher: {info.backend === 'supabase' ? 'Supabase (synchron auf allen Geräten)' : 'lokale Datei (nur dieser Rechner)'} · KI-Schätzung: {info.ai ? 'aktiv' : 'nicht eingerichtet'}
        </p>
        <div className="row wrapflex">
          <button onClick={exportAll}>Alle Daten exportieren</button>
          <button className="ghost danger" onClick={logout}>Abmelden</button>
        </div>
      </div>
    </>
  );
}

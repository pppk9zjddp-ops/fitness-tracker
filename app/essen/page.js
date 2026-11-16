'use client';
import { useEffect, useRef, useState } from 'react';
import Num from '@/components/Num';
import DateNav from '@/components/DateNav';
import { useAppInfo } from '@/components/Shell';
import { db, getTargets, getTemplates } from '@/lib/api';
import { dayTotals, fmt, iso, uid } from '@/lib/util';
import { DEFAULT_TARGETS } from '@/lib/plan';

const EMPTY = { name: '', kcal: null, protein: null, carbs: null, fat: null, note: '' };

// Foto vor dem Senden verkleinern, damit der Upload schnell bleibt.
function shrink(file, max = 1100) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function Essen() {
  const { ai } = useAppInfo();
  const [date, setDate] = useState(iso());
  const [meals, setMeals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([getTemplates(), getTargets()]).then(([t, g]) => { setTemplates(t); setTargets(g); }).catch(() => {});
  }, []);
  useEffect(() => {
    db.list('meals', { filters: [['date', 'eq', date]], order: { col: 'created_at' } }).then(setMeals).catch(() => {});
  }, [date]);


  const add = async (m, source) => {
    const row = {
      id: uid(), date, name: m.name || 'Mahlzeit',
      kcal: Math.round(m.kcal || 0), protein: Math.round(m.protein || 0),
      carbs: Math.round(m.carbs || 0), fat: Math.round(m.fat || 0),
      source, created_at: new Date().toISOString(),
    };
    setMeals((cur) => [...cur, row]);
    await db.upsert('meals', row);
  };

  const del = async (id) => {
    setMeals(meals.filter((m) => m.id !== id));
    await db.remove('meals', id);
  };

  const estimate = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), image }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Schätzung fehlgeschlagen');
      setDraft(j);
    } catch (e) {
      setErr(String(e.message || e));
    }
    setBusy(false);
  };

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setImage(await shrink(f)); } catch { setErr('Foto konnte nicht gelesen werden.'); }
  };

  const confirm = async () => {
    await add(draft, image ? 'foto' : text ? 'ki' : 'manuell');
    setDraft(null); setText(''); setImage(null);
  };

  const saveTemplate = async () => {
    const t = {
      id: uid(), name: draft.name || 'Vorlage', kcal: Math.round(draft.kcal || 0), protein: Math.round(draft.protein || 0),
      carbs: Math.round(draft.carbs || 0), fat: Math.round(draft.fat || 0), sort: Date.now(),
    };
    setTemplates([...templates, t]);
    await db.upsert('meal_templates', t);
  };

  const delTemplate = async (id) => {
    setTemplates(templates.filter((t) => t.id !== id));
    await db.remove('meal_templates', id);
  };

  const tot = dayTotals(meals);
  const kcal = tot.kcal, protein = tot.protein;

  return (
    <>
      <div className="head">
        <h1>Essen</h1>
        <DateNav date={date} onChange={setDate} />
      </div>

      <div className="card">
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
        <p className="sub" style={{ marginTop: 8 }}>
          Kohlenhydrate {fmt(tot.carbs, 0)} g · Fett {fmt(tot.fat, 0)} g · noch {fmt(Math.max(0, targets.kcal - kcal), 0)} kcal offen
        </p>
        {tot.health && (
          <div className="note" style={{ marginTop: 8 }}>
            Für diesen Tag gibt es eine Tagessumme aus Apple Health. Sie zählt allein, die übrigen Einträge werden nicht addiert.
          </div>
        )}
      </div>

      <div className="card">
        <div className="row between">
          <h2>Vorlagen</h2>
          <button className="ghost small icon" onClick={() => setEdit(!edit)}>{edit ? 'Fertig' : 'Bearbeiten'}</button>
        </div>
        <div className="tpl">
          {templates.map((t) => (
            <button key={t.id} onClick={() => (edit ? delTemplate(t.id) : add(t, 'vorlage'))}>
              <span>{t.name}</span>
              <small className={edit ? 'danger' : ''}>{edit ? 'löschen' : `${fmt(t.kcal, 0)} kcal · ${fmt(t.protein, 0)} g P`}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Neue Mahlzeit</h2>
        {!draft && (
          <>
            <textarea
              placeholder={ai ? 'Beschreiben, z.B. „150 g Reis, 200 g Hähnchen, Brokkoli, 1 EL Öl“, oder Foto aufnehmen' : 'KI-Schätzung ist nicht eingerichtet. Mahlzeit manuell eintragen.'}
              value={text} onChange={(e) => setText(e.target.value)} disabled={!ai}
            />
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
            <div className="row wrapflex" style={{ marginTop: 8 }}>
              {image && <img className="thumb" src={image} alt="Foto der Mahlzeit" />}
              {ai && <button onClick={() => (image ? setImage(null) : fileRef.current?.click())}>{image ? 'Foto entfernen' : 'Foto'}</button>}
              {ai && <button className="primary" disabled={busy || (!text.trim() && !image)} onClick={estimate}>{busy ? 'Schätze …' : 'Schätzen'}</button>}
              <button onClick={() => setDraft({ ...EMPTY })}>Manuell</button>
            </div>
            {err && <div className="note bad" style={{ marginTop: 8 }}>{err}</div>}
          </>
        )}
        {draft && (
          <>
            <label className="field"><span>Name</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <div className="grid4" style={{ marginTop: 8 }}>
              <Num label="kcal" value={draft.kcal} onCommit={(v) => setDraft((d) => ({ ...d, kcal: v }))} />
              <Num label="Protein" value={draft.protein} onCommit={(v) => setDraft((d) => ({ ...d, protein: v }))} />
              <Num label="Kohlenh." value={draft.carbs} onCommit={(v) => setDraft((d) => ({ ...d, carbs: v }))} />
              <Num label="Fett" value={draft.fat} onCommit={(v) => setDraft((d) => ({ ...d, fat: v }))} />
            </div>
            {draft.note && <p className="sub" style={{ marginTop: 8 }}>Annahme: {draft.note}</p>}
            <div className="row wrapflex" style={{ marginTop: 10 }}>
              <button className="primary" onClick={confirm}>Hinzufügen</button>
              <button onClick={saveTemplate}>Als Vorlage speichern</button>
              <button className="ghost" onClick={() => setDraft(null)}>Verwerfen</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Einträge</h2>
        {!meals.length && <p className="muted small">Noch nichts eingetragen.</p>}
        {!!meals.length && (
          <table>
            <thead><tr><th>Mahlzeit</th><th className="right">kcal</th><th className="right">P</th><th className="right">KH</th><th className="right">F</th><th /></tr></thead>
            <tbody>
              {meals.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td className="right">{fmt(m.kcal, 0)}</td>
                  <td className="right">{fmt(m.protein, 0)}</td>
                  <td className="right">{fmt(m.carbs, 0)}</td>
                  <td className="right">{fmt(m.fat, 0)}</td>
                  <td className="right"><button className="ghost icon danger" onClick={() => del(m.id)} aria-label="Eintrag löschen">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

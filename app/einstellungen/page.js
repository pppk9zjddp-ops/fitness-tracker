'use client';
import { useEffect, useState } from 'react';
import Num from '@/components/Num';
import { useSync } from '@/components/Shell';
import { getTargets, setTargets as saveTargets, DEFAULT_TARGETS } from '@/lib/api';
import { ago, fmtDate } from '@/lib/util';

async function postConfig(body) {
  const r = await fetch('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

function State({ s }) {
  if (!s || s.configured === false) return <span className="muted">nicht verbunden</span>;
  if (s.ok === false) return <span style={{ color: 'var(--bad)' }}>Fehler: {s.error}</span>;
  return <span className="pos">verbunden · {ago(s.at)}</span>;
}

export default function Einstellungen() {
  const { status, sync, syncing } = useSync();
  const [cfg, setCfg] = useState(null);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [hevyKey, setHevyKey] = useState('');
  const [whoopId, setWhoopId] = useState('');
  const [whoopSecret, setWhoopSecret] = useState('');
  const [healthDir, setHealthDir] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((c) => {
      setCfg(c); setWhoopId(c.whoopClientId); setHealthDir(c.healthDir);
    }).catch(() => {});
    getTargets().then((t) => setTargets(t || DEFAULT_TARGETS)).catch(() => {});
    const w = new URLSearchParams(window.location.search).get('whoop');
    if (w === 'ok') setMsg('Whoop ist verbunden.');
    if (w === 'fehler') setMsg('Whoop-Verbindung fehlgeschlagen. Client-ID, Secret und Redirect-URL prüfen.');
    if (w === 'fehlt') setMsg('Bitte zuerst Client-ID und Client-Secret speichern.');
  }, []);

  const save = async (body, text) => {
    setCfg(await postConfig(body));
    setMsg(text);
    sync();
  };

  const saveTarget = async (field, v) => {
    const next = { ...targets, [field]: v || DEFAULT_TARGETS[field] };
    setTargets(next);
    await saveTargets(next);
  };

  if (!cfg) return null;
  const h = status.health || {};

  return (
    <>
      <div className="head"><h1>Einstellungen</h1></div>
      {msg && <div className="note ok" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="card">
        <h2>Tagesziele</h2>
        <div className="grid2" style={{ maxWidth: 420 }}>
          <Num label="Kalorien (kcal)" value={targets.kcal} onCommit={(v) => saveTarget('kcal', v)} />
          <Num label="Protein (g)" value={targets.protein} onCommit={(v) => saveTarget('protein', v)} />
        </div>
        <p className="sub" style={{ marginTop: 8 }}>Kalorien alle 2 Wochen nach dem Gewichtstrend anpassen.</p>
      </div>

      <div className="card">
        <div className="row between"><h2>Hevy (Training)</h2><State s={status.hevy} /></div>
        <ol className="steps">
          <li>In Hevy Pro abschließen und deinen Plan als Routinen anlegen, mit Wiederholungsbereich je Übung.</li>
          <li>Auf hevy.com unter Settings, Developer einen API-Key erzeugen.</li>
          <li>Den Key hier einfügen und speichern.</li>
        </ol>
        <div className="row" style={{ marginTop: 8, maxWidth: 560 }}>
          <input type="password" placeholder={cfg.hevyKeySet ? 'Key ist gespeichert. Neuen Key eingeben, um ihn zu ersetzen' : 'API-Key'} value={hevyKey} onChange={(e) => setHevyKey(e.target.value)} />
          <button className="primary" disabled={!hevyKey.trim()} onClick={() => { save({ hevyKey }, 'Hevy-Key gespeichert.'); setHevyKey(''); }}>Speichern</button>
        </div>
      </div>

      <div className="card">
        <div className="row between"><h2>Apple Health (Gewicht, Ernährung)</h2><State s={status.health} /></div>
        <ol className="steps">
          <li>In MyFitnessPal und Renpho Health das Schreiben nach Apple Health einschalten.</li>
          <li>Health Auto Export auf dem iPhone installieren, Premium aktivieren.</li>
          <li>Dort eine Automation anlegen: Ziel iCloud Drive, Format JSON, Datentyp Health Metrics, Zusammenfassung pro Tag. Metriken: Gewicht, Körperfett, Nahrungsenergie, Protein, Kohlenhydrate, Fett.</li>
          <li>Einmal "Export" antippen und warten, bis der Mac den Ordner synchronisiert hat.</li>
        </ol>
        <label className="field" style={{ marginTop: 8 }}>
          <span>Ordner mit den Exporten (leer lassen für automatische Suche)</span>
          <div className="row">
            <input placeholder={cfg.healthCandidates[0] || '~/Library/Mobile Documents/…'} value={healthDir} onChange={(e) => setHealthDir(e.target.value)} />
            <button onClick={() => save({ healthDir }, 'Ordner gespeichert.')}>Speichern</button>
          </div>
        </label>
        {h.configured && (
          <p className="sub" style={{ marginTop: 8 }}>
            Gelesen aus <code>{h.dir}</code>: {h.files} Dateien, Metriken: {h.metrics?.length ? h.metrics.join(', ') : 'keine erkannt'}.
            {' '}Letztes Gewicht: {h.lastWeight ? fmtDate(h.lastWeight) : '–'}, letzte Ernährung: {h.lastNutrition ? fmtDate(h.lastNutrition) : '–'}
            {h.placeholders > 0 && ` · noch nicht aus iCloud geladen: ${h.placeholders}`}
          </p>
        )}
        {!h.configured && !cfg.healthCandidates.length && (
          <p className="sub" style={{ marginTop: 8 }}>Noch kein Export-Ordner gefunden.</p>
        )}
      </div>

      <div className="card">
        <div className="row between"><h2>Whoop (Schlaf, Erholung)</h2><State s={status.whoop} /></div>
        <ol className="steps">
          <li>Auf developer.whoop.com mit deinem Whoop-Konto anmelden und eine App anlegen.</li>
          <li>Als Redirect-URL eintragen: <code>{cfg.whoopRedirect}</code></li>
          <li>Scopes wählen: offline, read:recovery, read:cycles, read:sleep, read:workout, read:profile, read:body_measurement.</li>
          <li>Client-ID und Client-Secret hier speichern, dann "Mit Whoop verbinden".</li>
        </ol>
        <div className="grid2" style={{ marginTop: 8, maxWidth: 700 }}>
          <label className="field"><span>Client-ID</span><input value={whoopId} onChange={(e) => setWhoopId(e.target.value)} /></label>
          <label className="field"><span>Client-Secret</span><input type="password" placeholder={cfg.whoopSecretSet ? 'ist gespeichert' : ''} value={whoopSecret} onChange={(e) => setWhoopSecret(e.target.value)} /></label>
        </div>
        <div className="row wrapflex" style={{ marginTop: 8 }}>
          <button onClick={() => { save({ whoopClientId: whoopId, ...(whoopSecret ? { whoopClientSecret: whoopSecret } : {}) }, 'Whoop-Zugangsdaten gespeichert.'); setWhoopSecret(''); }}>Speichern</button>
          <button className="primary" disabled={!cfg.whoopClientId || !cfg.whoopSecretSet} onClick={() => { window.location.href = '/api/whoop/login'; }}>
            {cfg.whoopConnected ? 'Neu verbinden' : 'Mit Whoop verbinden'}
          </button>
          {cfg.whoopConnected && <button className="ghost danger" onClick={() => save({ whoopDisconnect: true }, 'Whoop getrennt.')}>Trennen</button>}
        </div>
      </div>

      <div className="card">
        <h2>Daten</h2>
        <p className="small">Datenordner: <code>{cfg.dataDir}</code></p>
        <p className="sub" style={{ marginTop: 6 }}>
          {cfg.inICloud
            ? 'Der Ordner liegt in iCloud Drive. Datenbank und Zugangsdaten sind damit gesichert.'
            : 'iCloud Drive wurde nicht gefunden, die Daten liegen nur im Programmordner.'}
          {' '}Die Datei <code>db.json</code> enthält auch deine Zugangsdaten zu Hevy und Whoop, also nicht weitergeben.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <button disabled={syncing} onClick={sync}>{syncing ? 'Aktualisiere …' : 'Jetzt alle Quellen abrufen'}</button>
        </div>
      </div>
    </>
  );
}

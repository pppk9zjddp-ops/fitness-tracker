'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ago } from '@/lib/util';

const Sync = createContext({ status: {}, syncing: false, version: 0, sync: () => {} });
export const useSync = () => useContext(Sync);

const TABS = [
  ['/', 'Übersicht'],
  ['/training', 'Training'],
  ['/ernaehrung', 'Ernährung'],
  ['/koerper', 'Körper'],
  ['/erholung', 'Erholung'],
  ['/einstellungen', 'Einstellungen'],
];

export default function Shell({ children }) {
  const path = usePathname();
  const [status, setStatus] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [version, setVersion] = useState(0);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const j = await (await fetch('/api/sync', { method: 'POST' })).json();
      if (!j.error) setStatus(j);
    } catch {}
    setSyncing(false);
    setVersion((v) => v + 1);
  }, []);

  // Beim Oeffnen den letzten Stand laden und neu abrufen, wenn er aelter als eine Stunde ist.
  useEffect(() => {
    (async () => {
      try {
        const j = await (await fetch('/api/sync')).json();
        setStatus(j);
        if (!j.at || Date.now() - j.at > 3600000) sync();
      } catch {}
    })();
  }, [sync]);

  return (
    <Sync.Provider value={{ status, syncing, version, sync }}>
      <nav className="tabs">
        <div className="inner">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'on' : ''}>{label}</Link>
          ))}
          <span className="syncbox">
            <span className="sub">{syncing ? 'Aktualisiere …' : `Stand: ${ago(status.at)}`}</span>
            <button className="icon" disabled={syncing} onClick={sync}>Aktualisieren</button>
          </span>
        </div>
      </nav>
      <main className="wrap">{children}</main>
    </Sync.Provider>
  );
}

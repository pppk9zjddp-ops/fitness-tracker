'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const AppInfo = createContext({ ai: false, backend: 'local' });
export const useAppInfo = () => useContext(AppInfo);

const TABS = [
  ['/', 'Heute'],
  ['/training', 'Training'],
  ['/essen', 'Essen'],
  ['/fortschritt', 'Fortschritt'],
  ['/recovery', 'Recovery'],
];

export default function Shell({ children }) {
  const path = usePathname();
  const [state, setState] = useState('loading');
  const [info, setInfo] = useState({ ai: false, backend: 'local' });
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const check = async () => {
    try {
      const j = await (await fetch('/api/login')).json();
      setInfo({ ai: j.ai, backend: j.backend });
      setState(j.ok ? 'in' : 'out');
    } catch {
      setState('out');
    }
  };

  useEffect(() => {
    check();
    const f = () => setState('out');
    window.addEventListener('aufbau-unauth', f);
    return () => window.removeEventListener('aufbau-unauth', f);
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setErr('');
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (r.ok) {
      setPw('');
      check();
    } else setErr('Passwort stimmt nicht.');
  };

  if (state === 'loading') return null;

  if (state === 'out') {
    return (
      <form className="login" onSubmit={login}>
        <h1 className="center" style={{ marginBottom: 18 }}>Aufbau</h1>
        <input type="password" placeholder="Passwort" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        <button className="primary" style={{ width: '100%', marginTop: 10 }}>Anmelden</button>
        {err && <p className="small center" style={{ color: 'var(--bad)', marginTop: 10 }}>{err}</p>}
      </form>
    );
  }

  return (
    <AppInfo.Provider value={info}>
      <main className="wrap">{children}</main>
      <nav className="tabs">
        <div className="inner">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'on' : ''}>{label}</Link>
          ))}
        </div>
      </nav>
    </AppInfo.Provider>
  );
}

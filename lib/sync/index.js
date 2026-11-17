import { getSetting, setSetting } from '../store';
import { syncHevy } from './hevy';
import { syncHealth } from './health';
import { syncWhoop } from './whoop';

const SOURCES = { hevy: syncHevy, health: syncHealth, whoop: syncWhoop };
let running = null;

// Alle Quellen abrufen. Eine fehlerhafte Quelle haelt die anderen nicht auf.
export async function syncAll() {
  if (running) return running;
  running = (async () => {
    const status = getSetting('sync', {});
    for (const [name, fn] of Object.entries(SOURCES)) {
      try {
        const res = await fn();
        status[name] = { ...res, ok: true, error: null, at: res.configured ? Date.now() : status[name]?.at || null };
      } catch (e) {
        status[name] = { ...(status[name] || {}), configured: true, ok: false, error: String(e.message || e), tried: Date.now() };
      }
    }
    status.at = Date.now();
    setSetting('sync', status);
    return status;
  })();
  try {
    return await running;
  } finally {
    running = null;
  }
}

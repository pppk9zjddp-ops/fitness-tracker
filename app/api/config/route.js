// Zugangsdaten und Pfade. Geheime Werte gehen nie zurueck an den Browser, nur ob sie gesetzt sind.
import { NextResponse } from 'next/server';
import { getSetting, setSetting, dataDir, inICloud } from '@/lib/store';
import { candidates } from '@/lib/sync/health';
import { REDIRECT } from '@/lib/sync/whoop';

export const dynamic = 'force-dynamic';

function view() {
  const c = getSetting('config', {});
  return {
    dataDir: dataDir(),
    inICloud: inICloud(),
    hevyKeySet: !!c.hevyKey,
    whoopClientId: c.whoopClientId || '',
    whoopSecretSet: !!c.whoopClientSecret,
    whoopConnected: !!c.whoopTokens?.refresh,
    whoopRedirect: REDIRECT,
    healthDir: c.healthDir || '',
    healthCandidates: candidates(),
  };
}

export async function GET() {
  return NextResponse.json(view());
}

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const c = { ...getSetting('config', {}) };
  const str = (v) => String(v).trim();
  if (b.hevyKey !== undefined) c.hevyKey = str(b.hevyKey) || undefined;
  if (b.whoopClientId !== undefined) c.whoopClientId = str(b.whoopClientId) || undefined;
  if (b.whoopClientSecret !== undefined) c.whoopClientSecret = str(b.whoopClientSecret) || undefined;
  if (b.healthDir !== undefined) c.healthDir = str(b.healthDir).replace(/^~(?=\/)/, process.env.HOME || '~') || undefined;
  if (b.whoopDisconnect) c.whoopTokens = undefined;
  setSetting('config', c);
  return NextResponse.json(view());
}

import { NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/store';
import { exchangeCode } from '@/lib/sync/whoop';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const back = (s) => NextResponse.redirect(`http://localhost:3210/einstellungen?whoop=${s}`);
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.get('state') !== getSetting('whoop_state')) return back('fehler');
  try {
    await exchangeCode(code);
    setSetting('whoop_state', null);
    return back('ok');
  } catch {
    return back('fehler');
  }
}

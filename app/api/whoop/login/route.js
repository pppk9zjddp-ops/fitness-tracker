import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/store';
import { authUrl } from '@/lib/sync/whoop';

export const dynamic = 'force-dynamic';

export async function GET() {
  const c = getSetting('config', {});
  if (!c.whoopClientId || !c.whoopClientSecret) {
    return NextResponse.redirect('http://localhost:3210/einstellungen?whoop=fehlt');
  }
  const state = crypto.randomBytes(12).toString('hex');
  setSetting('whoop_state', state);
  return NextResponse.redirect(authUrl(state));
}

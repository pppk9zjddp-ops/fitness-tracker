import { NextResponse } from 'next/server';
import { authed, token } from '@/lib/auth';
import { backend } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  return NextResponse.json({
    ok: authed(req),
    backend: backend(),
    ai: !!process.env.ANTHROPIC_API_KEY,
  });
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  const t = token();
  if (t && password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  if (t) {
    res.cookies.set('aufbau_auth', t, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 180,
      path: '/',
    });
  }
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('aufbau_auth', '', { maxAge: 0, path: '/' });
  return res;
}

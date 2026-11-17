import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/store';
import { syncAll } from '@/lib/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json(getSetting('sync', {}));
}

export async function POST() {
  try {
    return NextResponse.json(await syncAll());
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

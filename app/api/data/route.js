import { NextResponse } from 'next/server';
import { authed } from '@/lib/auth';
import { list, upsert, remove } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!authed(req)) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  try {
    const b = await req.json();
    if (b.op === 'list') {
      return NextResponse.json({ data: await list(b.table, { filters: b.filters, order: b.order, limit: b.limit }) });
    }
    if (b.op === 'upsert') {
      return NextResponse.json({ data: await upsert(b.table, b.rows) });
    }
    if (b.op === 'delete') {
      return NextResponse.json({ data: await remove(b.table, b.id) });
    }
    return NextResponse.json({ error: 'Unbekannte Operation' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

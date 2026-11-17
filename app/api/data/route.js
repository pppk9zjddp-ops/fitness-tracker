import { NextResponse } from 'next/server';
import { list, upsert, remove } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Schreiben darf der Browser nur in Tabellen ohne Datenquelle. Die Zugangsdaten laufen ueber /api/config.
const WRITABLE = ['measurements', 'weights'];
const HIDDEN = ['config', 'whoop_state'];

export async function POST(req) {
  try {
    const b = await req.json();
    if (b.op === 'list') {
      let rows = list(b.table, { filters: b.filters, order: b.order, limit: b.limit });
      if (b.table === 'settings') rows = rows.filter((r) => !HIDDEN.includes(r.key));
      return NextResponse.json({ data: rows });
    }
    if (b.op === 'upsert') {
      if (b.table === 'settings') {
        if ((b.rows || []).some((r) => r.key !== 'targets')) throw new Error('Nicht erlaubt');
      } else if (!WRITABLE.includes(b.table)) throw new Error('Nicht erlaubt');
      return NextResponse.json({ data: upsert(b.table, b.rows) });
    }
    if (b.op === 'delete') {
      if (!WRITABLE.includes(b.table)) throw new Error('Nicht erlaubt');
      return NextResponse.json({ data: remove(b.table, b.id) });
    }
    return NextResponse.json({ error: 'Unbekannte Operation' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

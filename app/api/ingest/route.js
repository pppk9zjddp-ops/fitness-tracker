// Import aus Apple Health per iOS-Kurzbefehl (z.B. MyFitnessPal-Tagessummen, Waage, Whoop).
// POST /api/ingest  Header: Authorization: Bearer <INGEST_TOKEN>
// Body (alle Felder ausser date optional):
// { "date": "2027-01-12", "kcal": 3550, "protein": 160, "carbs": 480, "fat": 95,
//   "weight": 77.4, "sleep_h": 8.1, "rhr": 55, "hrv": 78, "recovery": 66 }
import { NextResponse } from 'next/server';
import { upsert, list } from '@/lib/store';

export const dynamic = 'force-dynamic';

const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export async function POST(req) {
  const token = process.env.INGEST_TOKEN;
  if (!token) return NextResponse.json({ error: 'Import ist nicht eingerichtet.' }, { status: 501 });
  if (req.headers.get('authorization') !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'unauth' }, { status: 401 });
  }
  try {
    const b = await req.json();
    const date = String(b.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date fehlt (JJJJ-MM-TT).' }, { status: 400 });
    }
    const done = [];

    const kcal = num(b.kcal);
    if (kcal !== null) {
      await upsert('meals', [{
        id: `health|${date}`,
        date,
        name: 'Apple Health (Tagessumme)',
        kcal: Math.round(kcal),
        protein: Math.round(num(b.protein) || 0),
        carbs: Math.round(num(b.carbs) || 0),
        fat: Math.round(num(b.fat) || 0),
        source: 'health',
        created_at: new Date().toISOString(),
      }]);
      done.push('ernaehrung');
    }

    const weight = num(b.weight);
    if (weight !== null) {
      await upsert('weights', [{ date, kg: Math.round(weight * 100) / 100 }]);
      done.push('gewicht');
    }

    const rec = { sleep_h: num(b.sleep_h), rhr: num(b.rhr), hrv: num(b.hrv), recovery: num(b.recovery) };
    if (Object.values(rec).some((v) => v !== null)) {
      const cur = (await list('recovery', { filters: [['date', 'eq', date]] }))[0] || {};
      const merged = { date };
      for (const k of Object.keys(rec)) merged[k] = rec[k] !== null ? rec[k] : cur[k] ?? null;
      await upsert('recovery', [merged]);
      done.push('recovery');
    }

    return NextResponse.json({ ok: true, date, gespeichert: done });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

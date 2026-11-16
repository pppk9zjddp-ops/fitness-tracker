import { NextResponse } from 'next/server';
import { authed } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM = `Du schaetzt Naehrwerte von Mahlzeiten fuer ein Ernaehrungstagebuch.
Antworte ausschliesslich mit einem JSON-Objekt, ohne weiteren Text:
{"name": "kurzer deutscher Name", "kcal": Zahl, "protein": Zahl, "carbs": Zahl, "fat": Zahl, "note": "eine kurze Zeile zu den Annahmen"}
Alle Naehrwerte in ganzen Zahlen (kcal bzw. Gramm) fuer die gesamte beschriebene oder gezeigte Portion.
Mengenangaben zu Reis, Nudeln und Haferflocken sind Rohgewicht, sofern nicht anders angegeben.
Fehlen Mengen, nimm eine realistische Portion fuer einen 1,96 m grossen Mann im Muskelaufbau an und nenne die Annahme in "note".`;

export async function POST(req) {
  if (!authed(req)) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'KI-Schaetzung ist nicht eingerichtet (ANTHROPIC_API_KEY fehlt).' }, { status: 501 });
  }
  const { text, image } = await req.json().catch(() => ({}));
  if (!text && !image) return NextResponse.json({ error: 'Text oder Foto fehlt.' }, { status: 400 });

  const content = [];
  if (image) {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(image);
    if (!m) return NextResponse.json({ error: 'Bildformat nicht lesbar.' }, { status: 400 });
    content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
  }
  content.push({
    type: 'text',
    text: text ? `Mahlzeit: ${text}` : 'Schaetze die Mahlzeit auf dem Foto.',
  });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: j?.error?.message || 'Anfrage an die KI fehlgeschlagen.' }, { status: 502 });
    }
    const out = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Antwort der KI nicht lesbar.' }, { status: 502 });
    const p = JSON.parse(match[0]);
    const num = (v) => Math.max(0, Math.round(Number(v) || 0));
    return NextResponse.json({
      name: String(p.name || text || 'Mahlzeit').slice(0, 80),
      kcal: num(p.kcal),
      protein: num(p.protein),
      carbs: num(p.carbs),
      fat: num(p.fat),
      note: String(p.note || '').slice(0, 200),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

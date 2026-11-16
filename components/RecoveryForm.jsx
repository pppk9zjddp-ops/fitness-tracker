'use client';
import Num from './Num';
import { db } from '@/lib/api';

const FIELDS = [
  ['sleep_h', 'Schlaf (h)'],
  ['rhr', 'Ruhepuls'],
  ['hrv', 'HRV (ms)'],
  ['recovery', 'Recovery %'],
];

export default function RecoveryForm({ date, row, onSaved }) {
  const save = async (field, v) => {
    const next = { date, sleep_h: null, rhr: null, hrv: null, recovery: null, ...(row || {}), [field]: v };
    onSaved(next);
    await db.upsert('recovery', next);
  };
  return (
    <div className="grid4">
      {FIELDS.map(([f, label]) => (
        <Num key={f} label={label} value={row?.[f] ?? null} onCommit={(v) => save(f, v)} />
      ))}
    </div>
  );
}

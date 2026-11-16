'use client';
import { addDays, fmtDate, iso } from '@/lib/util';

export default function DateNav({ date, onChange }) {
  const today = iso();
  return (
    <div className="row">
      <button className="icon ghost" onClick={() => onChange(addDays(date, -1))} aria-label="Tag zurück">‹</button>
      <span className="small" style={{ minWidth: 92, textAlign: 'center' }}>
        {date === today ? 'Heute' : fmtDate(date)}
      </span>
      <button className="icon ghost" disabled={date >= today} onClick={() => onChange(addDays(date, 1))} aria-label="Tag vor">›</button>
    </div>
  );
}

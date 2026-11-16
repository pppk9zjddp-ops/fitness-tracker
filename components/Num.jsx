'use client';
import { useEffect, useState } from 'react';
import { parseNum } from '@/lib/util';

const show = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','));

// Zahlenfeld: speichert beim Verlassen des Feldes oder mit Enter, akzeptiert Komma und Punkt.
export default function Num({ value, onCommit, placeholder, label, style }) {
  const [s, setS] = useState(show(value));
  useEffect(() => setS(show(value)), [value]);

  const commit = () => {
    const n = parseNum(s);
    const cur = value === undefined ? null : value;
    if (n !== cur) onCommit(n);
    else setS(show(value));
  };

  const input = (
    <input
      inputMode="decimal"
      value={s}
      placeholder={placeholder}
      style={style}
      onChange={(e) => setS(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
  if (!label) return input;
  return (
    <label className="field">
      <span>{label}</span>
      {input}
    </label>
  );
}

'use client';
import { fmt } from '@/lib/util';

const W = 600;
const PAD = { l: 40, r: 10, t: 10, b: 22 };
const t = (d) => new Date(d + 'T12:00:00').getTime();

// series: [{ name, color, points: [{ date, y }], dots, width }]
export default function LineChart({ series, height = 190, digits = 1 }) {
  const all = series.flatMap((s) => s.points).filter((p) => p.y !== null && p.y !== undefined);
  if (all.length < 2) return <p className="muted small">Noch zu wenig Daten für ein Diagramm.</p>;

  const xs = all.map((p) => t(p.date));
  const ys = all.map((p) => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (x0 === x1) x1 = x0 + 86400000;
  const padY = (y1 - y0) * 0.12 || 1;
  y0 -= padY; y1 += padY;

  const X = (d) => PAD.l + ((t(d) - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const Y = (y) => PAD.t + (1 - (y - y0) / (y1 - y0)) * (height - PAD.t - PAD.b);
  const ticks = [0, 1, 2, 3].map((i) => y0 + ((y1 - y0) * i) / 3);
  const dates = [...new Set(all.map((p) => p.date))].sort();
  const label = (d) => new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img">
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={Y(v)} y2={Y(v)} stroke="#232a30" strokeWidth="1" />
            <text x={PAD.l - 6} y={Y(v) + 4} textAnchor="end">{fmt(v, digits)}</text>
          </g>
        ))}
        <text x={PAD.l} y={height - 5}>{label(dates[0])}</text>
        <text x={W - PAD.r} y={height - 5} textAnchor="end">{label(dates[dates.length - 1])}</text>
        {series.map((s, i) => {
          const pts = s.points.filter((p) => p.y !== null && p.y !== undefined);
          if (!pts.length) return null;
          return (
            <g key={i}>
              {!s.dotsOnly && (
                <polyline
                  fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeLinejoin="round" strokeLinecap="round"
                  points={pts.map((p) => `${X(p.date).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')}
                />
              )}
              {(s.dots || s.dotsOnly) && pts.map((p, j) => (
                <circle key={j} cx={X(p.date)} cy={Y(p.y)} r={s.dotsOnly ? 2.5 : 3} fill={s.color} opacity={s.dotsOnly ? 0.55 : 1} />
              ))}
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <div className="legend">
          {series.map((s, i) => (
            <span key={i}><i style={{ background: s.color }} />{s.name}</span>
          ))}
        </div>
      )}
    </>
  );
}

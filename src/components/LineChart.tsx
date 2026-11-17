'use client';
import { useMemo, useState } from 'react';
import { num } from '@/lib/format';

type Pt = { t: number; v: number };

/** Lightweight SVG time-series chart with hover readout. */
export function LineChart({ points, label, unit = '', color = '#3f7d1a', height = 160 }: { points: Pt[]; label: string; unit?: string; color?: string; height?: number }) {
  const W = 600;
  const H = height;
  const P = { l: 48, r: 12, t: 14, b: 28 };
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const pts = points.filter((p) => Number.isFinite(p.v)).sort((a, b) => a.t - b.t);
    if (pts.length < 1) return null;
    let min = Math.min(...pts.map((p) => p.v));
    let max = Math.max(...pts.map((p) => p.v));
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.08;
    min -= pad; max += pad;
    const t0 = pts[0].t;
    const t1 = pts[pts.length - 1].t || t0 + 1;
    const x = (t: number) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r);
    const y = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const area = `${d} L${x(pts[pts.length - 1].t).toFixed(1)},${H - P.b} L${x(pts[0].t).toFixed(1)},${H - P.b} Z`;
    return { pts, min, max, x, y, d, area, t0, t1 };
  }, [points, H]);

  if (!geo) return <div className="flex h-40 items-center justify-center text-cell text-ink-600">No {label.toLowerCase()} data</div>;

  const last = geo.pts[geo.pts.length - 1];
  const shown = hover !== null ? geo.pts[hover] : last;
  const ticks = [geo.min, (geo.min + geo.max) / 2, geo.max];

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="num text-body font-medium text-ink-900">
          {num(shown.v, 2)}
          {unit}
          <span className="ml-2 text-xs font-normal text-ink-600">{new Date(shown.t).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          let bd = Infinity;
          geo.pts.forEach((p, i) => {
            const dd = Math.abs(geo.x(p.t) - px);
            if (dd < bd) { bd = dd; best = i; }
          });
          setHover(best);
        }}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={geo.y(t)} y2={geo.y(t)} stroke="#e5e7eb" />
            <text x={P.l - 6} y={geo.y(t) + 3} textAnchor="end" fontSize="12" fill="#475569">{num(t, 1)}</text>
          </g>
        ))}
        <text x={P.l} y={H - 8} fontSize="12" fill="#475569">{new Date(geo.t0).toLocaleString('en-PK', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</text>
        <text x={W - P.r} y={H - 8} fontSize="12" fill="#475569" textAnchor="end">{new Date(geo.t1).toLocaleString('en-PK', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</text>
        <path d={geo.area} fill={color} fillOpacity="0.10" />
        <path d={geo.d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {hover !== null && (
          <g>
            <line x1={geo.x(shown.t)} x2={geo.x(shown.t)} y1={P.t} y2={H - P.b} stroke="#94a3b8" strokeDasharray="3 3" />
            <circle cx={geo.x(shown.t)} cy={geo.y(shown.v)} r="4" fill="white" stroke={color} strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
}

/** Small horizontal bar for 0–100 values (SoC, health). */
export function Meter({ value, max = 100, tone }: { value: number; max?: number; tone?: 'auto' | 'volt' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = tone === 'volt' ? 'bg-volt-600' : pct >= 60 ? 'bg-volt-600' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-cell text-ink-700">{num(value, 0)}</span>
    </div>
  );
}

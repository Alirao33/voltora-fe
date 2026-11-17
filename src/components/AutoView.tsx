'use client';
// Renders any JSON payload sensibly. Several Voltora endpoints return untyped bodies
// (quotes, bookings, rebalancing plans, forecast models…), so this keeps those screens
// readable whatever shape the backend sends.
import type { ReactNode } from 'react';
import { Badge, DataTable } from './ui';
import { dt, isIsoDate, num, pkr, titleize } from '@/lib/format';

const BADGE_KEYS = /(status|state|severity|availability|kind|type|mode|role)$/i;

export function fmtValue(key: string, v: unknown): ReactNode {
  if (v === null || v === undefined || v === '') return <span className="text-ink-600">—</span>;
  if (typeof v === 'boolean') return <Badge value={v} />;
  if (typeof v === 'number') {
    if (/pkr|price|amount|total|cost|revenue|fee/i.test(key)) return <span className="tabular-nums">{pkr(v)}</span>;
    return <span className="tabular-nums">{num(v, 3)}</span>;
  }
  if (typeof v === 'string') {
    if (isIsoDate(v)) return dt(v);
    if (BADGE_KEYS.test(key) && /^[A-Z_]+$/.test(v)) return <Badge value={v} />;
    return v;
  }
  return null;
}

export function AutoView({ data, depth = 0 }: { data: unknown; depth?: number }): ReactNode {
  if (data === null || data === undefined) return <span className="text-sm text-ink-600">No data</span>;
  if (typeof data !== 'object') return <span className="text-sm">{fmtValue('', data)}</span>;

  if (Array.isArray(data)) {
    if (!data.length) return <span className="text-sm text-ink-600">Empty list</span>;
    if (data.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
      const keys = Array.from(new Set(data.flatMap((r) => Object.keys(r as object)))).slice(0, 12);
      return (
        <DataTable<Record<string, unknown>>
          rows={data as Record<string, unknown>[]}
          cols={keys.map((k) => ({
            key: k,
            header: titleize(k),
            render: (r) => {
              const v = r[k];
              if (v && typeof v === 'object') return <span className="font-mono text-xs text-ink-600">{JSON.stringify(v).slice(0, 60)}</span>;
              return fmtValue(k, v);
            },
          }))}
        />
      );
    }
    return <span className="text-sm">{data.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ')}</span>;
  }

  const entries = Object.entries(data as Record<string, unknown>);
  if (!entries.length) return <span className="text-sm text-ink-600">Empty</span>;
  const flat = entries.filter(([, v]) => v === null || typeof v !== 'object');
  const nested = entries.filter(([, v]) => v !== null && typeof v === 'object');

  return (
    <div className="space-y-4">
      {flat.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {flat.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-600">{titleize(k)}</dt>
              <dd className="mt-0.5 break-words text-sm text-ink-900">{fmtValue(k, v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {nested.map(([k, v]) => (
        <div key={k} className={depth > 0 ? 'border-l-2 border-ink-100 pl-4' : 'rounded-lg border border-ink-100 p-4'}>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-600">{titleize(k)}</div>
          {depth > 3 ? <pre className="overflow-x-auto text-xs">{JSON.stringify(v, null, 2)}</pre> : <AutoView data={v} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

export function RawJson({ data }: { data: unknown }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-ink-600 hover:text-ink-800">Raw response</summary>
      <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-line bg-volt-50 p-3 font-mono text-xs leading-relaxed text-ink-800">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

'use client';
import { Guest, stationId, stationName } from '@/lib/endpoints';
import { asList } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { ENUMS, type PaymentMethod, type PlanOut } from '@/lib/types';
import { num, pkr, titleize } from '@/lib/format';
import { Badge, Button, Field, Input, Select } from './ui';

/** Dropdown of stations from the public stations endpoint. */
export function StationSelect({ value, onChange, placeholder = 'Nearest available', lat, lon }: { value: string; onChange: (v: string) => void; placeholder?: string; lat?: number | null; lon?: number | null }) {
  const { data, loading } = useApi(() => Guest.stations({ lat, lon, radius_km: 100 }), [lat, lon]);
  const list = asList(data);
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={loading ? 'Loading stations…' : placeholder}
      options={list.map((s) => ({
        value: stationId(s),
        label: `${stationName(s)}${s.distance_km != null ? ` · ${num(s.distance_km)} km` : ''}${stockOf(s) != null ? ` · ${stockOf(s)} ready` : ''}`,
      }))}
    />
  );
}

/** Best-effort "packs ready" figure from a station payload. */
export function stockOf(s: any): number | null {
  for (const k of ['available_packs', 'charged', 'charged_count', 'available', 'stock', 'ready', 'packs_available', 'available_batteries']) {
    if (typeof s?.[k] === 'number') return s[k];
  }
  return null;
}

export function StationCard({ s, selected, onClick }: { s: any; selected?: boolean; onClick?: () => void }) {
  const stock = stockOf(s);
  const status = s.availability ?? s.status ?? s.occupancy_status;
  const stockKey = Object.keys(s).find((x) => s[x] === stock);
  // Only rider-relevant numbers; hide operator fields like host share or target stock.
  const extras = Object.entries(s).filter(
    ([k, v]) => typeof v === 'number' && k !== stockKey && !/lat|lon|lng|distance|^id$|host|pct|share|target/i.test(k),
  ).slice(0, 3);
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border bg-white p-4 text-left transition hover:border-volt-400 ${selected ? 'border-volt-500 ring-2 ring-volt-500/20' : 'border-ink-200'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-900">{stationName(s)}</div>
          <div className="mt-0.5 truncate text-sm text-ink-500">{s.address || stationId(s)}</div>
        </div>
        {stock != null ? (
          <div className="text-right">
            <div className={`font-mono text-2xl font-semibold tabular-nums ${stock > 2 ? 'text-volt-600' : stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>{stock}</div>
            <div className="text-[10px] uppercase tracking-wide text-ink-400">ready</div>
          </div>
        ) : status ? <Badge value={status} /> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
        {s.distance_km != null && <span>📍 {num(s.distance_km)} km away</span>}
        {extras.map(([k, v]) => (
          <span key={k}>{titleize(k)}: <b className="text-ink-700">{num(v as number)}</b></span>
        ))}
      </div>
    </button>
  );
}

export function PlanCard({ p, onSelect, cta = 'Choose plan' }: { p: PlanOut; onSelect?: () => void; cta?: string }) {
  const highlight = p.kind === 'MONTHLY';
  return (
    <div className={`flex flex-col rounded-2xl border p-6 ${highlight ? 'border-ink-900 bg-ink-950 text-white' : 'border-ink-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-widest ${highlight ? 'text-volt-400' : 'text-volt-700'}`}>{p.kind.replace('_', ' ')}</span>
        {!p.is_active && <Badge value="INACTIVE" />}
      </div>
      <h3 className="mt-2 text-xl font-semibold">{p.name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-mono text-3xl font-semibold tabular-nums">{pkr(p.price_pkr)}</span>
        <span className={highlight ? 'text-ink-400' : 'text-ink-500'}>/ {p.duration_days} days</span>
      </div>
      <ul className={`mt-5 flex-1 space-y-2 text-sm ${highlight ? 'text-ink-300' : 'text-ink-600'}`}>
        <li>⚡ {p.swaps_included ? `${p.swaps_included} swaps included` : 'Pay per swap'}</li>
        <li>🗓 Valid {p.duration_days} days</li>
        <li>🔖 Code <span className="font-mono">{p.code}</span></li>
      </ul>
      {onSelect && (
        <Button className="mt-6 w-full" variant={highlight ? 'primary' : 'dark'} onClick={onSelect}>{cta}</Button>
      )}
    </div>
  );
}

export function PaymentFields({ method, reference, onMethod, onReference }: { method: PaymentMethod | ''; reference: string; onMethod: (m: PaymentMethod) => void; onReference: (r: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Payment method">
        <Select value={method} onChange={(e) => onMethod(e.target.value as PaymentMethod)} options={ENUMS.PaymentMethod.map((m) => ({ value: m, label: m === 'RAAST' ? 'Raast' : m === 'WALLET' ? 'Mobile wallet' : 'Card' }))} />
      </Field>
      <Field label="Payment reference" hint="Transaction ID from your bank or wallet (min 4 chars)">
        <Input value={reference} onChange={(e) => onReference(e.target.value)} placeholder="e.g. RAAST-88213" minLength={4} maxLength={100} />
      </Field>
    </div>
  );
}

/** Rider-side mock checkout: pick a method; the UUID reference is generated per attempt on submit. */
export function MockPaymentFields({ method, decline, onMethod, onDecline, lastReference }: { method: PaymentMethod; decline: boolean; onMethod: (m: PaymentMethod) => void; onDecline: (d: boolean) => void; lastReference?: string | null }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Payment method">
          <Select value={method} onChange={(e) => onMethod(e.target.value as PaymentMethod)} options={ENUMS.PaymentMethod.map((m) => ({ value: m, label: m === 'RAAST' ? 'Raast' : m === 'WALLET' ? 'Mobile wallet' : 'Card' }))} />
        </Field>
        <Field label="Mock gateway outcome" hint="Test mode: no real money moves">
          <Select value={decline ? 'decline' : 'approve'} onChange={(e) => onDecline(e.target.value === 'decline')} options={[{ value: 'approve', label: 'Approve' }, { value: 'decline', label: 'Decline' }]} />
        </Field>
      </div>
      {lastReference && (
        <p className="text-xs text-ink-500">
          Last reference: <code className="break-all font-mono text-ink-700">{lastReference}</code>
        </p>
      )}
    </div>
  );
}

/** OpenStreetMap embed centred on a point. */
export function MiniMap({ lat, lon, className = 'h-64' }: { lat: number; lon: number; className?: string }) {
  const d = 0.01;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`;
  return <iframe title="map" src={src} className={`w-full rounded-xl border border-ink-200 ${className}`} loading="lazy" />;
}

export const latOf = (s: any): number | null => s?.latitude ?? s?.lat ?? null;
export const lonOf = (s: any): number | null => s?.longitude ?? s?.lon ?? s?.lng ?? null;

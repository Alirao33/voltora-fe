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
          <div className="truncate font-medium text-ink-900">{stationName(s)}</div>
          <div className="mt-0.5 truncate text-sm text-ink-600">{s.address || stationId(s)}{typeof s.distance_km === 'number' && <> · <b className="text-ink-800">{s.distance_km < 1 ? `${Math.round(s.distance_km * 1000)} m` : `${s.distance_km.toFixed(1)} km`} away</b></>}</div>
        </div>
        {stock != null ? (
          <div className="text-right">
            <div className={`num text-2xl font-bold ${stock > 2 ? 'text-volt-600' : stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>{stock}</div>
            <div className="text-xs uppercase tracking-wide text-ink-600">ready</div>
          </div>
        ) : status ? <Badge value={status} /> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
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
    <div className={`flex flex-col rounded-2xl border p-6 ${highlight ? 'border-volt-500 bg-white ring-2 ring-volt-500/20' : 'border-line bg-white'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium uppercase tracking-widest ${'text-volt-700'}`}>{p.kind.replace('_', ' ')}</span>
        {!p.is_active && <Badge value="INACTIVE" />}
      </div>
      <h3 className="mt-2 text-xl font-medium">{p.name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="num text-stat">{pkr(p.price_pkr)}</span>
        <span className="text-ink-600">/ {p.duration_days} days</span>
      </div>
      <ul className={`mt-5 flex-1 space-y-2 text-sm text-ink-600`}>
        <li>⚡ {p.swaps_included ? `${p.swaps_included} swaps included` : 'Pay per swap'}</li>
        <li>🗓 Valid {p.duration_days} days</li>
        <li>🔖 Code <span className="font-mono">{p.code}</span></li>
      </ul>
      {onSelect && (
        <Button className="mt-6 w-full" variant={highlight ? 'primary' : 'secondary'} onClick={onSelect}>{cta}</Button>
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
        <p className="text-xs text-ink-600">
          Last reference: <code className="break-all font-mono text-ink-700">{lastReference}</code>
        </p>
      )}
    </div>
  );
}

/** Map embed centred on a point, with English labels (the OpenStreetMap embed shows local-language names). */
export function MiniMap({ lat, lon, className = 'h-64' }: { lat: number; lon: number; className?: string }) {
  const src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&hl=en&output=embed`;
  return <iframe title="map" src={src} className={`w-full rounded-xl border border-ink-200 ${className}`} loading="lazy" />;
}

export const latOf = (s: any): number | null => s?.latitude ?? s?.lat ?? null;
export const lonOf = (s: any): number | null => s?.longitude ?? s?.lon ?? s?.lng ?? null;

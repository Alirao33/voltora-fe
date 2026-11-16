'use client';
import { useState } from 'react';
import { Driver } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { dt, pkr } from '@/lib/format';
import type { VanTaskOut } from '@/lib/types';
import { Badge, Card, Empty, ErrorBox, Loading, Modal, PageHeader, Stat, Tabs } from '@/components/ui';

type Period = 'today' | 'week' | 'all';
const km = (n?: number | null) => (n == null ? '—' : `${n.toFixed(1)} km`);
const nameOf = (t: VanTaskOut) => (t.kind === 'DELIVERY' ? t.customer_name || 'Customer' : `Station ${t.station_id}`);

export default function DriverHistory() {
  const { data, loading, error, reload } = useApi(() => Driver.tasks(true), []);
  const [period, setPeriod] = useState<Period>('today');
  const [open, setOpen] = useState<VanTaskOut | null>(null);

  const since = period === 'today' ? new Date(new Date().setHours(0, 0, 0, 0)).getTime() : period === 'week' ? Date.now() - 7 * 864e5 : 0;
  const done = (data || [])
    .filter((t) => t.status === 'DONE' && (!since || (t.confirmed_at && new Date(t.confirmed_at).getTime() >= since)))
    .sort((a, b) => (b.confirmed_at || '').localeCompare(a.confirmed_at || ''));
  const deliveries = done.filter((t) => t.kind === 'DELIVERY');
  const totalKm = deliveries.reduce((a, t) => a + (t.delivery_km || 0), 0);
  const totalCharge = deliveries.reduce((a, t) => a + (t.delivery_charge_pkr || 0), 0);

  if (loading) return <Loading />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Order history" desc="Your completed deliveries, with distance and charges." />
      <ErrorBox error={error} onRetry={reload} />
      <div className="mb-5"><Tabs value={period} onChange={setPeriod} tabs={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'Last 7 days' }, { value: 'all', label: 'All time' }]} /></div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Deliveries" value={deliveries.length} />
        <Stat label="Distance" value={km(totalKm)} />
        <Stat label="Delivery charges" value={pkr(totalCharge)} tone="good" />
      </div>

      <Card bodyClass="p-0">
        {done.length === 0 && !error ? <div className="p-5"><Empty title="Nothing here yet">Completed deliveries for this period will show up here.</Empty></div> : (
          <ul className="divide-y divide-ink-100">
            {done.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setOpen(t)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-ink-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-ink-900">{nameOf(t)}</span>
                      {t.order_ref && <span className="font-mono text-xs text-ink-400">{t.order_ref}</span>}
                    </div>
                    <div className="truncate text-xs text-ink-500">{t.confirmed_at ? dt(t.confirmed_at) : '—'}{t.kind === 'DELIVERY' && t.address ? ` · ${t.address}` : ''}</div>
                  </div>
                  {t.kind === 'DELIVERY' ? (
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-semibold text-ink-900">{pkr(t.order_total_pkr)}</div>
                      <div className="text-xs text-ink-500">{km(t.delivery_km)}{t.delivery_charge_pkr != null ? ` · +${pkr(t.delivery_charge_pkr)}` : ''}</div>
                    </div>
                  ) : <Badge value={t.kind} />}
                  <span className="text-ink-300">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${nameOf(open)}${open.order_ref ? ` · ${open.order_ref}` : ''}` : ''}>
        {open && (open.kind === 'DELIVERY' ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="col-span-2"><dt className="text-xs text-ink-500">Delivered to</dt><dd className="text-ink-900">{open.address || '—'}</dd></div>
              <div><dt className="text-xs text-ink-500">Completed</dt><dd className="text-ink-900">{open.confirmed_at ? dt(open.confirmed_at) : '—'}</dd></div>
              <div><dt className="text-xs text-ink-500">From station</dt><dd className="text-ink-900">{open.station_label || '—'}</dd></div>
              <div><dt className="text-xs text-ink-500">Distance</dt><dd className="font-medium text-ink-900">{km(open.delivery_km)}</dd></div>
              <div>
                <dt className="text-xs text-ink-500">Delivery charge (Rs 50/km)</dt>
                <dd className="font-mono text-ink-900">{open.delivery_charge_pkr == null ? <span className="font-sans text-xs text-ink-500">Not billed (placed before the per-km charge)</span> : pkr(open.delivery_charge_pkr)}</dd>
              </div>
              <div><dt className="text-xs text-ink-500">Order total</dt><dd className="font-mono font-semibold text-ink-900">{pkr(open.order_total_pkr)}</dd></div>
              <div><dt className="text-xs text-ink-500">Payment</dt><dd className="text-ink-900">{open.payment_note || '—'}</dd></div>
            </dl>
            {open.latitude != null && open.longitude != null && (
              <a className="inline-block text-sm font-medium text-volt-700 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${open.latitude},${open.longitude}`}>Open delivery location</a>
            )}
          </div>
        ) : <p className="text-sm text-ink-600">{open.confirmed_drop ?? 0} dropped · {open.confirmed_pickup ?? 0} picked up at {open.address || open.station_id}.</p>)}
      </Modal>
    </div>
  );
}

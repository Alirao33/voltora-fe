'use client';
import { Driver } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { dt } from '@/lib/format';
import { Badge, Card, ErrorBox, Loading, PageHeader } from '@/components/ui';

export default function DriverHistory() {
  const { data, loading, error, reload } = useApi(() => Driver.tasks(true), []);
  const done = (data || []).filter((t) => t.status === 'DONE');

  if (loading) return <Loading />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Order history" desc="Deliveries and stops you have completed." />
      <ErrorBox error={error} onRetry={reload} />
      <div className="space-y-4">
        {done.length === 0 && !error && <Card><p className="text-sm text-ink-500">No completed orders yet.</p></Card>}
        {done.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge value={t.kind} />
                <h3 className="mt-2 text-lg font-semibold text-ink-900">{t.kind === 'DELIVERY' ? t.customer_name || 'Customer' : `Station ${t.station_id}`}</h3>
                <p className="text-sm text-ink-500">{t.address || t.station_id || '—'}</p>
                <p className="text-xs text-ink-500">Completed {t.confirmed_at ? dt(t.confirmed_at) : '—'}</p>
              </div>
              {t.order_ref && <span className="font-mono text-xs text-ink-500">{t.order_ref}</span>}
            </div>
            {t.kind === 'DELIVERY' && t.latitude != null && t.longitude != null && (
              <a className="mt-3 inline-block text-sm font-medium text-volt-700 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}>
                Delivery location
              </a>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

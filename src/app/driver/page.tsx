'use client';
import { useState } from 'react';
import { Driver } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import type { VanTaskOut } from '@/lib/types';
import { MiniMap } from '@/components/domain';
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader } from '@/components/ui';

export default function DriverHome() {
  const van = useApi(() => Driver.me(), []);
  const tasks = useApi(() => Driver.tasks(), []);
  const act = useAction();
  const [active, setActive] = useState<VanTaskOut | null>(null);
  const [otp, setOtp] = useState('');

  const reload = () => { van.reload(); tasks.reload(); };

  const handover = async () => {
    if (!active) return;
    const r = await act.run(() => Driver.confirm(active.id, { delivery_otp: otp.trim() }), 'Delivery completed. Order closed.');
    if (r) {
      setActive(null);
      setOtp('');
      tasks.reload();
    }
  };

  if (van.loading || tasks.loading) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My route" desc={van.data ? `Van ${van.data.name}` : 'Your assigned deliveries and rebalancing stops.'} />
      <ErrorBox error={van.error || tasks.error} onRetry={reload} />

      <div className="space-y-4">
        {(tasks.data || []).length === 0 && !tasks.error && (
          <Card><p className="text-sm text-ink-500">No tasks assigned right now. New home deliveries appear here once an admin approves them.</p></Card>
        )}

        {(tasks.data || []).map((t) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge value={t.kind} />
                <h3 className="mt-2 text-lg font-semibold text-ink-900">
                  {t.kind === 'DELIVERY' ? t.customer_name || 'Customer' : `Station ${t.station_id}`}
                </h3>
                <p className="text-sm text-ink-500">{t.address || t.station_id || '—'}</p>
                {t.customer_phone && <p className="text-sm text-ink-500">Phone: {t.customer_phone}</p>}
              </div>
              {t.order_ref && <span className="font-mono text-xs text-ink-500">{t.order_ref}</span>}
            </div>
            {t.latitude != null && t.longitude != null && (
              <div className="mt-3 space-y-2">
                <MiniMap lat={t.latitude} lon={t.longitude} className="h-48" />
                <a className="text-sm font-medium text-volt-700 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}>
                  Open rider location in Google Maps
                </a>
              </div>
            )}
            <p className="mt-3 text-xs text-ink-500">Payment is already settled online. You cannot change the amount.</p>
            {t.kind === 'DELIVERY' ? (
              <Button className="mt-4 w-full" onClick={() => { setOtp(''); setActive(t); }}>Verify delivery OTP & hand over</Button>
            ) : (
              <Button className="mt-4 w-full" variant="secondary" loading={act.busy} onClick={async () => { if (await act.run(() => Driver.confirm(t.id, {}), 'Stop confirmed')) tasks.reload(); }}>
                Confirm stop ({t.drop_count} drop / {t.pickup_count} pickup)
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Modal
        open={!!active}
        onClose={() => !act.busy && setActive(null)}
        title="Confirm customer handover"
        footer={
          <>
            <Button variant="ghost" disabled={act.busy} onClick={() => setActive(null)}>Cancel</Button>
            <Button loading={act.busy} disabled={otp.trim().length < 3} onClick={handover}>Verify & hand over</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-600">Ask {active?.customer_name || 'the customer'} for the delivery OTP shown on their order page.</p>
          <Field label="Delivery OTP">
            <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={8} className="font-mono tracking-widest" placeholder="e.g. 4829" inputMode="numeric" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

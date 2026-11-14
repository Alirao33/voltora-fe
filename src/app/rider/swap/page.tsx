'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Rider } from '@/lib/endpoints';
import { useAction, useForm } from '@/lib/hooks';
import { type OrderMode, type PaymentMethod } from '@/lib/types';
import { authorizeOrThrow, maybePaidHint, newPaymentReference, shouldRotateReference } from '@/lib/mockGateway';
import { cx, getPosition, localToIso, toNum } from '@/lib/format';
import { MockPaymentFields, StationSelect } from '@/components/domain';
import { Button, Card, Checkbox, Field, Input, PageHeader, Textarea } from '@/components/ui';
import { useToast } from '@/components/Toast';

const MODES: { v: OrderMode; t: string; d: string }[] = [
  { v: 'STATION', t: 'At a station', d: 'Walk up to any open slot' },
  { v: 'LOCKER', t: 'Reserved locker', d: 'Your own locker door, held for you' },
  { v: 'HOME', t: 'Home delivery', d: 'A van brings a pack to you' },
];

export default function NewSwap() {
  const router = useRouter();
  const toast = useToast();
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [lastRef, setLastRef] = useState<string | null>(null);
  const refId = useRef<string | null>(null); // one reference per checkout
  const f = useForm({
    mode: 'STATION' as OrderMode,
    station_id: '',
    locker_id: '',
    use_subscription: true,
    capacity_used_ah: '',
    payment_method: 'RAAST' as PaymentMethod,
    mock_decline: false,
    scheduled_time: '',
    delivery_address: '',
  });
  const { run, busy } = useAction();
  const v = f.values;

  const locate = () => getPosition().then((p) => { setPos(p); toast.success('Location attached'); }).catch((e) => toast.error(e.message));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v.mode === 'HOME' && !v.delivery_address && !pos) return toast.error('Add a delivery address or attach your location');
    const o = await run(
      async () => {
        try {
          let reference: string | null = null;
          if (!v.use_subscription) {
            refId.current ??= newPaymentReference();
            setLastRef(refId.current);
            reference = (await authorizeOrThrow({ reference: refId.current, method: v.payment_method, outcome: v.mock_decline ? 'decline' : 'approve' })).reference;
          }
          return await Rider.createOrder({
            station_id: v.station_id || null,
            latitude: pos?.lat ?? null,
            longitude: pos?.lon ?? null,
            mode: v.mode,
            use_subscription: v.use_subscription,
            capacity_used_ah: toNum(v.capacity_used_ah),
            payment_method: v.use_subscription ? null : v.payment_method,
            payment_reference: reference,
            scheduled_time: localToIso(v.scheduled_time),
            locker_id: v.mode === 'LOCKER' ? v.locker_id || null : null,
            delivery_address: v.mode === 'HOME' ? v.delivery_address || null : null,
            delivery_lat: v.mode === 'HOME' ? pos?.lat ?? null : null,
            delivery_lon: v.mode === 'HOME' ? pos?.lon ?? null : null,
          });
        } catch (err: any) {
          if (shouldRotateReference(err)) refId.current = null;
          throw Object.assign(err, { message: err.message + maybePaidHint(err) });
        }
      },
      (r) => `Order ${r.order_id} created`,
    );
    if (o) refId.current = null;
    if (o) router.push(`/rider/orders/${o.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New swap" desc="Reserve a charged pack. You'll get a pickup code once it's held for you." />
      <form onSubmit={submit} className="space-y-6">
        <Card title="How do you want it?">
          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                type="button"
                key={m.v}
                onClick={() => f.set('mode', m.v)}
                className={cx('rounded-xl border p-4 text-left transition', v.mode === m.v ? 'border-volt-500 bg-volt-50 ring-2 ring-volt-500/20' : 'border-ink-200 hover:border-ink-300')}
              >
                <div className="font-medium text-ink-900">{m.t}</div>
                <div className="mt-1 text-xs text-ink-500">{m.d}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Station" className="sm:col-span-2" hint={pos ? `Using your location (${pos.lat}, ${pos.lon})` : 'Leave empty and attach your location to auto-pick the nearest'}>
              <div className="flex gap-2">
                <StationSelect value={v.station_id} onChange={(x) => f.set('station_id', x)} lat={pos?.lat} lon={pos?.lon} />
                <Button type="button" variant="secondary" onClick={locate}>📍</Button>
              </div>
            </Field>
            {v.mode === 'LOCKER' && <Field label="Locker ID (optional)"><Input {...f.bind('locker_id')} placeholder="Any free locker" /></Field>}
            {v.mode === 'HOME' && (
              <Field label="Delivery address" className="sm:col-span-2"><Textarea {...f.bind('delivery_address')} maxLength={300} placeholder="House, street, area, landmark" /></Field>
            )}
            <Field label="Capacity used (Ah, optional)" hint="Defaults to 80% of the issued pack"><Input type="number" step="0.1" min={0.1} max={200} {...f.bind('capacity_used_ah')} /></Field>
            <Field label="Schedule for (optional)"><Input type="datetime-local" {...f.bind('scheduled_time')} /></Field>
          </div>
        </Card>

        <Card title="Payment">
          <Checkbox label="Use a swap from my subscription" {...f.check('use_subscription')} />
          {!v.use_subscription && (
            <div className="mt-4">
              <MockPaymentFields method={v.payment_method} decline={v.mock_decline} onMethod={(m) => f.set('payment_method', m)} onDecline={(d) => f.set('mock_decline', d)} lastReference={lastRef} />
              <p className="mt-2 text-xs text-ink-500">A fresh payment reference (UUID) is generated each time you submit. Final price is settled after the swap based on actual energy used.</p>
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" size="lg" loading={busy}>Reserve battery</Button>
        </div>
      </form>
    </div>
  );
}

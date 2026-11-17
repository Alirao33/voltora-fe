'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Rider } from '@/lib/endpoints';
import { useAction, useForm } from '@/lib/hooks';
import { type OrderMode, type PaymentMethod } from '@/lib/types';
import { authorizeOrThrow, maybePaidHint, newPaymentReference, shouldRotateReference } from '@/lib/mockGateway';
import { cx, getPosition, localToIso } from '@/lib/format';
import { MiniMap, StationSelect } from '@/components/domain';
import { Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/Toast';

const MODES: { v: OrderMode; t: string; d: string }[] = [
  { v: 'STATION', t: 'At a station', d: 'Walk up to any open slot' },
  { v: 'LOCKER', t: 'Reserved locker', d: 'Your own locker door, held for you' },
  { v: 'HOME', t: 'Home delivery', d: 'A van brings a pack to you' },
];

// Standard e-bike pack sizes (volts, amp-hours). 48V 15Ah is the most common.
const SIZES = [
  { v: 36, ah: 10 }, { v: 36, ah: 15 }, { v: 48, ah: 10 }, { v: 48, ah: 15 }, { v: 48, ah: 20 }, { v: 52, ah: 20 },
];
const CUSTOM = 'custom';
const USED_FRACTION = 0.8; // matches the backend default

export function SwapForm({ homeOnly = false }: { homeOnly?: boolean }) {
  const modes = MODES.filter((m) => (m.v === 'HOME') === homeOnly); // deliveries have their own page
  const router = useRouter();
  const [gate, setGate] = useState(false);
  const [payLater, setPayLater] = useState(false);
  const [sub, setSub] = useState<{ ends_at: string } | null>(null);
  const [size, setSize] = useState('');
  const [customAh, setCustomAh] = useState('');
  const toast = useToast();
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [lastRef, setLastRef] = useState<string | null>(null);
  const refId = useRef<string | null>(null); // one reference per checkout
  const f = useForm({
    mode: (homeOnly ? 'HOME' : 'STATION') as OrderMode,
    station_id: '',
    locker_id: '',
    use_subscription: true,
    payment_method: 'RAAST' as PaymentMethod,
    mock_decline: false,
    scheduled_time: '',
    delivery_address: '',
  });
  const { run, busy } = useAction();
  const v = f.values;

  useEffect(() => {
    Rider.subscription().then((s) => setSub(s || null)).catch(() => {});
  }, []);
  // Pay-later bills fall due 2 days after the locker pass ends.
  const dueDate = sub ? new Date(new Date(sub.ends_at).getTime() + 2 * 864e5).toLocaleDateString('en-PK') : '';

  const locate = () => getPosition().then((p) => {
    setPos(p);
    toast.success('Location attached');
    // Fill the address from the pin when the rider has not typed one.
    if (v.mode === 'HOME' && !v.delivery_address.trim()) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=${p.lat}&lon=${p.lon}`).then((r) => r.json()).then((j) => j?.display_name && f.set('delivery_address', String(j.display_name).slice(0, 300))).catch(() => {});
    }
  }).catch((e) => toast.error(e.message));

  // Put the typed address on the map.
  const findOnMap = async () => {
    const q = v.delivery_address.trim();
    if (!q) return toast.error('Type your address first');
    try {
      const j = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&accept-language=en&limit=1&countrycodes=pk&q=${encodeURIComponent(q)}`)).json();
      if (!j?.[0]) return toast.error('We could not find that address on the map. Add the area or landmark.');
      setPos({ lat: Number(Number(j[0].lat).toFixed(6)), lon: Number(Number(j[0].lon).toFixed(6)) });
      toast.success('Address found on the map');
    } catch {
      toast.error('Map search is unavailable right now. Use your current location instead.');
    }
  };

  // Step 1: validate, then open the payment gateway (bill ID + pay now / pay later).
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v.mode === 'HOME' && !v.delivery_address.trim()) return toast.error('Enter your delivery address');
    if (size === CUSTOM && !(Number(customAh) > 0)) return toast.error('Enter your custom battery capacity in Ah');
    // The rider must choose where: a station, or an attached location (always for home delivery).
    if (v.mode === 'HOME' && !pos) return toast.error('Select your delivery location first');
    if (!v.station_id && !pos) return toast.error('Select a station or attach your location before ordering');
    refId.current ??= newPaymentReference();
    setLastRef(refId.current);
    setPayLater(false);
    setGate(true);
  };

  // Step 2: pay now (gateway authorises first) or reserve and pay the bill later.
  const confirmGate = async () => {
    const packAh = size === CUSTOM ? Number(customAh) : size ? Number(size.split('-')[1]) : 0;
    const capacityUsed = packAh ? Math.round(packAh * USED_FRACTION * 100) / 100 : null;
    const o = await run(
      async () => {
        try {
          let reference: string | null = null;
          if (!payLater) {
            refId.current ??= newPaymentReference();
            reference = (await authorizeOrThrow({ reference: refId.current, method: v.payment_method, outcome: 'approve' })).reference;
          }
          return await Rider.createOrder({
            station_id: v.station_id || null,
            latitude: pos?.lat ?? null,
            longitude: pos?.lon ?? null,
            mode: v.mode,
            use_subscription: false,
            pay_later: payLater,
            capacity_used_ah: capacityUsed,
            payment_method: payLater ? null : v.payment_method,
            payment_reference: reference,
            scheduled_time: v.mode === 'HOME' ? localToIso(v.scheduled_time) : null, // only deliveries can be scheduled
            locker_id: null, // the locker is allocated automatically
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
    if (o) {
      refId.current = null;
      router.push(`/rider/orders/${o.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={homeOnly ? 'Home delivery' : 'New swap'} desc={homeOnly ? 'A van brings a charged pack to your door. The admin approves it, then a delivery man is assigned.' : "Reserve a charged pack. You'll get a pickup code once it's held for you."} />
      <form onSubmit={submit} className="space-y-6">
        {!homeOnly && (
        <Card title="How do you want it?">
          <div className="grid gap-3 sm:grid-cols-2">
            {modes.map((m) => (
              <button
                type="button"
                key={m.v}
                onClick={() => f.set('mode', m.v)}
                className={cx('rounded-xl border p-4 text-left transition', v.mode === m.v ? 'border-volt-500 bg-volt-50 ring-2 ring-volt-500/20' : 'border-ink-200 hover:border-ink-300')}
              >
                <div className="font-medium text-ink-900">{m.t}</div>
                <div className="mt-1 text-xs text-ink-600">{m.d}</div>
              </button>
            ))}
          </div>
        </Card>
        )}

        <Card title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Station" className="sm:col-span-2" hint={pos ? `Using your location (${pos.lat}, ${pos.lon})` : 'Leave empty and attach your location to auto-pick the nearest'}>
              <div className="flex gap-2">
                <StationSelect value={v.station_id} onChange={(x) => f.set('station_id', x)} lat={pos?.lat} lon={pos?.lon} />
                <Button type="button" variant="secondary" onClick={locate}>📍</Button>
              </div>
            </Field>
            {v.mode === 'HOME' && (
              <Field label="Delivery location (required)" className="sm:col-span-2" hint={pos ? `Pinned at ${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}` : 'Tap to use your current location. The delivery man sees this pin.'}>
                <div className="space-y-3">
                  <Button type="button" variant="secondary" onClick={locate}>📍 {pos ? 'Update my location' : 'Use my current location'}</Button>
                  {pos && <MiniMap lat={pos.lat} lon={pos.lon} className="h-64" />}
                </div>
              </Field>
            )}
            {v.mode === 'HOME' && (
              <Field label="Delivery address" className="sm:col-span-2" hint="Type your address and find it on the map, or use your current location above.">
                <div className="space-y-2">
                  <Textarea {...f.bind('delivery_address')} maxLength={300} placeholder="House, street, area, landmark" />
                  <Button type="button" variant="secondary" onClick={findOnMap}>🗺️ Find on map</Button>
                </div>
              </Field>
            )}
            <Field label="Battery size" hint="Standard e-bike packs. Used to estimate the energy you will use (80% of the pack).">
              <Select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                options={[
                  { value: '', label: 'Auto (issued pack)' },
                  ...SIZES.map((s) => ({ value: `${s.v}-${s.ah}`, label: `${s.v}V ${s.ah}Ah (${s.v * s.ah} Wh)` })),
                  { value: CUSTOM, label: 'Custom size…' },
                ]}
              />
            </Field>
            {size === CUSTOM && (
              <Field label="Custom pack capacity (Ah)" hint="Enter your bike's battery capacity">
                <Input type="number" step="0.1" min={0.1} max={250} value={customAh} onChange={(e) => setCustomAh(e.target.value)} />
              </Field>
            )}
            {v.mode === 'HOME' && <Field label="Deliver at (optional)" hint="Schedule the delivery for later"><Input type="datetime-local" {...f.bind('scheduled_time')} /></Field>}
          </div>
        </Card>

        <p className="text-xs text-ink-600">
          The swap price depends on the battery's state of health and charge. Return your pack in the same SoH and get 10% off the whole bill.{homeOnly && ' Delivery adds Rs 50 for every km from the station to your address.'} You'll get a bill ID and choose how to pay on the next step.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" size="lg">Reserve battery</Button>
        </div>
      </form>

      <Modal
        open={gate}
        onClose={() => !busy && setGate(false)}
        title="Payment gateway"
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setGate(false)}>Back</Button>
            <Button loading={busy} onClick={confirmGate}>{payLater ? 'Reserve & pay later' : 'Pay now'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="text-xs text-ink-600">Bill ID</div>
            <code className="break-all font-mono text-sm text-volt-700">{lastRef}</code>
          </div>
          {sub && (
            <div className="grid grid-cols-2 gap-2">
              {[{ later: false, t: 'Pay now' }, { later: true, t: 'Pay later' }].map((o) => (
                <button
                  type="button"
                  key={o.t}
                  onClick={() => setPayLater(o.later)}
                  className={cx('rounded-xl border p-3 text-sm font-medium', payLater === o.later ? 'border-volt-500 bg-volt-50 ring-2 ring-volt-500/20' : 'border-ink-200 hover:border-ink-300')}
                >
                  {o.t}
                </button>
              ))}
            </div>
          )}
          {payLater ? (
            <p className="text-sm text-ink-600">
              Your bill is due by <b>{dueDate}</b> (2 days after your pass ends). After that a 5% penalty is added to the actual amount.
            </p>
          ) : (
            <Field label="Payment method">
              <Select
                value={v.payment_method}
                onChange={(e) => f.set('payment_method', e.target.value as PaymentMethod)}
                options={[{ value: 'RAAST', label: 'Raast' }, { value: 'WALLET', label: 'Mobile wallet' }, { value: 'CARD', label: 'Card' }]}
              />
            </Field>
          )}
          {!sub && <p className="text-xs text-ink-600">Payment is required immediately. Subscribed riders can pay later.</p>}
        </div>
      </Modal>
    </div>
  );
}

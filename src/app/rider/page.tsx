'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Rider } from '@/lib/endpoints';
import { useAction, useApi, useRecentBookings } from '@/lib/hooks';
import { dt, getPosition, localToIso } from '@/lib/format';
import { useAuth } from '@/components/AuthProvider';
import { AutoView, RawJson } from '@/components/AutoView';
import { OrdersTable } from '@/components/OrdersTable';
import { Badge, Button, Card, Checkbox, ErrorBox, Field, Input, Loading, Stat } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function RiderHome() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const sub = useApi(() => Rider.subscription(), []);
  const orders = useApi(() => Rider.orders(5), []);
  const { add } = useRecentBookings();
  const smart = useAction();
  const [maxKm, setMaxKm] = useState(10);
  const [autoBook, setAutoBook] = useState(true);
  const [when, setWhen] = useState('');
  const [result, setResult] = useState<any>(null);

  const active = orders.data?.find((o) => ['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS'].includes(o.status));
  const s = sub.data && typeof sub.data === 'object' ? (sub.data.subscription ?? sub.data) : null;
  const hasSub = s && (s.status || s.swaps_remaining != null);

  const doSmartSwap = async () => {
    let pos;
    try { pos = await getPosition(); } catch (e: any) { return toast.error(e.message); }
    const r = await smart.run(
      () => Rider.smartSwap({ latitude: pos.lat, longitude: pos.lon, max_distance_km: maxKm, auto_book: autoBook, scheduled_time: localToIso(when) }),
      'Smart Swap found a locker for you',
    );
    if (r) {
      setResult(r);
      const bid = r.booking_id ?? r.booking?.booking_id ?? r.booking?.id;
      if (bid) add(String(bid));
    }
  };

  const bookingId = result && (result.booking_id ?? result.booking?.booking_id ?? result.booking?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hi {user?.full_name?.split(' ')[0] || user?.username || 'rider'} 👋</h1>
        <p className="text-sm text-ink-500">Ready for a fresh battery?</p>
      </div>

      {active && (
        <Link href={`/rider/orders/${active.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-volt-300 bg-volt-50 p-4 hover:bg-volt-100">
          <div>
            <div className="text-sm font-semibold text-volt-900">Swap in progress · {active.order_id}</div>
            <div className="text-xs text-volt-800">
              {active.pickup_code && <>Pickup code <b className="font-mono">{active.pickup_code}</b> · </>}
              {active.hold_expires_at && <>hold expires {dt(active.hold_expires_at)}</>}
            </div>
          </div>
          <Badge value={active.status} />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Swaps left" value={hasSub ? s.swaps_remaining ?? '—' : '—'} sub={hasSub ? `Plan ends ${dt(s.ends_at, { dateOnly: true })}` : 'No active plan'} tone={hasSub ? 'good' : undefined} />
        <Stat label="Points" value={user?.points ?? 0} sub={user?.is_vip ? 'VIP member' : 'Earn points on every swap'} />
        <Stat label="Orders" value={orders.data?.length ?? '—'} sub="Most recent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card title="⚡ Smart Swap" subtitle="We'll pick the nearest station with charged packs and reserve a locker.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Max distance (km)"><Input type="number" min={1} max={100} value={maxKm} onChange={(e) => setMaxKm(+e.target.value)} /></Field>
            <Field label="Arrive at (optional)"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Checkbox label="Book the locker automatically" checked={autoBook} onChange={(e) => setAutoBook(e.target.checked)} />
            <Button onClick={doSmartSwap} loading={smart.busy}>Find me a battery</Button>
          </div>
          {result && (
            <div className="mt-5 rounded-lg border border-ink-100 p-4">
              <AutoView data={result} />
              <RawJson data={result} />
              {bookingId && <Button className="mt-4" variant="dark" onClick={() => router.push(`/rider/bookings/${bookingId}`)}>Open booking</Button>}
            </div>
          )}
        </Card>

        <Card title="Subscription" actions={<Link href="/rider/plans" className="text-sm font-medium text-volt-700">{hasSub ? 'Change' : 'Browse plans'}</Link>}>
          {sub.loading ? <Loading /> : sub.error ? <ErrorBox error={sub.error} onRetry={sub.reload} /> : hasSub ? <AutoView data={s} /> : (
            <div className="py-6 text-center text-sm text-ink-500">
              You're paying per swap. <Link href="/rider/plans" className="font-medium text-volt-700">Save with a plan →</Link>
            </div>
          )}
        </Card>
      </div>

      <Card title="Recent orders" actions={<Link href="/rider/orders" className="text-sm font-medium text-volt-700">View all</Link>}>
        {orders.loading ? <Loading /> : <><ErrorBox error={orders.error} /><OrdersTable rows={orders.data || []} onOpen={(o) => router.push(`/rider/orders/${o.id}`)} /></>}
      </Card>
    </div>
  );
}

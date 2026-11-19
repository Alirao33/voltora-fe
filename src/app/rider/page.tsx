'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Rider } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { useEffect, useState } from 'react';
import { dt, ddmmyy, pkr } from '@/lib/format';
import { useAuth } from '@/components/AuthProvider';
import { OrdersTable } from '@/components/OrdersTable';
import { Badge, Card, ErrorBox, Loading, Modal, PageHeader, Stat } from '@/components/ui';

export default function RiderHome() {
  const { user } = useAuth();
  const router = useRouter();
  const pass = useApi(() => Rider.lockerPass(), []);
  const orders = useApi(() => Rider.orders(5), []);

  const summary = useApi(() => Rider.summary(), []);
  const [alertOpen, setAlertOpen] = useState(false);
  const alert = summary.data?.plan_alert;
  // Opens once per login session when the plan is close to ending.
  useEffect(() => {
    if (!alert) return;
    try {
      const key = `voltora.planAlert.${alert.ends_at}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    setAlertOpen(true);
  }, [alert]);
  const held = summary.data?.held_pack;
  const bills = summary.data?.unpaid_bills || [];

  const active = orders.data?.find((o) => ['PENDING_PAYMENT', 'AWAITING_APPROVAL', 'PAID', 'IN_PROGRESS'].includes(o.status));
  const cur = pass.data?.current;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi ${user?.full_name?.split(' ')[0] || user?.username || 'rider'} 👋`}
        desc="Ready for a fresh battery?"
        actions={!active && (
          <>
            <Link href="/rider/swap" className="rounded-xl bg-white px-5 py-3 text-base font-semibold text-volt-900 hover:bg-volt-100">Start a swap</Link>
            <Link href="/stations" className="rounded-xl border border-white/60 px-5 py-3 text-base font-semibold text-white hover:bg-white/10">Find a station</Link>
          </>
        )}
      />

      <Card title="Your battery pack">
        {summary.loading ? <Loading /> : held ? (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-5xl font-extrabold tracking-tight text-ink-900">{held.id}</div>
              <div className="mt-2 flex items-center gap-2"><Badge value={held.state} /><span className="text-sm text-ink-600">SoH {Math.round(held.soh)}%</span></div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-volt-700">{Math.round(held.soc)}%</div>
              <div className="text-sm text-ink-600">charge (live)</div>
            </div>
          </div>
        ) : <div className="py-4 text-sm text-ink-600">You are not holding a pack. Start a swap to get one.</div>}
      </Card>

      {bills.length > 0 && (
        <div className="space-y-2">
          {bills.map((b) => (
            <Link key={b.order_id} href={`/rider/orders/${b.order_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 hover:bg-red-100">
              <div className="text-sm"><b className="text-red-700">{b.ref} unpaid: {pkr(b.due_pkr)}</b><div className="font-semibold text-red-600">Pay Now · Due Date: {ddmmyy(b.due_at)}</div></div>
              <span className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Pay Now</span>
            </Link>
          ))}
        </div>
      )}

      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} title="Your plan is ending soon" footer={
        <>
          <button onClick={() => setAlertOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100">Later</button>
          <Link href="/rider/plans" onClick={() => setAlertOpen(false)} className="rounded-lg bg-volt-500 px-4 py-2 text-sm font-medium text-volt-950 hover:bg-volt-600">Pay Now</Link>
        </>
      }>
        {alert && <p className="text-sm text-ink-700"><b>{alert.plan_name}</b> ends on <b>{ddmmyy(alert.ends_at)}</b> ({Math.ceil(alert.days_left)} day{Math.ceil(alert.days_left) === 1 ? '' : 's'} left). Pay Now to keep your locker pass. Cancellations do not give a refund.</p>}
      </Modal>

      {active && (
        <Link href={`/rider/orders/${active.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-volt-300 bg-volt-50 p-4 hover:bg-volt-100">
          <div>
            <div className="text-sm font-medium text-volt-900">Swap in progress · {active.order_id}</div>
            <div className="text-xs text-volt-800">
              {active.pickup_code && <>Pickup code <b className="font-mono">{active.pickup_code}</b> · </>}
              {active.hold_expires_at && <>hold expires {dt(active.hold_expires_at)}</>}
            </div>
          </div>
          <Badge value={active.status} />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Points" value={user?.points ?? 0} sub={user?.is_vip ? 'VIP member' : 'Earn points on every swap'} />
        <Stat label="Orders" value={orders.data?.length ?? '—'} sub="Most recent" />
      </div>

      <Card title="Subscription" actions={<Link href="/rider/plans" className="text-sm font-medium text-volt-700">{cur ? 'View plans' : 'Browse plans'}</Link>}>
        {pass.loading ? <Loading /> : pass.error ? <ErrorBox error={pass.error} onRetry={pass.reload} /> : cur ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-lg font-medium text-ink-900">{cur.plan_name}</div>
              <div className="text-sm text-ink-600">Active until {dt(cur.ends_at, { dateOnly: true })}</div>
            </div>
            {cur.locker_id ? (
              <div className="text-right text-sm text-ink-600">Locker <b className="font-mono text-ink-900">{cur.locker_id}</b><div className="text-xs text-ink-600">{cur.station_name}</div></div>
            ) : (
              <Link href="/rider/bookings" className="rounded-lg bg-volt-500 px-4 py-2 text-sm font-medium text-volt-950 hover:bg-volt-600">Set your station</Link>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-ink-600">
            No active plan. <Link href="/rider/plans" className="font-medium text-volt-700">Click here to subscribe to a plan →</Link>
          </div>
        )}
      </Card>

      <Card title="Recent orders" actions={<Link href="/rider/orders" className="text-sm font-medium text-volt-700">View all</Link>}>
        {orders.loading ? <Loading /> : !orders.error && (orders.data?.length ?? 0) === 0 ? (
          <div className="py-6 text-center text-sm text-ink-600">No orders yet. <Link href="/rider/swap" className="font-medium text-volt-700">Start your first swap →</Link></div>
        ) : <><ErrorBox error={orders.error} /><OrdersTable rows={orders.data || []} onOpen={(o) => router.push(`/rider/orders/${o.id}`)} /></>}
      </Card>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Rider } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { dt } from '@/lib/format';
import { useAuth } from '@/components/AuthProvider';
import { OrdersTable } from '@/components/OrdersTable';
import { Badge, Card, ErrorBox, Loading, PageHeader, Stat } from '@/components/ui';

export default function RiderHome() {
  const { user } = useAuth();
  const router = useRouter();
  const pass = useApi(() => Rider.lockerPass(), []);
  const orders = useApi(() => Rider.orders(5), []);

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

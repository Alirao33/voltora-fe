'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Admin } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { ENUMS, type OrderOut } from '@/lib/types';
import { dt, pkr } from '@/lib/format';
import { AutoView } from '@/components/AutoView';
import { OrdersTable } from '@/components/OrdersTable';
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Stat, Toolbar } from '@/components/ui';

function OrdersInner() {
  const sp = useSearchParams();
  const [status, setStatus] = useState('');
  const [station, setStation] = useState('');
  const [userId, setUserId] = useState('');
  const [limit, setLimit] = useState(100);
  const { data, loading, error, reload } = useApi(() => Admin.orders({ status, station_id: station, user_id: userId, limit }), [status, station, userId, limit]);
  const [open, setOpen] = useState<OrderOut | null>(null);

  useEffect(() => {
    const f = sp.get('focus');
    if (f && data) setOpen(data.find((o) => String(o.id) === f) || null);
  }, [sp, data]);

  const [reviewing, setReviewing] = useState(false);
  const review = async (action: 'APPROVE' | 'REJECT') => {
    if (!open) return;
    setReviewing(true);
    try {
      await Admin.reviewOrder(open.id, action);
      setOpen(null);
      reload();
    } catch (e: any) {
      window.alert(e?.message || 'Could not review the order');
    } finally {
      setReviewing(false);
    }
  };

  const rows = data || [];
  const revenue = rows.filter((o) => o.status === 'COMPLETED').reduce((a, o) => a + (o.charged_pkr || 0), 0);

  return (
    <>
      <PageHeader title="Orders" desc="Every swap across the network." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Orders shown" value={rows.length} />
        <Stat label="Completed" value={rows.filter((o) => o.status === 'COMPLETED').length} tone="good" />
        <Stat label="In flight" value={rows.filter((o) => ['PAID', 'IN_PROGRESS', 'PENDING_PAYMENT', 'AWAITING_APPROVAL'].includes(o.status)).length} tone="warn" />
        <Stat label="Charged (completed)" value={pkr(revenue)} />
      </div>
      <Card>
        <Toolbar>
          <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All" options={ENUMS.OrderStatus} /></Field>
          <Field label="Station"><Input value={station} onChange={(e) => setStation(e.target.value)} placeholder="Station ID" className="w-36" /></Field>
          <Field label="User ID"><Input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-28" /></Field>
          <Field label="Limit"><Select value={String(limit)} onChange={(e) => setLimit(+e.target.value)} options={['50', '100', '250', '500'].map((x) => ({ value: x, label: x }))} /></Field>
          <Button variant="ghost" onClick={reload}>Refresh</Button>
        </Toolbar>
        <ErrorBox error={error} onRetry={reload} />
        {loading ? <Loading /> : <OrdersTable rows={rows} onOpen={setOpen} showUser />}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={<span className="flex items-center gap-2"><span className="font-mono">{open?.order_id}</span> {open && <Badge value={open.status} />}</span>} wide>
        {open && (
          <div className="space-y-5">
            <p className="text-sm text-ink-500">Created {dt(open.created_at)}{open.completed_at && <> · completed {dt(open.completed_at)}</>}</p>
            {open.driver_name && (
              <p className="text-sm text-ink-700">Delivery driver: <b>{open.driver_name}</b>{open.van_name ? ` · ${open.van_name}` : ''}</p>
            )}
            {open.status === 'AWAITING_APPROVAL' && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <span className="text-sm text-amber-900">Home delivery waiting for approval. Approving dispatches the nearest van.</span>
                <div className="flex gap-2">
                  <Button variant="danger" loading={reviewing} onClick={() => review('REJECT')}>Reject</Button>
                  <Button loading={reviewing} onClick={() => review('APPROVE')}>Approve</Button>
                </div>
              </div>
            )}
            <AutoView data={{ ...open, price: undefined }} />
            <div className="rounded-lg border border-ink-100 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Price breakdown</div>
              <AutoView data={open.price} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function AdminOrders() {
  return <Suspense><OrdersInner /></Suspense>;
}

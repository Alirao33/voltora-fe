'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Admin } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { OrdersTable } from '@/components/OrdersTable';
import { Button, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader, Skeleton, Stat } from '@/components/ui';

export default function AdminDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [riderIdToSuspend, setRiderIdToSuspend] = useState('RIDER-102');
  const [orderToReview, setOrderToReview] = useState('');
  const [reviewed, setReviewed] = useState(false); // once an order is reviewed its card leaves the overview
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const recent = useApi(() => Admin.orders({ limit: 6 }), []);

  useEffect(() => {
    api<any>('/api/admin/analytics/overview').then(setOverview).catch((e) => setOverviewError(e?.message || 'Could not load the overview numbers.'));
  }, []);

  const handleUpdateRiderStatus = async (status: string) => {
    try {
      const data = await api<any>(`/api/admin/users/${encodeURIComponent(riderIdToSuspend)}/status`, { method: 'PATCH', body: { status, reason: 'Admin Manual Action' } });
      setNotice({ title: 'Account updated', text: data?.message || 'Status updated.' });
    } catch (e: any) {
      setNotice({ title: 'Could not update account', text: e?.message || 'Something went wrong.' });
    }
  };

  const handleReviewOrder = async (action: string) => {
    const id = orderToReview.replace(/^ORD-/i, '');
    try {
      await api<any>(`/api/admin/orders/${encodeURIComponent(id)}/review`, { method: 'POST', body: { action, reason: 'Admin Order Audit' } });
      setNotice({ title: 'Order reviewed', text: action === 'APPROVE' ? 'The order was approved.' : 'The order was rejected.' });
      setReviewed(true);
      recent.reload();
    } catch (e: any) {
      setNotice({ title: 'Could not review order', text: e?.message || 'Something went wrong.' });
    }
  };

  const num = (v: unknown, render: (n: any) => string = String) => (overview ? (v == null ? '—' : render(v)) : <Skeleton className="h-8 w-24" />);

  return (
    <>
      <PageHeader title="Voltora Admin Central" desc="System-wide monitoring, rider management, order approvals, and revenue control." />
      <ErrorBox error={overviewError} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active riders" value={num(overview?.active_riders)} />
        <Stat label="Orders today" value={num(overview?.orders_today)} tone="good" />
        <Stat label="Operational stations" value={num(overview?.operational_stations)} />
        <Stat label="Net revenue (PKR)" value={num(overview?.net_revenue_pkr, (n) => `Rs ${Number(n).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)} tone="good" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Rider account management" subtitle="Activate or suspend a rider account.">
          <div className="space-y-4">
            <Field label="Target rider ID">
              <Input value={riderIdToSuspend} onChange={(e) => setRiderIdToSuspend(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button className="flex-1" onClick={() => handleUpdateRiderStatus('ACTIVE')}>Activate account</Button>
              <Button className="flex-1" variant="danger" onClick={() => handleUpdateRiderStatus('SUSPENDED')}>Suspend account</Button>
            </div>
          </div>
        </Card>

        {!reviewed ? (
          <Card title="Online order review" subtitle="Approve or reject an order waiting for review.">
            <div className="space-y-4">
              <Field label="Order ID to review">
                <Input value={orderToReview} onChange={(e) => setOrderToReview(e.target.value)} placeholder="ORD-7" className="id-mono" />
              </Field>
              <div className="flex flex-wrap gap-3">
                <Button className="flex-1" disabled={!orderToReview.trim()} onClick={() => handleReviewOrder('APPROVE')}>Approve order</Button>
                <Button className="flex-1" variant="warning" disabled={!orderToReview.trim()} onClick={() => handleReviewOrder('REJECT')}>Reject / cancel</Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Online order review">
            <p className="text-body text-ink-600">That order has been reviewed. New orders waiting for review will appear on the Home delivery page.</p>
          </Card>
        )}
      </div>

      <Card title="Recent orders" subtitle="The latest orders across your stations." actions={<a href="/admin/orders" className="text-body font-medium text-volt-700 hover:underline">View all</a>}>
        {recent.loading && !recent.data ? <Loading /> : <><ErrorBox error={recent.error} onRetry={recent.reload} /><OrdersTable rows={recent.data || []} showUser /></>}
      </Card>

      <Modal open={!!notice} onClose={() => setNotice(null)} title={notice?.title} footer={<Button onClick={() => setNotice(null)}>OK</Button>}>
        <p className="text-body text-ink-700">{notice?.text}</p>
      </Modal>
    </>
  );
}

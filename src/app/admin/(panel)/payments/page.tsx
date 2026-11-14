'use client';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { ENUMS, type PaymentOut } from '@/lib/types';
import { dt, pkr, toNum } from '@/lib/format';
import { Badge, Button, Card, DataTable, ErrorBox, Field, Input, Loading, Modal, Mono, PageHeader, Select, Stat, Toolbar } from '@/components/ui';

export default function Payments() {
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(100);
  const { data, loading, error, reload } = useApi(() => Admin.payments({ status, limit }), [status, limit]);
  const [refund, setRefund] = useState<PaymentOut | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('admin refund');
  const act = useAction();
  const rows = data || [];
  const sum = (f: (p: PaymentOut) => number) => rows.reduce((a, p) => a + f(p), 0);

  return (
    <>
      <PageHeader title="Payments" desc="Raast, wallet and card payments, with refunds." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Collected" value={pkr(sum((p) => (p.status === 'SUCCEEDED' || p.status === 'PARTIALLY_REFUNDED' ? p.amount_pkr : 0)))} tone="good" />
        <Stat label="Refunded" value={pkr(sum((p) => p.refunded_pkr || 0))} />
        <Stat label="Pending" value={rows.filter((p) => p.status === 'PENDING').length} tone="warn" />
        <Stat label="Failed" value={rows.filter((p) => p.status === 'FAILED').length} tone={rows.some((p) => p.status === 'FAILED') ? 'bad' : undefined} />
      </div>
      <Card>
        <Toolbar>
          <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All" options={ENUMS.PaymentStatus} /></Field>
          <Field label="Limit"><Select value={String(limit)} onChange={(e) => setLimit(+e.target.value)} options={['50', '100', '250', '500'].map((x) => ({ value: x, label: x }))} /></Field>
          <Button variant="ghost" onClick={reload}>Refresh</Button>
        </Toolbar>
        <ErrorBox error={error} onRetry={reload} />
        {loading ? <Loading /> : (
          <DataTable
            rows={rows}
            rowKey={(p) => p.id}
            cols={[
              { key: 'id', header: '#', render: (p) => <Mono>{p.id}</Mono> },
              { key: 'created_at', header: 'Date', render: (p) => dt(p.created_at) },
              { key: 'purpose', header: 'Purpose', render: (p) => p.purpose },
              { key: 'order_id', header: 'Order', render: (p) => <Mono>{p.order_id ?? '—'}</Mono> },
              { key: 'method', header: 'Method', render: (p) => <Badge value={p.method} /> },
              { key: 'reference', header: 'Reference', render: (p) => <Mono>{p.reference}</Mono> },
              { key: 'status', header: 'Status', render: (p) => <Badge value={p.status} /> },
              { key: 'amount_pkr', header: 'Amount', align: 'right', render: (p) => pkr(p.amount_pkr) },
              { key: 'refunded_pkr', header: 'Refunded', align: 'right', render: (p) => (p.refunded_pkr ? <span title={p.refund_reason || ''}>{pkr(p.refunded_pkr)}</span> : '—') },
              {
                key: 'a', header: '', render: (p) =>
                  ['SUCCEEDED', 'PARTIALLY_REFUNDED'].includes(p.status) && p.refunded_pkr < p.amount_pkr ? (
                    <Button size="sm" variant="secondary" onClick={() => { setRefund(p); setAmount(''); setReason('admin refund'); }}>Refund</Button>
                  ) : null,
              },
            ]}
          />
        )}
      </Card>

      <Modal open={!!refund} onClose={() => setRefund(null)} title={`Refund payment #${refund?.id}`} footer={
        <>
          <Button variant="ghost" onClick={() => setRefund(null)}>Cancel</Button>
          <Button variant="danger" loading={act.busy} onClick={async () => {
            const r = await act.run(() => Admin.refund(refund!.id, { amount_pkr: toNum(amount), reason: reason || 'admin refund' }), 'Refund issued');
            if (r) { setRefund(null); reload(); }
          }}>Issue refund</Button>
        </>
      }>
        {refund && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">Paid {pkr(refund.amount_pkr)} · already refunded {pkr(refund.refunded_pkr)} · max refundable <b>{pkr(refund.amount_pkr - refund.refunded_pkr)}</b></p>
            <Field label="Amount (PKR)" hint="Leave empty to refund the full remaining amount"><Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}

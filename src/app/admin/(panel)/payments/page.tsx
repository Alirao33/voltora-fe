'use client';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { ENUMS, type PaymentOut } from '@/lib/types';
import { dt, pkr } from '@/lib/format';
import { Badge, Button, Card, DataTable, ErrorBox, Field, Loading, Mono, PageHeader, Select, Stat, Toolbar } from '@/components/ui';

export default function Payments() {
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(100);
  const { data, loading, error, reload } = useApi(() => Admin.payments({ status, limit }), [status, limit]);
  const rows = data || [];
  const sum = (f: (p: PaymentOut) => number) => rows.reduce((a, p) => a + f(p), 0);

  return (
    <>
      <PageHeader title="Payments" desc="Raast, wallet and card payments. Payments are final; no refunds are issued." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Collected" value={pkr(sum((p) => (p.status === 'SUCCEEDED' ? p.amount_pkr : 0)))} tone="good" />
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
            ]}
          />
        )}
      </Card>

    </>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Rider } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { OrdersTable } from '@/components/OrdersTable';
import { Card, ErrorBox, Field, Loading, PageHeader, Select, Toolbar } from '@/components/ui';

export default function MyOrders() {
  const router = useRouter();
  const [limit, setLimit] = useState(50);
  const { data, loading, error, reload } = useApi(() => Rider.orders(limit), [limit]);

  return (
    <>
      <PageHeader
        title="My orders"
        desc="Track your battery swaps and home deliveries."
        actions={
          <>
            <Link href="/rider/delivery" className="inline-flex h-11 items-center rounded-lg bg-volt-500 px-5 text-body font-medium text-volt-950 transition-colors duration-150 hover:bg-volt-600">+ Home delivery</Link>
            <Link href="/rider/swap" className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-5 text-body font-medium text-ink-800 transition-colors duration-150 hover:bg-ink-50">New swap</Link>
          </>
        }
      />

      <Card>
        <Toolbar>
          <Field label="Show">
            <Select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} options={['20', '50', '100', '200'].map((x) => ({ value: x, label: `Last ${x}` }))} />
          </Field>
        </Toolbar>
        <ErrorBox error={error} onRetry={reload} />
        {loading ? <Loading /> : <OrdersTable rows={data || []} onOpen={(o) => router.push(`/rider/orders/${o.id}`)} />}
      </Card>
    </>
  );
}

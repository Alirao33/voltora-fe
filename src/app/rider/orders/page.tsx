'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Rider } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { Card, ErrorBox, Field, Loading, PageHeader, Select, Toolbar } from '@/components/ui';

export default function MyOrders() {
  const router = useRouter();
  const [limit, setLimit] = useState(50);
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useApi(() => Rider.orders(limit), [limit]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Orders & Deliveries"
        desc="Track your battery swaps, van deliveries, and OTP handover verification."
        actions={
          <div className="flex gap-3">
            <Link
              href="/rider/order"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
            >
              + Order Delivery
            </Link>
            <Link
              href="/rider/swap"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              Station Swap
            </Link>
          </div>
        }
      />

      {/* OTP Delivery Verification Banner */}
      <div className="border border-emerald-500/40 bg-ink-950 rounded-2xl p-5 flex justify-between items-center text-white">
        <div>
          <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">Active Delivery Dispatch</span>
          <h3 className="text-lg font-bold mt-1">Order #ORD-20261017-01 (In Progress)</h3>
          <p className="text-xs text-slate-400 mt-1">Delivery man assigned: Tariq Mahmood (Van KHI-01) • Delivery OTP: <span className="text-emerald-400 font-mono font-bold text-base bg-slate-900 px-2 py-0.5 rounded">4829</span></p>
        </div>
        <span className="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded-full text-xs">READY FOR DISPATCH</span>
      </div>

      <Card>
        <Toolbar>
          <Field label="Show">
            <Select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              options={['20', '50', '100', '200'].map((x) => ({ value: x, label: `Last ${x}` }))}
            />
          </Field>
        </Toolbar>

        <ErrorBox error={error} onRetry={reload} />

        {loading ? (
          <Loading />
        ) : (
          <div className="p-4 text-ink-700 text-sm">
            <p className="text-ink-500">Past Orders & Swaps</p>
            <div className="mt-3 divide-y divide-ink-100">
              <div className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-ink-900">Station Swap - STN-KHI-001</p>
                  <p className="text-xs text-ink-500">17 Oct 2026, 14:20 PM • Covered by Subscription</p>
                </div>
                <span className="text-emerald-400 text-xs font-bold">COMPLETED</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
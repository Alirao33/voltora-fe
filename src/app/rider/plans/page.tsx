'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Rider } from '@/lib/endpoints';
import { Modal } from '@/components/ui';

interface Plan {
  id: string | number;
  code: string;
  name: string;
  duration_type: string;
  duration_days: number;
  price_pkr: number;
}

const toText = (v: unknown, fallback = ''): string =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : fallback;

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizePlans(data: unknown): Plan[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const list: unknown[] = Array.isArray(d)
    ? d
    : Array.isArray(d?.plans)
    ? d.plans
    : Array.isArray(d?.data)
    ? d.data
    : [];

  return list.map((raw, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (raw ?? {}) as Record<string, any>;
    const code = toText(p.code ?? p.plan_code ?? p.planCode);
    return {
      id: p.id ?? p.plan_id ?? p.planId ?? (code || i),
      code,
      name: toText(p.name, 'Unnamed plan'),
      duration_type: toText(p.duration_type ?? p.durationType, 'Pass'),
      duration_days: toNum(p.duration_days ?? p.durationDays),
      price_pkr: toNum(p.price_pkr ?? p.pricePkr),
    };
  });
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    api<unknown>('/api/plans', { auth: false })
      .then((data) => { if (live) setPlans(normalizePlans(data)); })
      .catch((err) => {
        console.error('Failed to load plans:', err);
        if (live) setError('Could not load plans right now.');
      })
      .finally(() => { if (live) setLoading(false); });

    return () => { live = false; };
  }, []);
  const [current, setCurrent] = useState<{ ends_at: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    Rider.subscription().then((s) => setCurrent(s || null)).catch(() => {});
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await Rider.cancelSubscription();
      setCurrent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the subscription.');
    } finally {
      setCancelling(false);
      setConfirmOpen(false);
    }
  };

const handleSubscribe = (planCode: string) => {
  router.push(`/rider/checkout?plan=${encodeURIComponent(planCode)}`);
};


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <p className="text-gray-400">Loading locker pass plans...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Locker Pass Subscriptions</h1>
            <p className="text-gray-400 mt-2">
              Lock in your station storage access. Battery swaps are ordered online or paid per swap.
            </p>
          </div>
          {current && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 space-y-2">
              <p>Active subscription until {new Date(current.ends_at).toLocaleDateString('en-PK')}</p>
              <button
                onClick={() => setConfirmOpen(true)}
                className="rounded-lg bg-red-500/90 hover:bg-red-500 text-white px-3 py-1.5 text-xs font-semibold"
              >
                Cancel current subscription
              </button>
            </div>
          )}
          <Modal
            open={confirmOpen}
            onClose={() => !cancelling && setConfirmOpen(false)}
            title="Cancel subscription?"
            footer={
              <>
                <button onClick={() => setConfirmOpen(false)} disabled={cancelling} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-50">
                  Keep it
                </button>
                <button onClick={handleCancel} disabled={cancelling} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                </button>
              </>
            }
          >
            <p className="text-sm text-ink-700">Your current subscription will end immediately. No refund is issued.</p>
          </Modal>
        </div>

        {error ? (
          <p className="text-red-400">{error}</p>
        ) : plans.length === 0 ? (
          <p className="text-gray-400">No subscription plans found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={`${plan.id}-${plan.code}`}
                className="border border-slate-800 bg-slate-900 rounded-2xl p-6 flex flex-col justify-between shadow-xl hover:border-emerald-500/50 transition-all duration-200"
              >
                <div className="space-y-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    {plan.duration_type}
                  </span>
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">
                      Rs {plan.price_pkr.toLocaleString('en-PK')}
                    </span>
                    <span className="text-sm text-gray-400">/ {plan.duration_days} days</span>
                  </div>
                  <ul className="space-y-3 text-sm text-gray-300 pt-4 border-t border-slate-800">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">⚡</span> Station Locker Storage Rights
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">⚡</span> Priority Swapping Access
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">⚡</span> Plan Code:{' '}
                      <code className="text-emerald-400 bg-slate-800 px-2 py-0.5 rounded text-xs">
                        {plan.code}
                      </code>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => handleSubscribe(plan.code)}
                  className="mt-8 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl transition duration-200"
                >
                  Subscribe Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
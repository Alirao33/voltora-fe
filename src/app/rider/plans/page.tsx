'use client';

import { perPeriod } from '@/lib/format';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Rider } from '@/lib/endpoints';
import { usePageTitle } from '@/lib/hooks';
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
  usePageTitle('Plans');
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
  const [current, setCurrent] = useState<{ ends_at: string; plan_id: number } | null>(null);
  const [upgradeTo, setUpgradeTo] = useState<Plan | null>(null);
  const currentPrice = plans.find((p) => Number(p.id) === current?.plan_id)?.price_pkr ?? 0;
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
      <div className="min-h-screen bg-canvas text-ink-900 flex items-center justify-center p-8">
        <p className="text-ink-600">Loading locker pass plans...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink-900 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-page text-ink-900">Locker Pass Subscriptions</h1>
            <p className="text-ink-600 mt-2">
              Lock in your station storage access. Battery swaps are ordered online or paid per swap.
            </p>
          </div>
          {current && (
            <div className="rounded-xl border border-amber-300 bg-status-warning-bg p-4 text-body text-status-warning-fg space-y-2">
              <p>Active subscription until {new Date(current.ends_at).toLocaleDateString('en-PK')}</p>
              <button
                onClick={() => setConfirmOpen(true)}
                className="rounded-lg border border-line bg-white text-volt-700 hover:bg-volt-50 hover:text-red-700 px-3 py-1.5 text-xs font-medium"
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
                <button onClick={handleCancel} disabled={cancelling} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-volt-700 hover:bg-volt-50 hover:text-red-700 disabled:opacity-50">
                  {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                </button>
              </>
            }
          >
            <p className="text-sm text-ink-700">Your current subscription will end immediately. No refund is issued.</p>
          </Modal>
        </div>

        <Modal
          open={!!upgradeTo}
          onClose={() => setUpgradeTo(null)}
          title={upgradeTo && Number(upgradeTo.id) === current?.plan_id ? 'Renew your plan?' : 'Upgrade your plan?'}
          footer={
            <>
              <button onClick={() => setUpgradeTo(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100">Not now</button>
              <button
                onClick={() => router.push(`/rider/checkout?plan=${encodeURIComponent(upgradeTo!.code)}&upgrade=1`)}
                className="rounded-lg bg-volt-500 px-4 py-2 text-sm font-medium text-volt-950 hover:bg-volt-600"
              >
                Continue to upgrade
              </button>
            </>
          }
        >
          {upgradeTo && (
            <div className="space-y-2 text-sm text-ink-700">
              <p>You will move to <b>{upgradeTo.name}</b> for Rs {upgradeTo.price_pkr.toLocaleString('en-PK')}. Your locker stays the same. Renewing the same plan adds to your current end date; a higher plan starts now and replaces the current one.</p>
              <p className="font-medium">Cancellations and plan changes do not give a refund. Unused time on a replaced plan is not paid back.</p>
            </div>
          )}
        </Modal>

        {error ? (
          <p className="text-red-700">{error}</p>
        ) : plans.length === 0 ? (
          <p className="text-ink-600">No subscription plans found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={`${plan.id}-${plan.code}`}
                className="surface rounded-card p-6 flex flex-col justify-between hover:border-volt-500 transition-colors duration-150"
              >
                <div className="space-y-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-volt-700">
                    {plan.duration_type}
                  </span>
                  <h3 className="text-2xl font-bold text-ink-900">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-ink-900">
                      Rs {plan.price_pkr.toLocaleString('en-PK')}
                    </span>
                    <span className="text-sm text-ink-600">{perPeriod(plan.duration_days)}</span>
                  </div>
                  <ul className="space-y-3 text-sm text-ink-700 pt-4 border-t border-line">
                    <li className="flex items-center gap-2">
                      <span className="text-volt-700">⚡</span> Station Locker Storage Rights
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-volt-700">⚡</span> Priority Swapping Access
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-volt-700">⚡</span> Plan Code:{' '}
                      <code className="text-volt-700 bg-ink-100 text-ink-800 px-2 py-0.5 rounded text-xs">
                        {plan.code}
                      </code>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => (current ? setUpgradeTo(plan) : handleSubscribe(plan.code))}
                  disabled={!!current && plan.price_pkr < currentPrice}
                  className="mt-8 w-full bg-volt-500 hover:bg-volt-600 text-volt-950 font-medium py-3 rounded-xl transition duration-200 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-600"
                >
                  {!current ? 'Subscribe Now' : Number(plan.id) === current.plan_id ? 'Renew this plan' : plan.price_pkr > currentPrice ? 'Upgrade to this plan' : 'Lower than your plan'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
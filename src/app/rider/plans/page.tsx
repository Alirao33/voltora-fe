'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string | number;
  code: string;
  name: string;
  duration_type: string;
  duration_days: number;
  price_pkr: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
    const controller = new AbortController();

    fetch(`${API_URL}/api/plans`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Plans request failed (${res.status})`);
        return res.json();
      })
      .then((data) => setPlans(normalizePlans(data)))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Failed to load plans:', err);
        setError('Could not load plans right now.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locker Pass Subscriptions</h1>
          <p className="text-gray-400 mt-2">
            Lock in your station storage access. Battery swaps are ordered online or paid per swap.
          </p>
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
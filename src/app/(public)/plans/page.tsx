'use client';
import { getTokens } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string | number;
  code: string;
  name: string;
  duration_type: string;
  duration_days: number;
  price_pkr: number;
  description?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function normalizePlans(data: any): Plan[] {
  const rawList = Array.isArray(data) ? data : data?.plans || data?.data || [];
  return rawList.map((item: any) => ({
    id: item.id || item.plan_id || item.code,
    code: item.code || item.plan_code || '',
    name: item.name || 'Locker Pass',
    duration_type: item.duration_type || 'Pass',
    duration_days: Number(item.duration_days) || 0,
    price_pkr: Number(item.price_pkr) || 0,
    description: item.description || '',
  }));
}

export default function PublicPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPlans() {
      try {
        const res = await fetch(`${API_URL}/api/plans`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to load plans (Status: ${res.status})`);
        }

        const data = await res.json();
        setPlans(normalizePlans(data));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching plans:', err);
          setError(err.message || 'Unable to load subscription plans.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();

    return () => controller.abort();
  }, []);

 const handleSelectPlan = (planCode: string) => {
  const tokens = getTokens();

  if (tokens?.access_token) {
    router.push(`/rider/checkout?plan=${encodeURIComponent(planCode)}`);
  } else {
    router.push(`/register?plan=${encodeURIComponent(planCode)}`);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <p className="text-gray-400">Loading subscription plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">Voltora Locker Passes</h1>
          <p className="text-gray-400 text-sm md:text-base">
            Subscribe to an instant battery swapping locker pass and keep your fleet moving across Karachi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="border border-slate-800 bg-slate-900/80 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/50 transition shadow-xl"
            >
              <div className="space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full inline-block">
                  {plan.duration_type}
                </span>
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    Rs {plan.price_pkr.toLocaleString('en-PK')}
                  </span>
                  <span className="text-xs text-gray-400">/ {plan.duration_days} days</span>
                </div>
                {plan.description && (
                  <p className="text-sm text-gray-400">{plan.description}</p>
                )}
              </div>

              <button
                onClick={() => handleSelectPlan(plan.code)}
                className="mt-8 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-md"
              >
                Register to Subscribe
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
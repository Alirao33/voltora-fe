'use client';

import { perPeriod } from '@/lib/format';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string | number;
  code: string;
  name: string;
  duration_type: string;
  duration_days: number;
  price_pkr: number;
}

import { API_BASE, getTokens } from '@/lib/api';

function normalizePlans(data: any): Plan[] {
  const rawList = Array.isArray(data) ? data : data?.plans || data?.data || [];
  return rawList.map((item: any) => ({
    id: item.id || item.plan_id || item.code,
    code: item.code || item.plan_code || '',
    name: item.name || 'Locker Pass',
    duration_type: item.duration_type || 'Pass',
    duration_days: Number(item.duration_days) || 0,
    price_pkr: Number(item.price_pkr) || 0,
  }));
}

export default function PublicLandingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPlans() {
      try {
        const res = await fetch(`${API_BASE}/api/plans`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setPlans(normalizePlans(data));
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load landing page plans:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
    return () => controller.abort();
  }, []);

  const handleSelectPlan = (planCode: string) => {
    const q = encodeURIComponent(planCode);
    router.push(getTokens()?.access_token ? `/rider/checkout?plan=${q}` : `/register?plan=${q}`);
  };

  const features = [
    { title: 'Live battery health', text: 'Every pack is monitored, so the one you pick up is healthy and full.' },
    { title: 'Locker swaps', text: 'Drop the empty pack and take a charged one from a locker near you.' },
    { title: 'Simple passes', text: 'Monthly, 6-month and yearly passes, or pay per swap.' },
  ];

  return (
    <div className="min-h-screen bg-white text-ink-900 selection:bg-volt-800 selection:text-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-volt-950 via-[#06382a] to-volt-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-14 text-center sm:py-20 lg:py-24">
          <span className="inline-block rounded-full border border-volt-400/40 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-volt-200">
            Voltora smart swapping network
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Swap EV Batteries in Seconds, Not Hours.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-volt-100 md:text-lg">
            Powering urban electric mobility with instant locker battery access across the city network.
          </p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/plans" className="rounded-xl bg-white px-6 py-3 text-center font-semibold text-volt-900 transition hover:bg-volt-100">
              Explore Plans
            </Link>
            <Link href="/register" className="rounded-xl border border-white/60 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10">
              Create Rider Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-10 sm:grid-cols-3 sm:py-14">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-volt-100 bg-volt-50 p-5">
            <h3 className="text-lg font-semibold text-volt-900">{f.title}</h3>
            <p className="mt-1 text-sm text-ink-700">{f.text}</p>
          </div>
        ))}
      </section>

      {/* Plans */}
      <section className="bg-volt-50">
        <div className="mx-auto max-w-5xl space-y-8 px-5 py-12 sm:py-16">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-volt-950 sm:text-3xl">Featured Locker Passes</h2>
            <p className="text-sm text-ink-600">Choose a subscription plan tailored to your daily range requirement.</p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-ink-600">Loading subscription plans...</div>
          ) : plans.length === 0 ? (
            <div className="py-8 text-center text-ink-600">Plans are not available right now. Please try again shortly.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className="flex flex-col justify-between space-y-6 rounded-2xl border border-volt-100 bg-white p-6 shadow-sm transition-colors duration-150 hover:border-volt-700">
                  <div className="space-y-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-volt-800">{plan.duration_type}</span>
                    <h3 className="text-xl font-semibold text-volt-950">{plan.name}</h3>
                    <div className="text-2xl font-bold text-ink-900">
                      Rs {plan.price_pkr.toLocaleString('en-PK')}
                      <span className="text-xs font-normal text-ink-600"> {perPeriod(plan.duration_days)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleSelectPlan(plan.code)} className="w-full rounded-xl bg-volt-800 py-3 text-sm font-semibold text-white transition hover:bg-volt-900">
                    Subscribe Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

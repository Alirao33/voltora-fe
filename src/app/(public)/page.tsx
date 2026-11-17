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
        const res = await fetch(`${API_URL}/api/plans`, { signal: controller.signal });
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    console.log(token)
    // if (token) {
    //   router.push(`/rider/checkout?plan=${encodeURIComponent(planCode)}`);
    // } else {
    //   router.push(`/register?plan=${encodeURIComponent(planCode)}`);
    // }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink-900 selection:bg-volt-500 selection:text-volt-950">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center space-y-6">
        <span className="inline-block px-3 py-1 bg-status-success-bg border border-volt-200 text-status-success-fg rounded-full text-xs font-medium tracking-wider uppercase">
          Voltora Smart Swapping Network
        </span>
        <h1 className="text-4xl md:text-5xl font-bold max-w-3xl mx-auto leading-tight">
          Swap EV Batteries in Seconds, Not Hours.
        </h1>
        <p className="text-ink-600 max-w-xl mx-auto text-base md:text-lg">
          Powering urban electric mobility with instant locker battery access across the city network.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/plans"
            className="bg-volt-500 hover:bg-volt-600 text-volt-950 font-medium px-6 py-3 rounded-xl transition"
          >
            Explore Plans
          </Link>
          <Link
            href="/register"
            className="border border-line bg-white hover:bg-ink-50 text-ink-800 font-medium px-6 py-3 rounded-xl transition"
          >
            Create Rider Account
          </Link>
        </div>
      </section>

      {/* Subscription Plans Section */}
      <section className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Featured Locker Passes</h2>
          <p className="text-ink-600 text-sm">Choose a subscription plan tailored to your daily range requirement.</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-ink-600">Loading subscription plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="surface rounded-card p-6 flex flex-col justify-between space-y-6 hover:border-volt-500 transition-colors duration-150"
              >
                <div className="space-y-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-volt-700">
                    {plan.duration_type}
                  </span>
                  <h3 className="text-xl font-medium">{plan.name}</h3>
                  <div className="text-2xl font-bold text-ink-900">
                    Rs {plan.price_pkr.toLocaleString('en-PK')}
                    <span className="text-xs font-normal text-ink-600"> {perPeriod(plan.duration_days)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.code)}
                  className="w-full bg-volt-500 hover:bg-volt-600 text-volt-950 font-medium py-2.5 rounded-xl text-sm transition"
                >
                  Subscribe Now
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
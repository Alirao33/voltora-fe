'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [riderIdToSuspend, setRiderIdToSuspend] = useState('RIDER-102');
  const [orderToReview, setOrderToReview] = useState('ORD-20261017-01');

  useEffect(() => {
    // Fetch Admin Overview Analytics
    fetch('http://127.0.0.1:8000/api/admin/analytics/overview')
      .then((res) => res.json())
      .then((data) => setOverview(data))
      .catch(() => {});

    // Fetch Finance Summary
    fetch('http://127.0.0.1:8000/api/admin/finance/summary')
      .then((res) => res.json())
      .then((data) => setFinance(data))
      .catch(() => {});
  }, []);

  const handleUpdateRiderStatus = async (status: string) => {
    const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${riderIdToSuspend}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason: 'Admin Manual Action' }),
    });
    const data = await res.json();
    alert(data.message || 'Status updated.');
  };

  const handleReviewOrder = async (action: string) => {
    const res = await fetch(`http://127.0.0.1:8000/api/admin/orders/${orderToReview}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason: 'Admin Order Audit' }),
    });
    const data = await res.json();
    alert(data.message || 'Order reviewed.');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-white">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-3xl font-bold tracking-tight">Voltora Admin Central</h1>
        <p className="text-slate-400 text-sm mt-1">System-wide monitoring, rider management, order approvals, and revenue control.</p>
      </div>

      {/* 1. Dashboard Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase font-semibold">Active Riders</p>
          <p className="text-2xl font-bold text-white mt-2">{overview?.active_riders ?? 1280}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase font-semibold">Orders Today</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{overview?.orders_today ?? 142}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase font-semibold">Operational Stations</p>
          <p className="text-2xl font-bold text-white mt-2">{overview?.operational_stations ?? 12}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase font-semibold">Net Revenue (PKR)</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">Rs. {finance?.net_revenue?.toLocaleString() ?? '515,000'}</p>
        </div>
      </div>

      {/* 2. Management Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User & Rider Management */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-bold">Rider Account Management</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">Target Rider ID</label>
              <input
                type="text"
                value={riderIdToSuspend}
                onChange={(e) => setRiderIdToSuspend(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleUpdateRiderStatus('ACTIVE')}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition"
              >
                Activate Account
              </button>
              <button
                onClick={() => handleUpdateRiderStatus('SUSPENDED')}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition"
              >
                Suspend Account
              </button>
            </div>
          </div>
        </div>

        {/* Order Review Controls */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-bold">Online Order Review</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">Order ID to Review</label>
              <input
                type="text"
                value={orderToReview}
                onChange={(e) => setOrderToReview(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleReviewOrder('APPROVE')}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition"
              >
                Approve Order
              </button>
              <button
                onClick={() => handleReviewOrder('REJECT')}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition"
              >
                Reject / Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
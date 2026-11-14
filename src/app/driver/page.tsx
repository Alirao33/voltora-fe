
'use client';

import { useState, useEffect } from 'react';

export default function VanDriverDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [otpModal, setOtpModal] = useState<string | null>(null);
  const [inputOtp, setInputOtp] = useState('');
  const [cashCollected, setCashCollected] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/driver/tasks').then(res => res.json()).then(data => setTasks(data.active_tasks || [])).catch(() => {});
    fetch('http://127.0.0.1:8000/api/driver/van/inventory').then(res => res.json()).then(data => setInventory(data.loaded_packs || [])).catch(() => {});
  }, []);

  const handleToggleShift = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    await fetch('http://127.0.0.1:8000/api/driver/shift', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: nextStatus }),
    });
  };

  const handleCompleteHandover = async () => {
    if (!otpModal) return;
    setVerifying(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/driver/orders/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: otpModal, otp_code: inputOtp, cash_collected_amount: Number(cashCollected) || 0 }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Delivery Completed Successfully! Order reconciled and inventory updated.');
        setOtpModal(null);
        setInputOtp('');
        setCashCollected('');
      } else alert(data.detail || 'Handover verification failed.');
    } catch {
      alert('Error verifying OTP handover.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-white">
      {/* Header & Duty Switch */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Van Driver Logistics</h1>
          <p className="text-slate-400 text-sm mt-1">Van ID: VAN-KHI-01 • Assigned Zone: Karachi South</p>
        </div>
        <button onClick={handleToggleShift} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${isOnline ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
          {isOnline ? '● Duty Status: ONLINE' : '○ Duty Status: OFFLINE'}
        </button>
      </div>

      {/* Active Tasks & Onboard Inventory */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-200">Assigned Delivery & Rebalance Tasks</h2>

          <div className="border border-emerald-500/40 bg-slate-900 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full uppercase">On-Demand Delivery</span>
                <h3 className="text-lg font-bold mt-2">Ali Raza (Customer)</h3>
                <p className="text-xs text-slate-400">Address: Shahrah-e-Faisal, Clifton Block 5</p>
              </div>
              <span className="text-xs font-mono text-slate-400">ORD-20261017-01</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl text-xs space-y-1 border border-slate-800">
              <p><span className="text-slate-400">Battery Requested:</span> Voltora 72V Standard Pack</p>
              <p><span className="text-slate-400">Payment Mode:</span> <span className="text-emerald-400 font-semibold">Online Verified / Subscription Waiver</span></p>
              <p className="text-amber-400">⚠ Payment Security Rule: Driver cannot alter payment amount manually.</p>
            </div>
            <button onClick={() => setOtpModal('ORD-20261017-01')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition">
              Verify Delivery OTP & Handover
            </button>
          </div>

          {tasks.map(tsk => (
            <div key={tsk.task_id} className="border border-slate-800 bg-slate-900 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded">{tsk.priority} Priority</span>
                <span className="text-xs text-slate-400">{tsk.status}</span>
              </div>
              <p className="font-bold">{tsk.type === 'STATION_REBALANCE' ? `Rebalance: ${tsk.source_station} ➔ ${tsk.target_station}` : tsk.rider_name}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-200">Onboard Van Battery Fleet</h2>
          <div className="border border-slate-800 bg-slate-900 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-slate-400">Loaded Capacity: 3 / 8 Battery Packs</p>
            <div className="space-y-2">
              {inventory.map(pack => (
                <div key={pack.pack_id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-white">{pack.pack_id}</p>
                    <p className="text-slate-400">SoH: {pack.soh}%</p>
                  </div>
                  <span className={`font-bold px-2 py-1 rounded ${pack.soc > 50 ? 'text-emerald-400 bg-emerald-950/30' : 'text-amber-400 bg-amber-950/30'}`}>{pack.soc}% SoC</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* OTP Handover Modal */}
      {otpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-bold">Confirm Customer Handover</h3>
            <p className="text-xs text-slate-400">Ask the customer for their 4-digit verification code shown on their app screen.</p>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Customer Verification OTP Code</label>
              <input type="text" maxLength={4} value={inputOtp} onChange={e => setInputOtp(e.target.value)} placeholder="e.g. 4829" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-mono font-bold text-center tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Cash Collected on Delivery (COD in PKR)</label>
              <input type="number" value={cashCollected} onChange={e => setCashCollected(e.target.value)} placeholder="Enter 0 if covered by subscription" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setOtpModal(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition">Cancel</button>
              <button onClick={handleCompleteHandover} disabled={verifying} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50">
                {verifying ? 'Verifying...' : 'Verify & Handover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

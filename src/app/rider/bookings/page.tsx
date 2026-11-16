'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Rider } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { dt, pkr } from '@/lib/format';
import { Badge, Button, Card, Empty, ErrorBox, Loading, Modal, PageHeader } from '@/components/ui';

export default function LockerPassPage() {
  const { data, loading, error, reload } = useApi(() => Rider.lockerPass(), []);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const cur = data?.current;
  const stations: any[] = data?.stations || [];
  const history: any[] = data?.history || [];

  const confirm = async () => {
    setBusy(true);
    try {
      await Rider.setLockerStation(pick);
      setPick('');
      reload();
    } catch (e: any) {
      setNotice(e?.message || 'Could not set your station.');
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My locker" desc="Your locker comes with your pass. Choose your station once and it is yours until the pass ends." />
      <ErrorBox error={error} onRetry={reload} />
      {loading ? <Loading /> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card title="Your locker">
            {!cur ? (
              <div className="py-6 text-center text-sm text-ink-500">
                You need an active locker pass first. <Link href="/rider/plans" className="font-medium text-volt-700">Browse plans →</Link>
              </div>
            ) : cur.locker_id ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-volt-300 bg-volt-50 p-5 text-center">
                  <div className="text-xs font-medium uppercase tracking-wide text-volt-800">Locker ID</div>
                  <div className="mt-1 font-mono text-3xl font-semibold text-volt-900">{cur.locker_id}</div>
                  <div className="mt-1 text-sm text-volt-800">{cur.station_name || cur.station_id}</div>
                </div>
                <p className="text-xs text-ink-500">Your station is set once for this pass, so it can't be changed. {cur.plan_name} ends {dt(cur.ends_at, { dateOnly: true })}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-ink-600">Pick your station. We give you the first free locker there. You can only do this once.</p>
                <div className="space-y-2">
                  {stations.map((st) => (
                    <label key={st.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm ${st.free_lockers ? (pick === st.id ? 'border-volt-500 bg-volt-50' : 'border-ink-200 bg-white hover:bg-ink-50') : 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-400'}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="station" disabled={!st.free_lockers} checked={pick === st.id} onChange={() => setPick(st.id)} />
                        <span><b className="text-ink-900">{st.name}</b><span className="block text-xs text-ink-500">{st.address}</span></span>
                      </span>
                      <span className="text-xs">{st.free_lockers ? `${st.free_lockers} lockers available` : 'Full'}</span>
                    </label>
                  ))}
                </div>
                <Button className="w-full" disabled={!pick} loading={busy} onClick={confirm}>Confirm station &amp; get my locker</Button>
              </div>
            )}
          </Card>

          <Card title="Plan history" subtitle="Every plan you have subscribed to.">
            {history.length ? (
              <ul className="divide-y divide-ink-100">
                {history.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium text-ink-900">{h.plan_name}</div>
                      <div className="text-xs text-ink-500">{dt(h.starts_at, { dateOnly: true })} → {dt(h.ends_at, { dateOnly: true })}</div>
                      {h.locker_id && <div className="mt-0.5 text-xs text-ink-500">Locker <span className="font-mono">{h.locker_id}</span> · {h.station_name}</div>}
                    </div>
                    <div className="text-right">
                      <Badge value={h.status} />
                      <div className="mt-1 text-xs text-ink-500">{pkr(h.price_pkr)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Empty title="No plans yet" />}
          </Card>
        </div>
      )}
      <Modal open={!!notice} onClose={() => setNotice(null)} title="Could not set station" footer={<Button onClick={() => setNotice(null)}>OK</Button>}>
        <p className="text-sm text-ink-700">{notice}</p>
      </Modal>
    </>
  );
}

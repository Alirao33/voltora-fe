'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Rider } from '@/lib/endpoints';
import { useAction, useApi, useRecentBookings } from '@/lib/hooks';
import { AutoView, RawJson } from '@/components/AutoView';
import { Badge, Button, Card, ErrorBox, Input, Loading } from '@/components/ui';

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const bookingId = decodeURIComponent(id);
  const { data, loading, error, reload, setData } = useApi(() => Rider.booking(bookingId), [bookingId]);
  const { add } = useRecentBookings();
  const act = useAction();
  const [code, setCode] = useState('');
  useEffect(() => { if (data) add(bookingId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [data]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const b = data?.booking ?? data;
  const status = b?.status ?? b?.state;
  const unlockCode = b?.unlock_code ?? b?.pickup_code;
  const after = async (p: Promise<any> | (() => Promise<any>), msg: string) => {
    const r = await act.run(typeof p === 'function' ? p : () => p, msg);
    if (r) { if (typeof r === 'object' && Object.keys(r).length > 2) setData(r); else reload(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/rider/bookings" className="text-sm text-ink-500 hover:text-ink-800">← Bookings</Link>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          Booking <span className="font-mono">{bookingId}</span> {status && <Badge value={status} />}
        </h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          {unlockCode && (
            <div className="rounded-2xl bg-ink-950 p-6 text-white">
              <div className="text-xs uppercase tracking-widest text-ink-400">Unlock code</div>
              <div className="mt-2 font-mono text-4xl font-semibold tracking-[0.3em] text-volt-400">{unlockCode}</div>
            </div>
          )}
          <Card title="Actions">
            <div className="space-y-4">
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); after(() => Rider.unlockBooking(bookingId, code || unlockCode), 'Locker door unlocked'); }}>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={unlockCode || 'Unlock code'} className="font-mono" />
                <Button type="submit" loading={act.busy}>Unlock</Button>
              </form>
              <div className="flex gap-2">
                <Button variant="dark" className="flex-1" loading={act.busy} onClick={() => after(() => Rider.completeBooking(bookingId), 'Booking completed')}>Mark complete</Button>
                <Button variant="danger" className="flex-1" loading={act.busy} onClick={() => after(() => Rider.cancelBooking(bookingId), 'Booking cancelled')}>Cancel</Button>
              </div>
            </div>
          </Card>
        </div>
        <Card title="Details" actions={<Button size="sm" variant="ghost" onClick={reload}>Refresh</Button>}>
          <AutoView data={data} />
          <RawJson data={data} />
        </Card>
      </div>
    </div>
  );
}

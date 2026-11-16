'use client';
import { useEffect, useRef, useState } from 'react';
import { Driver, Rider } from '@/lib/endpoints';
import { cx } from '@/lib/format';
import { Button, Input } from '@/components/ui';

const QUICK: Record<'RIDER' | 'DRIVER', string[]> = {
  DRIVER: ["I'm on my way", "I've arrived", 'Please share the locker code', "I can't find the address"],
  RIDER: ["I'm at home", 'Come to the main gate', 'Running 5 minutes late', 'Please wait a moment'],
};

type Msg = { id: number; sender_role: 'RIDER' | 'DRIVER'; sender_name: string; body: string; created_at: string };

/** Text chat between the rider and the delivery man of one home delivery. Polls for new messages. */
export function OrderChat({ orderId, side }: { orderId: number; side: 'RIDER' | 'DRIVER' }) {
  const api = side === 'RIDER' ? Rider : Driver;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [closed, setClosed] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await api.messages(orderId);
      setMsgs(r.messages || []);
      setClosed(!!r.closed);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load messages');
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [msgs.length]);

  const send = async (e: React.FormEvent | null, quick?: string) => {
    e?.preventDefault();
    const body = (quick ?? text).trim();
    if (!body) return;
    setBusy(true);
    try {
      await api.sendMessage(orderId, body);
      if (quick === undefined) setText('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not send');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="h-64 space-y-2 overflow-y-auto rounded-xl border border-ink-100 bg-ink-50/60 p-3">
        {msgs.length === 0 && <p className="py-8 text-center text-sm text-ink-400">No messages yet. Say hello and share where to meet.</p>}
        {msgs.map((m) => {
          const mine = m.sender_role === side;
          return (
            <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[80%] rounded-2xl px-3 py-2 text-sm', mine ? 'bg-volt-500 text-volt-950' : 'bg-white text-ink-900 shadow-sm ring-1 ring-ink-100')}>
                {!mine && <div className="text-[11px] font-semibold text-ink-500">{m.sender_name}</div>}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={cx('mt-0.5 text-right text-[10px]', mine ? 'text-volt-900/60' : 'text-ink-400')}>
                  {new Date(m.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {closed ? <p className="text-center text-xs text-ink-500">This chat is closed because the order is finished.</p> : (
        <>
        <div className="flex flex-wrap gap-2">
          {QUICK[side].map((q) => (
            <button key={q} type="button" disabled={busy} onClick={() => send(null, q)} className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 hover:bg-ink-50 disabled:opacity-50">{q}</button>
          ))}
        </div>
        <form onSubmit={(e) => send(e)} className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Type a message" />
          <Button type="submit" loading={busy} disabled={!text.trim()}>Send</Button>
        </form>
        </>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { dt } from '@/lib/format';
import { DiffList, diffSummary } from '@/components/PricingDiff';
import { Badge, Button, Card, DataTable, Empty, ErrorBox, Field, Loading, Modal, Stat, Textarea } from '@/components/ui';

/** Super admin: decide on pricing changes asked for by station admins, and read the log of every decision. */
export function PricingApprovals() {
  const changes = useApi(() => Admin.pricingChanges(), []);
  const act = useAction();
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState<any>(null);

  // New requests show up without a reload.
  useEffect(() => {
    const t = setInterval(() => { Admin.pricingChanges().then((r) => changes.setData(r)).catch(() => {}); }, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = changes.data || [];
  const pending = list.filter((c) => c.status === 'PENDING');
  const history = list.filter((c) => c.status !== 'PENDING');
  const count = (s: string) => list.filter((c) => c.status === s).length;

  const decide = async (id: number, approve: boolean, n?: string) => {
    const r = await act.run(() => Admin.decidePricingChange(id, { approve, note: n }), approve ? 'Approved. The new rates are live now.' : 'Request rejected.');
    if (r) changes.reload();
  };

  if (changes.loading && !changes.data) return <Loading />;
  return (
    <div className="space-y-6">
      <ErrorBox error={changes.error} onRetry={changes.reload} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Waiting for you" value={pending.length} tone={pending.length ? 'warn' : undefined} />
        <Stat label="Approved" value={count('APPROVED')} tone="good" />
        <Stat label="Rejected" value={count('REJECTED')} />
      </div>

      <Card title={`Waiting for your decision (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty title="No requests waiting">When a station admin asks to change the pricing, it shows up here.</Empty>
        ) : (
          <ul className="space-y-4">
            {pending.map((c) => (
              <li key={c.id} className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[19px] font-semibold text-ink-900">{c.requested_by_name}{c.station_id ? ` · ${c.station_id}` : ''}</div>
                    <div className="text-cell text-ink-600">Asked {dt(c.created_at)} to change {c.diff.length} {c.diff.length === 1 ? 'setting' : 'settings'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" disabled={act.busy} onClick={() => { setNote(''); setRejecting(c.id); }}>Reject</Button>
                    <Button size="sm" loading={act.busy} onClick={() => decide(c.id, true)}>Approve</Button>
                  </div>
                </div>
                <DiffList diff={c.diff} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Approval log">
        <DataTable
          rows={history}
          rowKey={(c) => c.id}
          onRowClick={setOpen}
          empty="Decisions will be listed here."
          cols={[
            { key: 'created_at', header: 'Requested', render: (c) => dt(c.created_at) },
            { key: 'who', header: 'Station admin', render: (c) => <span>{c.requested_by_name}{c.station_id ? <span className="block text-sm text-ink-600">{c.station_id}</span> : null}</span> },
            { key: 'what', header: 'Changes', render: (c) => <span>{diffSummary(c.diff)}</span> },
            { key: 'status', header: 'Status', render: (c) => <Badge value={c.status} /> },
            { key: 'by', header: 'Decided by', render: (c) => (c.decided_by_name ? <span>{c.decided_by_name}<span className="block text-sm text-ink-600">{c.decided_at ? dt(c.decided_at) : ''}</span></span> : '—') },
            { key: 'note', header: 'Note', render: (c) => <span className="block max-w-[220px] truncate">{c.decision_note || '—'}</span> },
          ]}
        />
      </Card>

      <Modal open={rejecting !== null} onClose={() => setRejecting(null)} title="Reject this request?" footer={
        <>
          <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button loading={act.busy} onClick={async () => { const id = rejecting; setRejecting(null); if (id !== null) await decide(id, false, note); }}>Reject request</Button>
        </>
      }>
        <Field label="Note for the station admin (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Why was it rejected?" /></Field>
      </Modal>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Request from ${open.requested_by_name}` : ''}>
        {open && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3"><Badge value={open.status} /><span className="text-body text-ink-700">{dt(open.created_at)}</span></div>
            <DiffList diff={open.diff} />
            {open.decided_by_name && <p className="text-body text-ink-700">Decided by <b className="font-semibold text-ink-900">{open.decided_by_name}</b>{open.decided_at ? ` on ${dt(open.decided_at)}` : ''}.</p>}
            {open.decision_note && <p className="rounded-lg bg-ink-50 p-3 text-body text-ink-800">Note: {open.decision_note}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

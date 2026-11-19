'use client';
import { useEffect, useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { dt, pkr, saveBlob } from '@/lib/format';
import { Badge, Button, Card, DataTable, ErrorBox, Field, Input, Loading, Modal, PageHeader, Stat, Toolbar } from '@/components/ui';
import { AutoView } from '@/components/AutoView';

const iso = (d: string, end = false) => new Date(`${d}T${end ? '23:59:59' : '00:00:00'}`).toISOString();
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const pct = (n?: number | null) => (n == null ? '—' : `${n}%`);

export default function Reports() {
  const [start, setStart] = useState(day(-30));
  const [end, setEnd] = useState(day(0));
  const [applied, setApplied] = useState({ start, end });
  const q = { start: iso(applied.start), end: iso(applied.end, true) };
  const summary = useApi(() => Admin.summary(q), [applied.start, applied.end]);
  const log = useApi(() => Admin.reportLog(q), [applied.start, applied.end]);
  const [open, setOpen] = useState<any>(null);
  const act = useAction();

  // Swaps and payments land in the ledger as they happen; poll so the page stays current.
  useEffect(() => {
    const t = setInterval(() => { summary.reload(); log.reload(); }, 20000);
    return () => clearInterval(t);
  });

  const s = summary.data;
  const rows: any[] = log.data?.rows || [];
  const presets: [string, number][] = [['Today', 0], ['7 days', -7], ['30 days', -30], ['90 days', -90]];

  return (
    <>
      <PageHeader title="Reports" desc="Live revenue ledger: every swap, delivery, bill and locker pass, priced by SoC and SoH." actions={
        <Button variant="dark" loading={act.busy} onClick={async () => {
          const blob = await act.run(() => Admin.revenueCsv(q), 'CSV downloaded');
          if (blob) saveBlob(blob, `voltora-ledger_${applied.start}_${applied.end}.csv`);
        }}>Download CSV</Button>
      } />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Net revenue" value={pkr(s?.revenue_pkr ?? 0)} tone="good" />
        <Stat label="Swaps completed" value={s?.swaps ?? 0} />
        <Stat label="SoC charges" value={pkr(s?.soc_charge_pkr ?? 0)} />
        <Stat label="SoH charges" value={pkr(s?.soh_charge_pkr ?? 0)} />
        <Stat label="Unpaid bills" value={pkr(s?.outstanding_bills_pkr ?? 0)} tone="warn" />
        <Stat label="Active passes" value={s?.active_subscriptions ?? 0} />
        <Stat label="Open alerts" value={s?.open_alerts ?? 0} />
      </div>
      <Card title="Transaction log" subtitle={`${rows.length} payments · ${applied.start} → ${applied.end}`}>
        <Toolbar>
          <Field label="From"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <Button onClick={() => setApplied({ start, end })}>Apply</Button>
          <div className="flex gap-1 pb-0.5">
            {presets.map(([l, o]) => (
              <Button key={l} size="sm" variant="ghost" onClick={() => { const a = day(o), b = day(0); setStart(a); setEnd(b); setApplied({ start: a, end: b }); }}>{l}</Button>
            ))}
          </div>
        </Toolbar>
        <ErrorBox error={log.error || summary.error} onRetry={log.reload} />
        {log.loading && !log.data ? <Loading /> : (
          <DataTable rows={rows} rowKey={(r) => r.payment_id} onRowClick={setOpen} empty="No payments in this period." cols={[
            { key: 'date', header: 'Date', render: (r) => dt(r.date) },
            { key: 'kind', header: 'Type', render: (r) => <Badge value={r.kind} /> },
            { key: 'reference', header: 'Reference', render: (r) => <span className="font-mono">{r.reference}</span> },
            { key: 'station', header: 'Station', render: (r) => r.station_id || '—' },
            { key: 'rider', header: 'Rider' },
            { key: 'soc', header: 'SoC used', align: 'right', render: (r) => pct(r.soc_used_pct) },
            { key: 'soh', header: 'SoH', align: 'right', render: (r) => pct(r.soh_pct) },
            { key: 'paid', header: 'Paid', align: 'right', render: (r) => r.status === 'UNPAID' ? <span className="font-semibold text-red-600">Unpaid {pkr(r.unpaid_pkr)}</span> : pkr(r.paid_pkr) },
            { key: 'net', header: 'Net', align: 'right', render: (r) => <b>{pkr(r.net_pkr)}</b> },
          ]} />
        )}
        {log.data && (
          <div className="mt-4 flex flex-wrap justify-end gap-6 border-t border-ink-100 pt-3 text-sm">
            <span>Paid <b>{pkr(log.data.totals.paid_pkr)}</b></span>
            <span>Net <b>{pkr(log.data.totals.net_pkr)}</b></span>
            {log.data.totals.unpaid_pkr > 0 && <span className="font-semibold text-red-600">Unpaid {pkr(log.data.totals.unpaid_pkr)}</span>}
          </div>
        )}
      </Card>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.kind} · ${open.reference}` : ''} wide>
        {open && <AutoView data={open} />}
      </Modal>
    </>
  );
}

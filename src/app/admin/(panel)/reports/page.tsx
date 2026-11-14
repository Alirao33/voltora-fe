'use client';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { saveBlob } from '@/lib/format';
import { AutoView, RawJson } from '@/components/AutoView';
import { Button, Card, ErrorBox, Field, Input, Loading, PageHeader, Toolbar } from '@/components/ui';

const iso = (d: string, end = false) => (d ? new Date(`${d}T${end ? '23:59:59' : '00:00:00'}`).toISOString() : undefined);
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

export default function Reports() {
  const [start, setStart] = useState(day(-30));
  const [end, setEnd] = useState(day(0));
  const [applied, setApplied] = useState({ start, end });
  const summary = useApi(() => Admin.summary({ start: iso(applied.start), end: iso(applied.end, true) }), [applied.start, applied.end]);
  const act = useAction();

  const presets: [string, number][] = [['Today', 0], ['7 days', -7], ['30 days', -30], ['90 days', -90]];

  return (
    <>
      <PageHeader title="Reports" desc="Revenue, usage and host payouts for any period." actions={
        <Button variant="dark" loading={act.busy} onClick={async () => {
          const blob = await act.run(() => Admin.revenueCsv({ start: iso(applied.start), end: iso(applied.end, true) }), 'CSV downloaded');
          if (blob) saveBlob(blob, `voltora-revenue_${applied.start}_${applied.end}.csv`);
        }}>Download revenue CSV</Button>
      } />
      <Card>
        <Toolbar>
          <Field label="From"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <Button onClick={() => setApplied({ start, end })}>Apply</Button>
          <div className="flex gap-1 pb-0.5">
            {presets.map(([l, o]) => (
              <Button key={l} size="sm" variant="ghost" onClick={() => { const s = day(o), e = day(0); setStart(s); setEnd(e); setApplied({ start: s, end: e }); }}>{l}</Button>
            ))}
          </div>
        </Toolbar>
        <ErrorBox error={summary.error} onRetry={summary.reload} />
        {summary.loading ? <Loading /> : <><AutoView data={summary.data} /><RawJson data={summary.data} /></>}
      </Card>
    </>
  );
}

'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { ENUMS } from '@/lib/types';
import { ago, dt, enumLabel } from '@/lib/format';
import { Badge, Button, Card, Checkbox, Empty, ErrorBox, Field, Loading, PageHeader, Select, Toolbar } from '@/components/ui';

export default function Alerts() {
  const [resolved, setResolved] = useState(false);
  const [type, setType] = useState('');
  const { data, loading, error, reload, setData } = useApi(() => Admin.alerts({ resolved, type, limit: 500 }), [resolved, type]);
  const act = useAction();

  const patch = (r?: any) => r && setData((d) => (d || []).map((a) => (a.id === r.id ? r : a)).filter((a) => resolved || !a.resolved));

  return (
    <>
      <PageHeader title="Alerts" desc="Weak or overheating packs, stock-outs, lockouts and supply issues." />
      <Card>
        <Toolbar>
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)} placeholder="All types" options={ENUMS.AlertType} /></Field>
          <div className="pb-2"><Checkbox label="Show resolved" checked={resolved} onChange={(e) => setResolved(e.target.checked)} /></div>
          <Button variant="ghost" onClick={reload}>Refresh</Button>
        </Toolbar>
        <ErrorBox error={error} onRetry={reload} />
        {loading ? <Loading /> : data?.length ? (
          <ul className="divide-y divide-ink-100">
            {data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start gap-4 py-4">
                <div className="w-24 shrink-0"><Badge value={a.severity} /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink-900">{a.message}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-500">
                    <span>{enumLabel(a.type)}</span>
                    {a.station_id && <span>station <span className="font-mono">{a.station_id}</span></span>}
                    {a.pack_id && <Link href={`/admin/batteries/${encodeURIComponent(a.pack_id)}`} className="text-volt-700">pack <span className="font-mono">{a.pack_id}</span></Link>}
                    <span title={dt(a.created_at)}>{ago(a.created_at)}</span>
                    {a.acknowledged && <span>· acknowledged</span>}
                    {a.resolved && <span>· resolved</span>}
                  </div>
                </div>
                {!a.resolved && (
                  <div className="flex gap-2">
                    {!a.acknowledged && <Button size="sm" variant="secondary" disabled={act.busy} onClick={async () => patch(await act.run(() => Admin.ackAlert(a.id), 'Acknowledged'))}>Acknowledge</Button>}
                    <Button size="sm" variant="dark" disabled={act.busy} onClick={async () => patch(await act.run(() => Admin.resolveAlert(a.id), 'Resolved'))}>Resolve</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <Empty title={resolved ? 'No alerts' : 'No open alerts'}>{resolved ? '' : 'Everything is running smoothly.'}</Empty>}
      </Card>
    </>
  );
}

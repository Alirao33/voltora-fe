'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { ENUMS } from '@/lib/types';
import { ago, dt, enumLabel } from '@/lib/format';
import { Badge, Button, Card, Checkbox, Empty, ErrorBox, Field, Loading, PageHeader, Select, Toolbar } from '@/components/ui';

const SEV: Record<string, { box: string; path: string }> = {
  CRITICAL: { box: 'bg-status-danger-bg text-status-danger-fg', path: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' },
  WARNING: { box: 'bg-status-warning-bg text-status-warning-fg', path: 'M12 8v5M12 16.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
  INFO: { box: 'bg-status-info-bg text-status-info-fg', path: 'M12 11v5M12 7.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
};

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
          <Button variant="secondary" onClick={reload}>↻ Refresh</Button>
        </Toolbar>
        <ErrorBox error={error} onRetry={reload} />
        {loading ? <Loading /> : data?.length ? (
          <ul className="divide-y divide-line">
            {data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start gap-4 py-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${(SEV[String(a.severity).toUpperCase()] || SEV.INFO).box}`} aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={(SEV[String(a.severity).toUpperCase()] || SEV.INFO).path} /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-body font-medium text-ink-900">{a.message}</span><Badge value={a.severity} /></div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-cell text-ink-600">
                    <span>{enumLabel(a.type)}</span>
                    {a.station_id && <span>station <span className="id-mono">{a.station_id}</span></span>}
                    {a.pack_id && <Link href={`/admin/batteries/${encodeURIComponent(a.pack_id)}`} className="font-medium text-volt-700">pack <span className="id-mono">{a.pack_id}</span></Link>}
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

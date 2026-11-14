'use client';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import type { AuditOut } from '@/lib/types';
import { dt } from '@/lib/format';
import { AutoView } from '@/components/AutoView';
import { Button, Card, DataTable, ErrorBox, Field, Input, Loading, Modal, Mono, PageHeader, Select, Toolbar } from '@/components/ui';

export default function Audit() {
  const [action, setAction] = useState('');
  const [applied, setApplied] = useState('');
  const [limit, setLimit] = useState(100);
  const { data, loading, error, reload } = useApi(() => Admin.auditLogs({ action: applied, limit }), [applied, limit]);
  const [open, setOpen] = useState<AuditOut | null>(null);
  const actions = Array.from(new Set((data || []).map((a) => a.action))).sort();

  return (
    <>
      <PageHeader title="Audit log" desc="Who changed what, and when." />
      <Card>
        <Toolbar>
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(action); }}>
            <Field label="Action"><Input value={action} onChange={(e) => setAction(e.target.value)} list="audit-actions" placeholder="e.g. pricing.update" /></Field>
            <datalist id="audit-actions">{actions.map((a) => <option key={a} value={a} />)}</datalist>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
          <Field label="Limit"><Select value={String(limit)} onChange={(e) => setLimit(+e.target.value)} options={['100', '250', '500', '1000'].map((x) => ({ value: x, label: x }))} /></Field>
          <Button variant="ghost" onClick={reload}>Refresh</Button>
        </Toolbar>
        <ErrorBox error={error} onRetry={reload} />
        {loading ? <Loading /> : (
          <DataTable
            rows={data || []}
            rowKey={(a) => a.id}
            onRowClick={setOpen}
            cols={[
              { key: 'created_at', header: 'When', render: (a) => dt(a.created_at) },
              { key: 'actor', header: 'Actor', render: (a) => a.actor_name || (a.actor_id ? `#${a.actor_id}` : 'system') },
              { key: 'action', header: 'Action', render: (a) => <Mono>{a.action}</Mono> },
              { key: 'entity', header: 'Entity', render: (a) => <span>{a.entity} <Mono>{a.entity_id || ''}</Mono></span> },
              { key: 'details', header: 'Details', render: (a) => <span className="block max-w-[340px] truncate font-mono text-xs text-ink-500">{JSON.stringify(a.details)}</span> },
            ]}
          />
        )}
      </Card>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.action} wide>
        {open && <AutoView data={open} />}
      </Modal>
    </>
  );
}

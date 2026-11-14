'use client';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { ENUMS, type PlanKind, type PlanOut } from '@/lib/types';
import { pkr, toNum } from '@/lib/format';
import { Badge, Button, Card, Checkbox, DataTable, ErrorBox, Field, Input, Loading, Modal, Mono, PageHeader, Select } from '@/components/ui';

const blank = { code: '', name: '', kind: 'MONTHLY' as PlanKind, swaps_included: '30', price_pkr: '4500', duration_days: '30' };

export default function AdminPlans() {
  const { data, loading, error, reload } = useApi(() => Admin.plans(), []);
  const [creating, setCreating] = useState(false);
  const [nf, setNf] = useState({ ...blank });
  const [edit, setEdit] = useState<(PlanOut & Record<string, any>) | null>(null);
  const act = useAction();

  return (
    <>
      <PageHeader title="Plans" desc="Subscription and pay-per-swap products shown to riders." actions={<Button onClick={() => { setNf({ ...blank }); setCreating(true); }}>New plan</Button>} />
      <Card>
        <ErrorBox error={error} onRetry={reload} />
        {loading ? <Loading /> : (
          <DataTable
            rows={data || []}
            rowKey={(p) => p.id}
            cols={[
              { key: 'code', header: 'Code', render: (p) => <Mono>{p.code}</Mono> },
              { key: 'name', header: 'Name', render: (p) => <span className="font-medium">{p.name}</span> },
              { key: 'kind', header: 'Kind', render: (p) => <Badge value={p.kind} /> },
              { key: 'swaps_included', header: 'Swaps', align: 'right', render: (p) => p.swaps_included },
              { key: 'price_pkr', header: 'Price', align: 'right', render: (p) => pkr(p.price_pkr) },
              { key: 'per', header: 'Per swap', align: 'right', render: (p) => (p.swaps_included ? pkr(p.price_pkr / p.swaps_included) : '—') },
              { key: 'duration_days', header: 'Days', align: 'right', render: (p) => p.duration_days },
              { key: 'is_active', header: 'Status', render: (p) => <Badge value={p.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
              { key: 'a', header: '', render: (p) => <Button size="sm" variant="secondary" onClick={() => setEdit({ ...p })}>Edit</Button> },
            ]}
          />
        )}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="New plan" footer={
        <>
          <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          <Button loading={act.busy} onClick={async () => {
            const r = await act.run(() => Admin.createPlan({ code: nf.code, name: nf.name, kind: nf.kind, swaps_included: Number(nf.swaps_included), price_pkr: Number(nf.price_pkr), duration_days: Number(nf.duration_days) }), 'Plan created');
            if (r) { setCreating(false); reload(); }
          }}>Create</Button>
        </>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" hint="2–30 chars, used in URLs"><Input value={nf.code} onChange={(e) => setNf({ ...nf, code: e.target.value })} maxLength={30} /></Field>
          <Field label="Name"><Input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} maxLength={80} /></Field>
          <Field label="Kind"><Select value={nf.kind} onChange={(e) => setNf({ ...nf, kind: e.target.value as PlanKind })} options={ENUMS.PlanKind} /></Field>
          <Field label="Swaps included"><Input type="number" min={0} max={1000} value={nf.swaps_included} onChange={(e) => setNf({ ...nf, swaps_included: e.target.value })} /></Field>
          <Field label="Price (PKR)"><Input type="number" min={0} value={nf.price_pkr} onChange={(e) => setNf({ ...nf, price_pkr: e.target.value })} /></Field>
          <Field label="Duration (days)"><Input type="number" min={1} max={366} value={nf.duration_days} onChange={(e) => setNf({ ...nf, duration_days: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${edit?.code}`} footer={
        <>
          <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          <Button loading={act.busy} onClick={async () => {
            const r = await act.run(() => Admin.updatePlan(edit!.code, {
              name: edit!.name, swaps_included: toNum(String(edit!.swaps_included)), price_pkr: toNum(String(edit!.price_pkr)),
              duration_days: toNum(String(edit!.duration_days)), is_active: edit!.is_active,
            }), 'Plan updated');
            if (r) { setEdit(null); reload(); }
          }}>Save</Button>
        </>
      }>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Swaps included"><Input type="number" value={edit.swaps_included} onChange={(e) => setEdit({ ...edit, swaps_included: e.target.value as any })} /></Field>
            <Field label="Price (PKR)"><Input type="number" value={edit.price_pkr} onChange={(e) => setEdit({ ...edit, price_pkr: e.target.value as any })} /></Field>
            <Field label="Duration (days)"><Input type="number" value={edit.duration_days} onChange={(e) => setEdit({ ...edit, duration_days: e.target.value as any })} /></Field>
            <div className="flex items-end pb-2"><Checkbox label="Active (visible to riders)" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /></div>
          </div>
        )}
      </Modal>
    </>
  );
}

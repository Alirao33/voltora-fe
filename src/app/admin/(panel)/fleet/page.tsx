'use client';
import { useState } from 'react';
import { Admin, Users } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { ENUMS, type VanOut, type VanTaskOut } from '@/lib/types';
import { dt, num, toNum } from '@/lib/format';
import { AutoView, RawJson } from '@/components/AutoView';
import { Badge, Button, Card, Checkbox, DataTable, ErrorBox, Field, Input, Loading, Modal, Mono, PageHeader, Select, Tabs, Toolbar } from '@/components/ui';

export default function Fleet() {
  const [tab, setTab] = useState<'vans' | 'tasks'>('vans');
  const vans = useApi(() => Admin.vans(), []);
  const drivers = useApi(() => Users.list().then((u) => u.filter((x) => x.role === 'DRIVER')), []);
  const [tStatus, setTStatus] = useState('PENDING');
  const [tVan, setTVan] = useState('');
  const tasks = useApi(() => Admin.vanTasks({ status: tStatus, van_id: tVan }), [tStatus, tVan]);
  const act = useAction();

  const [vanForm, setVanForm] = useState<any>(null); // create or edit
  const [route, setRoute] = useState<{ van: VanOut; data: any } | null>(null);
  const [assign, setAssign] = useState<VanTaskOut | null>(null);
  const [assignVan, setAssignVan] = useState('');

  const vanName = (id?: number | null) => (id == null ? '—' : vans.data?.find((v) => v.id === id)?.name ?? `#${id}`);
  const driverName = (id?: number | null) => {
    if (id == null) return '—';
    const d = drivers.data?.find((x) => x.id === id);
    return d ? d.full_name || d.username || d.phone || `#${id}` : `#${id}`;
  };

  const saveVan = async () => {
    const f = vanForm;
    const body: any = { driver_id: toNum(f.driver_id), capacity: toNum(f.capacity), depot_station_id: f.depot_station_id || null };
    const r = f.id
      ? await act.run(() => Admin.updateVan(f.id, { ...body, is_active: f.is_active }), 'Van updated')
      : await act.run(() => Admin.createVan({ ...body, name: f.name, latitude: toNum(f.latitude), longitude: toNum(f.longitude) }), 'Van added');
    if (r) { setVanForm(null); vans.reload(); }
  };

  return (
    <>
      <PageHeader title="Vans & routes" desc="Rebalancing and home-delivery fleet." actions={
        <Button onClick={() => setVanForm({ name: '', driver_id: '', capacity: '20', depot_station_id: '', latitude: '', longitude: '' })}>Add van</Button>
      } />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'vans', label: 'Vans' }, { value: 'tasks', label: 'Tasks' }]} />

      {tab === 'vans' ? (
        <Card>
          <ErrorBox error={vans.error} onRetry={vans.reload} />
          {vans.loading ? <Loading /> : (
            <DataTable
              rows={vans.data || []}
              rowKey={(v) => v.id}
              cols={[
                { key: 'id', header: 'ID', render: (v) => <Mono>{v.id}</Mono> },
                { key: 'name', header: 'Name', render: (v) => <span className="font-medium">{v.name}</span> },
                { key: 'driver', header: 'Driver', render: (v) => driverName(v.driver_id) },
                { key: 'capacity', header: 'Capacity', align: 'right', render: (v) => v.capacity },
                { key: 'depot', header: 'Depot', render: (v) => <Mono>{v.depot_station_id || '—'}</Mono> },
                { key: 'pos', header: 'Last position', render: (v) => v.latitude != null ? (
                  <a className="font-mono text-xs text-volt-700" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}>{num(v.latitude, 4)}, {num(v.longitude, 4)}</a>
                ) : '—' },
                { key: 'is_active', header: 'Status', render: (v) => <Badge value={v.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
                {
                  key: 'a', header: '', render: (v) => (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="dark" disabled={act.busy} onClick={async () => { const r = await act.run(() => Admin.generateRoute(v.id), 'Route generated'); if (r) { setRoute({ van: v, data: r }); tasks.reload(); } }}>Plan route</Button>
                      <Button size="sm" variant="secondary" onClick={() => setVanForm({ id: v.id, name: v.name, driver_id: v.driver_id ?? '', capacity: v.capacity, depot_station_id: v.depot_station_id ?? '', is_active: v.is_active })}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setTVan(String(v.id)); setTab('tasks'); }}>Tasks</Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Card>
      ) : (
        <Card>
          <Toolbar>
            <Field label="Status"><Select value={tStatus} onChange={(e) => setTStatus(e.target.value)} placeholder="All" options={ENUMS.TaskStatus} /></Field>
            <Field label="Van"><Select value={tVan} onChange={(e) => setTVan(e.target.value)} placeholder="All vans" options={(vans.data || []).map((v) => ({ value: String(v.id), label: v.name }))} /></Field>
            <Button variant="ghost" onClick={tasks.reload}>Refresh</Button>
          </Toolbar>
          <ErrorBox error={tasks.error} onRetry={tasks.reload} />
          {tasks.loading ? <Loading /> : (
            <DataTable
              rows={(tasks.data || []).slice().sort((a, b) => (a.van_id ?? 0) - (b.van_id ?? 0) || a.seq - b.seq)}
              rowKey={(t) => t.id}
              empty="No tasks. Use “Plan route” on a van to generate rebalancing stops."
              cols={[
                { key: 'id', header: '#', render: (t) => <Mono>{t.id}</Mono> },
                { key: 'van', header: 'Van', render: (t) => vanName(t.van_id) },
                { key: 'seq', header: 'Seq', align: 'right', render: (t) => t.seq },
                { key: 'kind', header: 'Kind', render: (t) => <Badge value={t.kind} /> },
                { key: 'where', header: 'Stop', render: (t) => <span className="block max-w-[220px] truncate">{t.station_id ? <Mono>{t.station_id}</Mono> : t.address || '—'}{t.order_id ? ` · order #${t.order_id}` : ''}</span> },
                { key: 'drop', header: 'Drop', align: 'right', render: (t) => `${t.confirmed_drop ?? '–'} / ${t.drop_count}` },
                { key: 'pick', header: 'Pick', align: 'right', render: (t) => `${t.confirmed_pickup ?? '–'} / ${t.pickup_count}` },
                { key: 'priority', header: 'Priority', align: 'right', render: (t) => num(t.priority, 2) },
                { key: 'distance_km', header: 'km', align: 'right', render: (t) => num(t.distance_km) },
                { key: 'status', header: 'Status', render: (t) => <Badge value={t.status} /> },
                { key: 'confirmed_at', header: 'Confirmed', render: (t) => dt(t.confirmed_at) },
                { key: 'a', header: '', render: (t) => t.status === 'PENDING' ? <Button size="sm" variant="secondary" onClick={() => { setAssign(t); setAssignVan(String(t.van_id ?? '')); }}>Assign</Button> : null },
              ]}
            />
          )}
        </Card>
      )}

      <Modal open={!!vanForm} onClose={() => setVanForm(null)} title={vanForm?.id ? `Edit ${vanForm.name}` : 'Add van'} footer={
        <><Button variant="ghost" onClick={() => setVanForm(null)}>Cancel</Button><Button loading={act.busy} onClick={saveVan}>{vanForm?.id ? 'Save' : 'Add van'}</Button></>
      }>
        {vanForm && (
          <div className="grid gap-4 sm:grid-cols-2">
            {!vanForm.id && <Field label="Name" className="sm:col-span-2"><Input value={vanForm.name} onChange={(e) => setVanForm({ ...vanForm, name: e.target.value })} maxLength={60} /></Field>}
            <Field label="Delivery man" hint={drivers.data?.length ? undefined : 'Promote a user to Driver under Users first'}>
              <Select value={String(vanForm.driver_id)} onChange={(e) => setVanForm({ ...vanForm, driver_id: e.target.value })} placeholder="Unassigned"
                options={(drivers.data || []).map((d) => ({ value: String(d.id), label: d.full_name || d.username || d.phone || `#${d.id}` }))} />
            </Field>
            <Field label="Capacity (packs)"><Input type="number" min={1} max={200} value={vanForm.capacity} onChange={(e) => setVanForm({ ...vanForm, capacity: e.target.value })} /></Field>
            <Field label="Depot station ID"><Input value={vanForm.depot_station_id} onChange={(e) => setVanForm({ ...vanForm, depot_station_id: e.target.value })} /></Field>
            {vanForm.id ? (
              <div className="flex items-end pb-2"><Checkbox label="Active" checked={!!vanForm.is_active} onChange={(e) => setVanForm({ ...vanForm, is_active: e.target.checked })} /></div>
            ) : (
              <>
                <Field label="Start latitude"><Input type="number" step="any" value={vanForm.latitude} onChange={(e) => setVanForm({ ...vanForm, latitude: e.target.value })} /></Field>
                <Field label="Start longitude"><Input type="number" step="any" value={vanForm.longitude} onChange={(e) => setVanForm({ ...vanForm, longitude: e.target.value })} /></Field>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!route} onClose={() => setRoute(null)} wide title={`Route for ${route?.van.name}`} footer={<Button onClick={() => { setTVan(String(route!.van.id)); setTab('tasks'); setRoute(null); }}>View tasks</Button>}>
        {route && <><AutoView data={route.data} /><RawJson data={route.data} /></>}
      </Modal>

      <Modal open={!!assign} onClose={() => setAssign(null)} title={`Assign task #${assign?.id}`} footer={
        <>
          <Button variant="ghost" onClick={() => setAssign(null)}>Cancel</Button>
          <Button loading={act.busy} disabled={!assignVan} onClick={async () => { const r = await act.run(() => Admin.assignTask(assign!.id, Number(assignVan)), 'Task assigned'); if (r) { setAssign(null); tasks.reload(); } }}>Assign</Button>
        </>
      }>
        <Field label="Van"><Select value={assignVan} onChange={(e) => setAssignVan(e.target.value)} placeholder="Choose a van" options={(vans.data || []).filter((v) => v.is_active).map((v) => ({ value: String(v.id), label: `${v.name} (${driverName(v.driver_id)})` }))} /></Field>
      </Modal>
    </>
  );
}

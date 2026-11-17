'use client';
import { useState } from 'react';
import { Admin, stationId, stationName } from '@/lib/endpoints';
import { asList } from '@/lib/api';
import { useAction, useApi } from '@/lib/hooks';
import { ENUMS, type DoorLockState, type LockerStatus } from '@/lib/types';
import { num, toNum } from '@/lib/format';
import { isSuperAdmin, useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { AutoView, fmtValue } from '@/components/AutoView';
import { Badge, Button, Card, Checkbox, DataTable, ErrorBox, Field, Input, Loading, Modal, Mono, PageHeader, Select, Tabs, Toolbar } from '@/components/ui';

const blankSite = { id: '', name: '', latitude: '', longitude: '', address: '', total_lockers: '10', host_name: '', host_revenue_share_pct: '0', is_depot: false };

export default function SitesPage() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);

  const [tab, setTab] = useState<'sites' | 'occupancy'>('sites');
  const sites = useApi(() => Admin.sites(), []);
  const [occStatus, setOccStatus] = useState('');
  const [withLockers, setWithLockers] = useState(true);
  const occ = useApi(() => Admin.occupancy({ occupancy_status: occStatus as any, include_lockers: withLockers }), [occStatus, withLockers], { skip: tab !== 'occupancy' });
  const act = useAction();
  const toast = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [site, setSite] = useState({ ...blankSite });
  const [edit, setEdit] = useState<any>(null);
  const [lockerFor, setLockerFor] = useState<string | null>(null);
  const [locker, setLocker] = useState({ id: '', door_number: '', max_battery_capacity: '2', current_occupied_batteries: '0', status: 'AVAILABLE' as LockerStatus, door_lock_state: 'LOCKED' as DoorLockState, reserved_for_user_id: '' });
  const [editLocker, setEditLocker] = useState<any>(null);
  const [view, setView] = useState<any>(null);

  const list = asList(sites.data);

  const createSite = async () => {
    if (Number(site.total_lockers) < 10) { toast.error('A station needs at least 10 lockers.'); return; }
    const r = await act.run(() => Admin.createSite({
      id: site.id || null, name: site.name, latitude: Number(site.latitude), longitude: Number(site.longitude), address: site.address,
      total_lockers: Number(site.total_lockers), host_name: site.host_name || null, host_revenue_share_pct: Number(site.host_revenue_share_pct) || 0, is_depot: site.is_depot,
    }), 'Site created');
    if (r) { setCreateOpen(false); setSite({ ...blankSite }); sites.reload(); }
  };

  const saveSite = async () => {
    if (edit.total_lockers !== '' && Number(edit.total_lockers) < 10) { toast.error('A station needs at least 10 lockers.'); return; }
    const r = await act.run(() => Admin.updateSite(edit._id, {
      name: edit.name || null, address: edit.address || null, total_lockers: toNum(edit.total_lockers), host_name: edit.host_name || null,
      host_revenue_share_pct: toNum(edit.host_revenue_share_pct), target_stock: toNum(edit.target_stock), is_active: edit.is_active,
    }), 'Site updated');
    if (r) { setEdit(null); sites.reload(); }
  };

  const createLocker = async () => {
    const r = await act.run(() => Admin.createLocker({
      id: locker.id || null, site_id: lockerFor!, door_number: locker.door_number || null, max_battery_capacity: Number(locker.max_battery_capacity),
      current_occupied_batteries: Number(locker.current_occupied_batteries), status: locker.status, door_lock_state: locker.door_lock_state,
      reserved_for_user_id: toNum(locker.reserved_for_user_id),
    }), 'Locker added');
    if (r) { setLockerFor(null); occ.reload(); }
  };

  const saveLocker = async () => {
    const r = await act.run(() => Admin.updateLocker(editLocker._id, {
      status: editLocker.status || null, max_battery_capacity: toNum(editLocker.max_battery_capacity), door_lock_state: editLocker.door_lock_state || null,
    }), 'Locker updated');
    if (r) { setEditLocker(null); occ.reload(); }
  };

  const openEdit = (s: any) => setEdit({ _id: stationId(s), name: s.name ?? '', address: s.address ?? '', total_lockers: s.total_lockers ?? '', host_name: s.host_name ?? '', host_revenue_share_pct: s.host_revenue_share_pct ?? '', target_stock: s.target_stock ?? '', is_active: s.is_active ?? true });
  const lockerId = (l: any) => String(l.id ?? l.locker_id ?? '');

  return (
    <>
      <PageHeader
        title="Sites & lockers"
        desc="Swap stations, depots and their locker doors."
        actions={superAdmin ? <Button onClick={() => setCreateOpen(true)}>Add site</Button> : undefined}
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'sites', label: `Sites${list.length ? ` (${list.length})` : ''}` }, { value: 'occupancy', label: 'Occupancy & lockers' }]} />

      {tab === 'sites' ? (
        <Card>
          <ErrorBox error={sites.error} onRetry={sites.reload} />
          {sites.loading ? <Loading /> : (
            <DataTable
              rows={list}
              rowKey={(s) => stationId(s)}
              onRowClick={setView}
              cols={[
                { key: 'id', header: 'ID', render: (s) => <Mono>{stationId(s)}</Mono> },
                { key: 'name', header: 'Name', render: (s) => <span className="font-medium">{stationName(s)}</span> },
                { key: 'address', header: 'Address', render: (s) => <span className="block max-w-[220px] truncate">{s.address || '—'}</span> },
                { key: 'type', header: 'Type', render: (s) => (s.is_depot ? <Badge value="DEPOT" /> : 'Station') },
                { key: 'total_lockers', header: 'Lockers', align: 'right', render: (s) => num(s.total_lockers) },
                { key: 'target_stock', header: 'Target stock', align: 'right', render: (s) => num(s.target_stock) },
                { key: 'host', header: 'Host', render: (s) => s.host_name ? `${s.host_name} (${num(s.host_revenue_share_pct)}%)` : '—' },
                { key: 'is_active', header: 'Active', render: (s) => fmtValue('is_active', s.is_active) },
                {
                  key: 'actions', header: '', render: (s) => (
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setLockerFor(stationId(s))}>+ Locker</Button>
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
            <Field label="Availability"><Select value={occStatus} onChange={(e) => setOccStatus(e.target.value)} placeholder="All" options={ENUMS.SiteAvailability} /></Field>
            <div className="pb-2"><Checkbox label="Include lockers" checked={withLockers} onChange={(e) => setWithLockers(e.target.checked)} /></div>
            <Button variant="ghost" onClick={occ.reload}>Refresh</Button>
          </Toolbar>
          <ErrorBox error={occ.error} onRetry={occ.reload} />
          {occ.loading ? <Loading /> : (
            <div className="space-y-4">
              {asList(occ.data).map((s, i) => {
                const lockers = asList(s.lockers);
                return (
                  <div key={stationId(s) || i} className="rounded-xl border border-ink-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{stationName(s)} <Mono>{stationId(s)}</Mono></div>
                        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-600">
                          {Object.entries(s).filter(([k, v]) => typeof v === 'number' && !/lat|lon/.test(k)).map(([k, v]) => <span key={k}>{k.replace(/_/g, ' ')}: <b className="text-ink-800">{num(v as number)}</b></span>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(s.occupancy_status ?? s.availability ?? s.status) && <Badge value={s.occupancy_status ?? s.availability ?? s.status} />}
                        <Button size="sm" variant="secondary" onClick={() => setLockerFor(stationId(s))}>+ Locker</Button>
                      </div>
                    </div>
                    {lockers.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                        {lockers.map((l) => (
                          <button key={lockerId(l)} onClick={() => setEditLocker({ _id: lockerId(l), status: l.status ?? '', max_battery_capacity: l.max_battery_capacity ?? '', door_lock_state: l.door_lock_state ?? '', _raw: l })}
                            className="rounded-lg border border-ink-200 p-2.5 text-left text-xs hover:border-volt-400">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-medium">{l.door_number ?? lockerId(l)}</span>
                              <span>{l.door_lock_state === 'UNLOCKED' ? '🔓' : '🔒'}</span>
                            </div>
                            <div className="mt-1.5"><Badge value={l.status} /></div>
                            <div className="mt-1.5 text-ink-600">{l.current_occupied_batteries ?? '?'} / {l.max_battery_capacity ?? '?'} packs</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {!asList(occ.data).length && <AutoView data={occ.data} />}
            </div>
          )}
        </Card>
      )}

      {/* create site */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add site" wide footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button loading={act.busy} onClick={createSite}>Create site</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} maxLength={120} /></Field>
          <Field label="Custom ID (optional)"><Input value={site.id} onChange={(e) => setSite({ ...site, id: e.target.value })} maxLength={40} /></Field>
          <Field label="Address" className="sm:col-span-2"><Input value={site.address} onChange={(e) => setSite({ ...site, address: e.target.value })} maxLength={300} /></Field>
          <Field label="Latitude"><Input type="number" step="any" value={site.latitude} onChange={(e) => setSite({ ...site, latitude: e.target.value })} /></Field>
          <Field label="Longitude"><Input type="number" step="any" value={site.longitude} onChange={(e) => setSite({ ...site, longitude: e.target.value })} /></Field>
          <Field label="Total lockers"><Input type="number" min={10} max={500} value={site.total_lockers} onChange={(e) => setSite({ ...site, total_lockers: e.target.value })} /></Field>
          <Field label="Host name"><Input value={site.host_name} onChange={(e) => setSite({ ...site, host_name: e.target.value })} /></Field>
          <Field label="Host revenue share (%)"><Input type="number" min={0} max={100} value={site.host_revenue_share_pct} onChange={(e) => setSite({ ...site, host_revenue_share_pct: e.target.value })} /></Field>
          <div className="flex items-end pb-2"><Checkbox label="This is a depot" checked={site.is_depot} onChange={(e) => setSite({ ...site, is_depot: e.target.checked })} /></div>
        </div>
      </Modal>

      {/* edit site */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${edit?._id}`} wide footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={act.busy} onClick={saveSite}>Save</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Address"><Input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
            <Field label="Total lockers" hint="Minimum 10"><Input type="number" min={10} value={edit.total_lockers} onChange={(e) => setEdit({ ...edit, total_lockers: e.target.value })} /></Field>
            <Field label="Target stock" hint="Charged packs to keep on site (overrides forecast)"><Input type="number" value={edit.target_stock} onChange={(e) => setEdit({ ...edit, target_stock: e.target.value })} /></Field>
            <Field label="Host name"><Input value={edit.host_name} onChange={(e) => setEdit({ ...edit, host_name: e.target.value })} /></Field>
            <Field label="Host revenue share (%)"><Input type="number" value={edit.host_revenue_share_pct} onChange={(e) => setEdit({ ...edit, host_revenue_share_pct: e.target.value })} /></Field>
            <Checkbox label="Site is active" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
          </div>
        )}
      </Modal>

      {/* create locker */}
      <Modal open={!!lockerFor} onClose={() => setLockerFor(null)} title={`Add locker to ${lockerFor}`} footer={<><Button variant="ghost" onClick={() => setLockerFor(null)}>Cancel</Button><Button loading={act.busy} onClick={createLocker}>Add locker</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Locker ID (optional)"><Input value={locker.id} onChange={(e) => setLocker({ ...locker, id: e.target.value })} /></Field>
          <Field label="Door number"><Input value={locker.door_number} onChange={(e) => setLocker({ ...locker, door_number: e.target.value })} /></Field>
          <Field label="Max packs"><Select value={locker.max_battery_capacity} onChange={(e) => setLocker({ ...locker, max_battery_capacity: e.target.value })} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }]} /></Field>
          <Field label="Occupied now"><Input type="number" min={0} max={2} value={locker.current_occupied_batteries} onChange={(e) => setLocker({ ...locker, current_occupied_batteries: e.target.value })} /></Field>
          <Field label="Status"><Select value={locker.status} onChange={(e) => setLocker({ ...locker, status: e.target.value as LockerStatus })} options={ENUMS.LockerStatus} /></Field>
          <Field label="Door"><Select value={locker.door_lock_state} onChange={(e) => setLocker({ ...locker, door_lock_state: e.target.value as DoorLockState })} options={ENUMS.DoorLockState} /></Field>
          <Field label="Reserved for user ID (VIP)" className="sm:col-span-2"><Input type="number" value={locker.reserved_for_user_id} onChange={(e) => setLocker({ ...locker, reserved_for_user_id: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* edit locker */}
      <Modal open={!!editLocker} onClose={() => setEditLocker(null)} title={`Locker ${editLocker?._id}`} footer={<><Button variant="ghost" onClick={() => setEditLocker(null)}>Cancel</Button><Button loading={act.busy} onClick={saveLocker}>Save</Button></>}>
        {editLocker && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Status" hint="Only Available / Maintenance can be set manually"><Select value={editLocker.status} onChange={(e) => setEditLocker({ ...editLocker, status: e.target.value })} placeholder="Keep" options={['AVAILABLE', 'MAINTENANCE']} /></Field>
              <Field label="Max packs"><Select value={String(editLocker.max_battery_capacity)} onChange={(e) => setEditLocker({ ...editLocker, max_battery_capacity: e.target.value })} placeholder="Keep" options={[{ value: '1', label: '1' }, { value: '2', label: '2' }]} /></Field>
              <Field label="Door"><Select value={editLocker.door_lock_state} onChange={(e) => setEditLocker({ ...editLocker, door_lock_state: e.target.value })} placeholder="Keep" options={ENUMS.DoorLockState} /></Field>
            </div>
            <div className="mt-5 border-t border-ink-100 pt-4"><AutoView data={editLocker._raw} /></div>
          </>
        )}
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view ? stationName(view) : ''} wide footer={<Button variant="secondary" onClick={() => { openEdit(view); setView(null); }}>Edit</Button>}>
        <AutoView data={view} />
      </Modal>
    </>
  );
}
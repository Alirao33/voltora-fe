'use client';
import { useState } from 'react';
import { Admin, Users, stationId, stationName } from '@/lib/endpoints';
import { asList } from '@/lib/api';
import { useAction, useApi } from '@/lib/hooks';
import { ENUMS, type Role, type UserOut } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Button, Card, Checkbox, DataTable, ErrorBox, Field, Input, Loading, Modal, Mono, PageHeader, Select, Toolbar } from '@/components/ui';

type EditUser = UserOut & { _phone: string; _name: string; _station_id: string };

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data, loading, error, reload, setData } = useApi(() => Users.list(), []);
  const sites = useApi(() => Admin.sites(), []);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [edit, setEdit] = useState<EditUser | null>(null);
  const act = useAction();

  const stationList = asList(sites.data);
  const stationOptions = stationList.map((s) => ({
    value: stationId(s),
    label: `${stationName(s)} (${stationId(s)})`,
  }));
  const roleOptions = [
    ...ENUMS.Role.filter((r) => (r as string) !== 'STATION_ADMIN'),
    'STATION_ADMIN' as Role,
  ];

  const replace = (u?: UserOut) => u && setData((d) => (d || []).map((x) => (x.id === u.id ? u : x)));
  const rows = (data || []).filter((u) =>
    (!role || u.role === role) && (!q || `${u.username} ${u.full_name} ${u.phone} ${u.id}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <PageHeader title="Users" desc="Riders, drivers and administrators. Promote a user to Driver, Station Admin, or Admin from here." />
      <Card>
        <Toolbar>
          <Field label="Search"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, username, phone" /></Field>
          <Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value)} placeholder="All" options={roleOptions} /></Field>
          <span className="pb-2.5 text-sm text-ink-500">{rows.length} users</span>
        </Toolbar>
        <ErrorBox error={error} onRetry={reload} />
        {loading ? <Loading /> : (
          <DataTable
            rows={rows}
            rowKey={(u) => u.id}
            cols={[
              { key: 'id', header: 'ID', render: (u) => <Mono>{u.id}</Mono> },
              { key: 'name', header: 'Name', render: (u) => <div><div className="font-medium">{u.full_name || '—'}</div><div className="text-xs text-ink-500">{u.username || ''}</div></div> },
              { key: 'phone', header: 'Phone', render: (u) => u.phone || '—' },
              {
                key: 'role',
                header: 'Role',
                render: (u) => (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge value={u.role} />
                    {(u as any).station_id && <Mono>{String((u as any).station_id)}</Mono>}
                  </div>
                ),
              },
              { key: 'vip', header: 'VIP', render: (u) => (u.is_vip ? '★' : '') },
              { key: 'points', header: 'Points', align: 'right', render: (u) => u.points },
              { key: 'is_active', header: 'Status', render: (u) => <Badge value={u.is_active ? 'ACTIVE' : 'DISABLED'} /> },
              {
                key: 'a', header: '', render: (u) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEdit({
                        ...u,
                        _phone: u.phone || '',
                        _name: u.full_name || '',
                        _station_id: String((u as any).station_id ?? ''),
                      })}
                    >
                      Edit
                    </Button>
                    {u.id !== me?.id && (u.is_active
                      ? <Button size="sm" variant="ghost" disabled={act.busy} onClick={async () => replace(await act.run(() => Users.disable(u.id), 'User disabled'))}>Disable</Button>
                      : <Button size="sm" variant="ghost" disabled={act.busy} onClick={async () => replace(await act.run(() => Users.enable(u.id), 'User enabled'))}>Enable</Button>)}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit user #${edit?.id}`} footer={
        <>
          <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          <Button loading={act.busy} onClick={async () => {
            const isStationAdmin = (edit!.role as string) === 'STATION_ADMIN';
            const r = await act.run(() => Users.update(edit!.id, {
              role: edit!.role,
              is_vip: edit!.is_vip,
              full_name: edit!._name || null,
              phone: edit!._phone || null,
              station_id: isStationAdmin ? (edit!._station_id || null) : null,
            } as any), 'User updated');
            if (r) { replace(r); setEdit(null); }
          }}>Save</Button>
        </>
      }>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input value={edit._name} onChange={(e) => setEdit({ ...edit, _name: e.target.value })} /></Field>
            <Field label="Phone"><Input value={edit._phone} onChange={(e) => setEdit({ ...edit, _phone: e.target.value })} /></Field>
            <Field label="Role" hint={edit.role === 'DRIVER' ? 'Assign them a van under Vans & routes' : undefined}>
              <Select
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}
                options={roleOptions}
                disabled={edit.id === me?.id}
              />
            </Field>
            {(edit.role as string) === 'STATION_ADMIN' ? (
              <Field label="Assigned Station" hint="Station this admin can manage">
                <Select
                  value={edit._station_id}
                  onChange={(e) => setEdit({ ...edit, _station_id: e.target.value })}
                  placeholder="Select station"
                  options={stationOptions}
                />
              </Field>
            ) : (
              <div className="flex items-end pb-2">
                <Checkbox label="VIP (reserved slots)" checked={edit.is_vip} onChange={(e) => setEdit({ ...edit, is_vip: e.target.checked })} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
'use client';
import { useEffect, useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction } from '@/lib/hooks';
import { ENUMS, type BatteryOut, type BatteryState } from '@/lib/types';
import { Button, Field, Input, Modal, Select } from './ui';

export function BatteryStateModal({ pack, onClose, onSaved }: { pack: BatteryOut | null; onClose: () => void; onSaved: (b: BatteryOut) => void }) {
  const [state, setState] = useState<BatteryState>('CHARGED');
  const [station, setStation] = useState('');
  const [locker, setLocker] = useState('');
  const { run, busy } = useAction();
  useEffect(() => {
    if (pack) { setState(pack.state); setStation(pack.station_id || ''); setLocker(pack.locker_id || ''); }
  }, [pack]);
  return (
    <Modal open={!!pack} onClose={onClose} title={`Set state · ${pack?.id}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={busy} variant={state === 'RETIRED' ? 'danger' : 'primary'} onClick={async () => {
          const r = await run(() => Admin.setBatteryState(pack!.id, { state, station_id: station || null, locker_id: locker || null }), 'Pack updated');
          if (r) onSaved(r);
        }}>Save</Button>
      </>
    }>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="State"><Select value={state} onChange={(e) => setState(e.target.value as BatteryState)} options={ENUMS.BatteryState} /></Field>
        <Field label="Station ID"><Input value={station} onChange={(e) => setStation(e.target.value)} /></Field>
        <Field label="Locker ID"><Input value={locker} onChange={(e) => setLocker(e.target.value)} /></Field>
      </div>
      {state === 'RETIRED' && <p className="mt-3 text-sm text-red-700">Retiring removes this pack from rider circulation. It will appear under second-life candidates.</p>}
    </Modal>
  );
}

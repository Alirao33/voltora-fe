'use client';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { toNum } from '@/lib/format';
import { AutoView, RawJson } from '@/components/AutoView';
import { Button, Card, Checkbox, ErrorBox, Field, Input, Loading, PageHeader } from '@/components/ui';

export default function Forecast() {
  const models = useApi(() => Admin.models(), []);
  const drift = useApi(() => Admin.drift(), []);
  const act = useAction();
  const [xgb, setXgb] = useState(true);
  const [trainRes, setTrainRes] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [weather, setWeather] = useState({ ts: '', temp_c: '32', rain_mm: '0' });
  const [pilot, setPilot] = useState({ n_stations: '6', days: '7', seed: '42', van_capacity: '20' });
  const [pilotRes, setPilotRes] = useState<any>(null);

  return (
    <>
      <PageHeader title="Forecasting" desc="Demand models drive station target stock and van rebalancing." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Train demand model" subtitle="Retrains on order history + weather.">
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox label="Prefer XGBoost (falls back if unavailable)" checked={xgb} onChange={(e) => setXgb(e.target.checked)} />
            <Button loading={act.busy} onClick={async () => { const r = await act.run(() => Admin.train(xgb), 'Training finished'); if (r) { setTrainRes(r); models.reload(); drift.reload(); } }}>Train now</Button>
          </div>
          {trainRes && <div className="mt-5 border-t border-ink-100 pt-4"><AutoView data={trainRes} /><RawJson data={trainRes} /></div>}
        </Card>

        <Card title="Refresh station targets" subtitle="Recomputes target stock per station from the latest forecast.">
          <Button variant="dark" loading={act.busy} onClick={async () => { const r = await act.run(() => Admin.refreshTargets(), 'Targets refreshed'); if (r) setTargets(r); }}>Refresh targets</Button>
          {targets && <div className="mt-5 border-t border-ink-100 pt-4"><AutoView data={targets} /><RawJson data={targets} /></div>}
        </Card>

        <Card title="Models" actions={<Button size="sm" variant="ghost" onClick={models.reload}>Refresh</Button>}>
          <ErrorBox error={models.error} onRetry={models.reload} />
          {models.loading ? <Loading /> : <AutoView data={models.data} />}
        </Card>

        <Card title="Drift" subtitle="Forecast error vs. actual demand." actions={<Button size="sm" variant="ghost" onClick={drift.reload}>Refresh</Button>}>
          <ErrorBox error={drift.error} onRetry={drift.reload} />
          {drift.loading ? <Loading /> : <AutoView data={drift.data} />}
        </Card>

        <Card title="Log weather" subtitle="Weather is a forecast feature (heat and rain shift demand).">
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={async (e) => {
            e.preventDefault();
            await act.run(() => Admin.addWeather({ ts: weather.ts ? new Date(weather.ts).toISOString() : null, temp_c: Number(weather.temp_c), rain_mm: toNum(weather.rain_mm) ?? 0 }), 'Weather reading saved');
          }}>
            <Field label="Time (blank = now)" className="sm:col-span-2"><Input type="datetime-local" value={weather.ts} onChange={(e) => setWeather({ ...weather, ts: e.target.value })} /></Field>
            <Field label="Temp (°C)"><Input type="number" step="0.1" min={-20} max={60} value={weather.temp_c} onChange={(e) => setWeather({ ...weather, temp_c: e.target.value })} /></Field>
            <Field label="Rain (mm)"><Input type="number" step="0.1" min={0} max={500} value={weather.rain_mm} onChange={(e) => setWeather({ ...weather, rain_mm: e.target.value })} /></Field>
            <Button type="submit" loading={act.busy} className="sm:col-span-4 sm:justify-self-start">Save reading</Button>
          </form>
        </Card>

        <Card title="Pilot simulation" subtitle="Replays one demand trace with and without forecast-driven rebalancing.">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Stations"><Input type="number" min={2} max={30} value={pilot.n_stations} onChange={(e) => setPilot({ ...pilot, n_stations: e.target.value })} /></Field>
            <Field label="Days"><Input type="number" min={1} max={60} value={pilot.days} onChange={(e) => setPilot({ ...pilot, days: e.target.value })} /></Field>
            <Field label="Seed"><Input type="number" value={pilot.seed} onChange={(e) => setPilot({ ...pilot, seed: e.target.value })} /></Field>
            <Field label="Van capacity"><Input type="number" min={1} max={200} value={pilot.van_capacity} onChange={(e) => setPilot({ ...pilot, van_capacity: e.target.value })} /></Field>
          </div>
          <Button className="mt-4" loading={act.busy} onClick={async () => {
            const r = await act.run(() => Admin.pilot({ n_stations: +pilot.n_stations, days: +pilot.days, seed: +pilot.seed, van_capacity: +pilot.van_capacity }), 'Simulation complete');
            if (r) setPilotRes(r);
          }}>Run pilot</Button>
        </Card>
      </div>

      {pilotRes && (
        <Card title="Pilot results" className="mt-6"><AutoView data={pilotRes} /><RawJson data={pilotRes} /></Card>
      )}
    </>
  );
}

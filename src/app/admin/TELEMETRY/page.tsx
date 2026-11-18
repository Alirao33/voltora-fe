
'use client';
import { API_BASE } from '@/lib/api';

import React, { useEffect, useState } from 'react';

interface TelemetryReading {
  battery_id?: string;
  pack_id?: string;
  station_id: string;
  locker_slot?: string;
  slot_id?: string;
  soc: number;
  soh: number;
  temperature_c: number;
  voltage: number;
  status: string;
}

export default function AdminTelemetryPage() {
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/telemetry/latest`);
        if (!res.ok) throw new Error('Failed to fetch telemetry');

        const data = await res.json();
        if (active) setReadings(Array.isArray(data) ? data : data.readings || data.telemetry || []);
      } catch (err) {
        console.error('Failed to fetch telemetry:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-6 bg-white min-h-screen text-ink-900">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-page flex items-center gap-2 text-ink-900">
            <span>⚡</span> VOLTORA Operations & Telemetry Monitor
          </h1>
          <p className="text-xs text-ink-600">
            Real-time battery pack analytics & thermal safety lockout
          </p>
        </div>
        <div className="flex items-center gap-2 bg-ink-100/80 border border-line/60 px-3 py-1.5 rounded-full text-xs font-medium text-volt-700">
          <span className="w-2 h-2 rounded-full bg-volt-500 animate-pulse"></span>
          Live Ingestion Active
        </div>
      </div>

      {loading ? (
        <p className="text-ink-600">Connecting to telemetry stream...</p>
      ) : readings.length === 0 ? (
        <div className="p-4 bg-ink-100/50 rounded-lg text-ink-600 border border-line/40">
          No live telemetry stream detected. Start backend telemetry ingestion to populate real-time data.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {readings.map((item, index) => {
            const isOverheated = item.temperature_c >= 55;
            const batteryId = item.battery_id || item.pack_id || `BAT-${index}`;
            const slotName = item.locker_slot || item.slot_id || 'Slot';

            return (
              <div key={`${item.station_id}-${batteryId}-${index}`}
                className={`p-4 rounded-xl border transition-all ${
                  isOverheated
                    ? 'bg-red-950/40 border-red-500/50 shadow-lg shadow-red-500/10'
                    : 'bg-ink-100/60 border-line/60 hover:border-ink-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono text-ink-600">
                      {item.station_id} • {slotName}
                    </span>
                    <h3 className="font-medium text-base text-ink-800">{batteryId}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                    isOverheated
                      ? 'bg-red-500/20 text-red-700 border border-red-500/30'
                      : 'bg-volt-500/10 text-volt-700 border border-volt-200'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/60 p-2 rounded">
                    <span className="text-ink-600 block">State of Charge</span>
                    <span className="font-medium text-volt-700 text-sm">{item.soc}%</span>
                  </div>
                  <div className="bg-white/60 p-2 rounded">
                    <span className="text-ink-600 block">Temperature</span>
                    <span className={`font-medium text-sm ${isOverheated ? 'text-red-700 font-medium' : 'text-ink-800'}`}>
                      {item.temperature_c}°C
                    </span>
                  </div>
                  <div className="bg-white/60 p-2 rounded">
                    <span className="text-ink-600 block">Voltage</span>
                    <span className="font-medium text-ink-800 text-sm">{item.voltage} V</span>
                  </div>
                  <div className="bg-white/60 p-2 rounded">
                    <span className="text-ink-600 block">Health (SoH)</span>
                    <span className="font-medium text-ink-800 text-sm">{item.soh}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

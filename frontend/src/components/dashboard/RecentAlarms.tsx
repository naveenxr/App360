'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Alarm } from '../../types/alarm';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import alarmService from '../../services/alarmService';
import { ArrowUpRight, Code, Loader2 } from 'lucide-react';

interface RecentAlarmsProps {
  alarms: Alarm[];
  isLoading?: boolean;
}

export const RecentAlarms: React.FC<RecentAlarmsProps> = ({ alarms, isLoading }) => {
  const [selectedRaw, setSelectedRaw] = useState<Record<string, unknown> | null>(null);
  const [rawModalTitle, setRawModalTitle] = useState('');
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);

  const handleViewRaw = async (alarm: Alarm) => {
    setRawModalTitle(`Raw Payload - ${alarm.externalAlarmId} (${alarm.sourceId})`);
    setIsLoadingRaw(true);
    setSelectedRaw(null);
    try {
      const rawData = await alarmService.getRawPayload(alarm.id);
      setSelectedRaw(rawData.rawPayload || (alarm.rawPayload as Record<string, unknown>));
    } catch {
      // Fallback to inline raw payload if present
      setSelectedRaw(alarm.rawPayload || { message: 'Raw payload could not be loaded' });
    } finally {
      setIsLoadingRaw(false);
    }
  };

  return (
    <div className="p-6 rounded-xl border border-slate-800 bg-slate-900 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold text-slate-100">Live Ingested Alarms</h4>
            <p className="text-xs text-slate-400">Normalized multi-source telemetry stream</p>
          </div>
          <Link
            href="/alarms"
            className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span className="text-xs">Streaming alarms...</span>
          </div>
        ) : alarms.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No active alarms detected. Telemetry streams normal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Alarm ID</th>
                  <th className="py-2.5 px-3">Site / Device</th>
                  <th className="py-2.5 px-3">Message</th>
                  <th className="py-2.5 px-3">Occurred At</th>
                  <th className="py-2.5 px-3 text-right">Raw</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {alarms.slice(0, 7).map((alarm) => (
                  <tr key={alarm.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-sans">
                      <Badge variant="severity" severity={alarm.severity} />
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {alarm.externalAlarmId}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-indigo-300">{alarm.siteId}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-slate-200">{alarm.deviceId}</span>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-300 max-w-[200px] truncate" title={alarm.message}>
                      {alarm.message}
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">
                      {new Date(alarm.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-right font-sans">
                      <button
                        onClick={() => handleViewRaw(alarm)}
                        title="View Untouched Raw JSON"
                        className="p-1 rounded bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-400 border border-slate-700 transition-colors"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Payload Modal */}
      <Modal
        isOpen={Boolean(selectedRaw || isLoadingRaw)}
        onClose={() => setSelectedRaw(null)}
        title={rawModalTitle}
        maxWidth="2xl"
      >
        {isLoadingRaw ? (
          <div className="py-8 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span className="text-sm">Fetching immutable audit wire payload...</span>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">Lossless Raw Telemetry Payload (JSON)</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Audited Wire Format
              </span>
            </div>
            <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono overflow-x-auto max-h-[60vh]">
              {JSON.stringify(selectedRaw, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecentAlarms;

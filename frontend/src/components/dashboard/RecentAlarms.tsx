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
      setSelectedRaw(alarm.rawPayload || { message: 'Raw payload could not be loaded' });
    } finally {
      setIsLoadingRaw(false);
    }
  };

  return (
    <div className="p-6 rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-[#172B4D]">Live Ingested Alarms</h4>
            <p className="text-xs text-[#64748B]">Normalized multi-source telemetry stream</p>
          </div>
          <Link
            href="/alarms"
            className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center items-center text-[#64748B]">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mr-2" />
            <span className="text-xs">Streaming alarms...</span>
          </div>
        ) : alarms.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B]">
            No active alarms detected. Telemetry streams normal.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E5EAF1]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B] border-b border-[#E5EAF1]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Severity</th>
                  <th className="py-2.5 px-3 font-semibold">Alarm ID</th>
                  <th className="py-2.5 px-3 font-semibold">Site / Device</th>
                  <th className="py-2.5 px-3 font-semibold">Message</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] font-mono text-[#172B4D]">
                {alarms.map((alarm) => (
                  <tr key={alarm.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2 px-3 font-sans">
                      <Badge variant="severity" severity={alarm.severity} />
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#172B4D]">{alarm.externalAlarmId}</td>
                    <td className="py-2 px-3">
                      <span className="text-[#2563EB] font-medium">{alarm.siteId}</span>
                      <span className="text-[#94A3B8] mx-1">/</span>
                      <span className="text-[#475569]">{alarm.deviceId}</span>
                    </td>
                    <td className="py-2 px-3 font-sans text-[#475569] truncate max-w-xs">{alarm.message}</td>
                    <td className="py-2 px-3 text-[11px] text-[#64748B]">
                      {new Date(alarm.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-right font-sans">
                      <button
                        onClick={() => handleViewRaw(alarm)}
                        title="View lossless raw payload"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F7F9FC] hover:bg-[#EFF6FF] text-[#2563EB] border border-[#E5EAF1] hover:border-[#BFDBFE] transition-colors"
                      >
                        <Code className="w-3 h-3" />
                        <span>Wire</span>
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
          <div className="py-8 flex justify-center items-center text-[#64748B]">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mr-2" />
            <span className="text-sm">Fetching wire JSON payload...</span>
          </div>
        ) : (
          <pre className="p-4 rounded-lg bg-[#0F1F38] text-[#38BDF8] text-xs font-mono overflow-x-auto max-h-[60vh] border border-[#1E3A5F]">
            {JSON.stringify(selectedRaw, null, 2)}
          </pre>
        )}
      </Modal>
    </div>
  );
};

export default RecentAlarms;

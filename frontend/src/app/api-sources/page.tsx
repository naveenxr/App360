'use client';

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/api';
import { IngestionLog, TriggerIngestionResponse } from '../../types/source';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function ApiSourcesPage() {
  const { hasPermission } = useAuth();
  const canTriggerIngestion = hasPermission('api', 'create') || hasPermission('api', 'update');

  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState<TriggerIngestionResponse | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: IngestionLog[] }>('/ingestion/logs?limit=10');
      setLogs(res.data.data);
    } catch (err) {
      console.error('Failed to load ingestion logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleTriggerIngestion = async () => {
    setIsTriggering(true);
    setTriggerError(null);
    setLastBatchResult(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: TriggerIngestionResponse }>('/ingestion/trigger');
      setLastBatchResult(res.data.data);
      fetchLogs();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to execute multi-source ingestion cycle.';
      setTriggerError(msg);
    } finally {
      setIsTriggering(false);
    }
  };

  const sources = [
    {
      id: 'SOURCE_A',
      name: 'Legacy SolarWinds Ingestion',
      endpoint: '/api/mock/source-a/alarms',
      description: 'Flat vendor schema with location_code, node, level, and ISO event_time',
      format: 'JSON (Flat fields)'
    },
    {
      id: 'SOURCE_B',
      name: 'OpenNMS Incident Bus',
      endpoint: '/api/mock/source-b/incidents',
      description: 'Nested incident object with priority codes, host ref, and UTC log_time',
      format: 'JSON (Nested Object)'
    },
    {
      id: 'SOURCE_C',
      name: 'Custom Cloud Agent Stream',
      endpoint: '/api/mock/source-c/events',
      description: 'Telemetry stream with nested asset info and epoch timestamp in milliseconds',
      format: 'JSON (Epoch Milliseconds)'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EAF1]">
        <div>
          <h1 className="text-xl font-bold text-[#142B50] tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#2563EB]" />
            <span>Multi-Source Telemetry Ingestion</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Heterogeneous API adapters, lossless raw wire payload preservation and background automated ingestion
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1] shadow-sm transition-colors"
            title="Refresh Ingestion Audit Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2563EB]' : 'text-[#64748B]'}`} />
          </button>

          {canTriggerIngestion && (
            <button
              onClick={handleTriggerIngestion}
              disabled={isTriggering}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all disabled:opacity-50"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Polling All Sources...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Trigger Ingestion Batch</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Trigger Results Feedback Banner */}
      {triggerError && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC4545] text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-[#DC4545]" />
          <div>
            <p className="font-semibold">Ingestion Cycle Failed</p>
            <p className="text-[11px] text-[#B91C1C]">{triggerError}</p>
          </div>
        </div>
      )}

      {lastBatchResult && (
        <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs shadow-sm">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#A7F3D0]">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
              <span>Batch Completed: [{lastBatchResult.batchId}]</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-white text-[#16A36A] font-mono border border-[#A7F3D0] font-semibold">
              Status: {lastBatchResult.status} ({lastBatchResult.durationMs}ms)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#A7F3D0]">
              <p className="text-[#64748B] text-[10px] font-medium">Fetched Wire Items</p>
              <p className="font-bold text-[#172B4D] text-base">{lastBatchResult.totalFetched}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#A7F3D0]">
              <p className="text-[#64748B] text-[10px] font-medium">Normalized (New)</p>
              <p className="font-bold text-[#16A36A] text-base">{lastBatchResult.totalNormalized}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#A7F3D0]">
              <p className="text-[#64748B] text-[10px] font-medium">Duplicates Suppressed</p>
              <p className="font-bold text-[#2563EB] text-base">{lastBatchResult.totalDuplicates}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-[#A7F3D0]">
              <p className="text-[#64748B] text-[10px] font-medium">Failed Items</p>
              <p className="font-bold text-[#DC4545] text-base">{lastBatchResult.totalFailed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ingestion Sources Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sources.map((s) => (
          <div
            key={s.id}
            className="p-5 rounded-xl border border-[#E5EAF1] bg-white flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-cardHover transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-bold">
                  {s.id}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-[#16A36A] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#16A36A]" />
                  <span>Online</span>
                </span>
              </div>
              <h4 className="text-sm font-semibold text-[#172B4D] mb-1">{s.name}</h4>
              <p className="text-xs text-[#64748B] leading-relaxed mb-4">{s.description}</p>
            </div>

            <div className="pt-3 border-t border-[#E5EAF1] text-[11px] text-[#64748B] flex items-center justify-between">
              <span className="font-mono text-[#64748B]">{s.format}</span>
              <span className="text-[#2563EB] flex items-center gap-1 font-mono text-[10px] font-semibold">
                <span>REST</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Ingestion Audit Trail */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#E5EAF1] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold text-[#172B4D]">Ingestion Audit Execution Logs</h3>
          </div>
          <span className="text-xs text-[#64748B]">Persistent Vault (`ingestion_logs`)</span>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center items-center text-[#64748B]">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mr-2" />
            <span className="text-xs">Loading batch records...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No ingestion batches recorded yet"
              description="Click 'Trigger Ingestion Batch' above to initiate a multi-source cycle."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold border-b border-[#E5EAF1]">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Triggered By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Telemetry Counts</th>
                  <th className="py-3 px-4">Execution Time</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] font-mono text-[#172B4D]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-[#172B4D]">{log.batchId}</td>
                    <td className="py-2.5 px-4 font-sans text-xs">
                      <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                        {log.triggeredBy}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0]'
                            : log.status === 'PARTIAL'
                            ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                            : 'bg-[#FEF2F2] text-[#DC4545] border border-[#FECACA]'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-xs">
                      <span className="text-[#16A36A] font-semibold">+{log.totalNormalized} new</span>
                      <span className="text-[#94A3B8] mx-1.5">|</span>
                      <span className="text-[#2563EB]">{log.totalDuplicates} dup</span>
                      <span className="text-[#94A3B8] mx-1.5">|</span>
                      <span className="text-[#64748B]">{log.totalFetched} wire</span>
                    </td>
                    <td className="py-2.5 px-4 text-[#64748B] text-xs">
                      {log.durationMs}ms
                    </td>
                    <td className="py-2.5 px-4 text-[#64748B] text-[11px]">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

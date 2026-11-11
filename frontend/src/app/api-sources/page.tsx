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
      name: 'Network Monitoring Telemetry',
      endpoint: '/api/mock/source-a/alarms',
      description: 'Flat vendor schema with location_code, node, level, and ISO event_time',
      format: 'JSON (Flat fields)'
    },
    {
      id: 'SOURCE_B',
      name: 'Infrastructure Incident System',
      endpoint: '/api/mock/source-b/incidents',
      description: 'Nested incident object with priority (P1-P3), site, and created_at',
      format: 'JSON (Nested Object)'
    },
    {
      id: 'SOURCE_C',
      name: 'Network Connectivity Telemetry',
      endpoint: '/api/mock/source-c/events',
      description: 'Legacy uppercase payload with nested asset info and epoch timestamp in ms',
      format: 'JSON (Epoch Milliseconds)'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <span>Multi-Source Telemetry Ingestion</span>
          </h1>
          <p className="text-xs text-slate-400">
            Carrier-grade heterogeneous API adapters, raw wire preservation and background cron scheduler
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Refresh Ingestion Audit Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
          </button>

          {canTriggerIngestion && (
            <button
              onClick={handleTriggerIngestion}
              disabled={isTriggering}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
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
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Ingestion Cycle Failed</p>
            <p className="text-[11px] text-red-300">{triggerError}</p>
          </div>
        </div>
      )}

      {lastBatchResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs shadow-sm">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-emerald-500/20">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Batch Completed: [{lastBatchResult.batchId}]</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              Status: {lastBatchResult.status} ({lastBatchResult.durationMs}ms)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <p className="text-slate-400 text-[10px]">Fetched</p>
              <p className="font-bold text-slate-100">{lastBatchResult.totalFetched}</p>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <p className="text-slate-400 text-[10px]">Normalized (New)</p>
              <p className="font-bold text-emerald-400">{lastBatchResult.totalNormalized}</p>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <p className="text-slate-400 text-[10px]">Duplicates Suppressed</p>
              <p className="font-bold text-indigo-400">{lastBatchResult.totalDuplicates}</p>
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <p className="text-slate-400 text-[10px]">Failed Items</p>
              <p className="font-bold text-red-400">{lastBatchResult.totalFailed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ingestion Sources Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sources.map((s) => (
          <div
            key={s.id}
            className="p-5 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                  {s.id}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Online</span>
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-100 mb-1">{s.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{s.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="font-mono text-slate-500">{s.format}</span>
              <span className="text-indigo-400 flex items-center gap-1 font-mono text-[10px]">
                <span>REST</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Ingestion Audit Trail */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">Ingestion Audit Execution Logs</h3>
          </div>
          <span className="text-xs text-slate-400">Audit Vault (`ingestion_logs`)</span>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span className="text-xs">Loading execution history...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Ingestion Logs Recorded"
              description="Click 'Trigger Ingestion Batch' above to initiate an automated multi-source poll."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Triggered By</th>
                  <th className="py-3 px-4">Fetched</th>
                  <th className="py-3 px-4">New Normalized</th>
                  <th className="py-3 px-4">Duplicates Suppressed</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Execution Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-100">{log.batchId}</td>
                    <td className="py-2.5 px-4 font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : log.status === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-400 text-xs">
                      {log.triggeredBy} {log.triggeredByEmail && `(${log.triggeredByEmail})`}
                    </td>
                    <td className="py-2.5 px-4">{log.totalFetched}</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-semibold">{log.totalNormalized}</td>
                    <td className="py-2.5 px-4 text-indigo-400">{log.totalDuplicates}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.durationMs}ms</td>
                    <td className="py-2.5 px-4 text-right text-slate-400 text-[11px]">
                      {new Date(log.startedAt).toLocaleTimeString()}
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



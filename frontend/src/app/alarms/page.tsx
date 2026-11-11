'use client';

import React, { useState, useEffect, useCallback } from 'react';
import alarmService from '../../services/alarmService';
import { Alarm, SeverityLevel } from '../../types/alarm';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { 
  Bell, 
  Search, 
  Code, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [severity, setSeverity] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sourceId, setSourceId] = useState<string>('');
  const [siteSearch, setSiteSearch] = useState<string>('');
  const [deviceSearch, setDeviceSearch] = useState<string>('');

  // Raw Payload Modal
  const [selectedRaw, setSelectedRaw] = useState<Record<string, unknown> | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);

  const fetchAlarms = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await alarmService.getAlarms({
        page,
        limit,
        severity: severity || undefined,
        status: status || undefined,
        sourceId: sourceId || undefined,
        siteId: siteSearch || undefined,
        deviceId: deviceSearch || undefined
      });
      setAlarms(data.alarms);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to query alarms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, severity, status, sourceId, siteSearch, deviceSearch]);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  const handleViewRaw = async (alarm: Alarm) => {
    setModalTitle(`Raw Wire Audit Payload: ${alarm.externalAlarmId} [${alarm.sourceId}]`);
    setIsLoadingRaw(true);
    setSelectedRaw(null);
    try {
      const rawRes = await alarmService.getRawPayload(alarm.id);
      setSelectedRaw(rawRes.rawPayload || (alarm.rawPayload as Record<string, unknown>));
    } catch {
      setSelectedRaw(alarm.rawPayload || { note: 'Raw payload fetched from memory record' });
    } finally {
      setIsLoadingRaw(false);
    }
  };

  const handleResetFilters = () => {
    setSeverity('');
    setStatus('');
    setSourceId('');
    setSiteSearch('');
    setDeviceSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <span>Normalized Network Alarms</span>
          </h1>
          <p className="text-xs text-slate-400">
            Carrier-grade canonical alarms ingested from multi-vendor telemetry sources with lossless wire audit
          </p>
        </div>

        <button
          onClick={fetchAlarms}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Severity filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Severity</label>
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="MAJOR">Major</option>
            <option value="MINOR">Minor</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="CLEARED">Cleared</option>
          </select>
        </div>

        {/* Source ID filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Source API</label>
          <select
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Sources</option>
            <option value="SOURCE_A">Source A (Network)</option>
            <option value="SOURCE_B">Source B (Infrastructure)</option>
            <option value="SOURCE_C">Source C (Connectivity)</option>
          </select>
        </div>

        {/* Site search */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Site ID</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={siteSearch}
              onChange={(e) => {
                setSiteSearch(e.target.value.toUpperCase());
                setPage(1);
              }}
              placeholder="e.g. CHN001"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 uppercase placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Device search */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Device ID</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={deviceSearch}
              onChange={(e) => {
                setDeviceSearch(e.target.value.toUpperCase());
                setPage(1);
              }}
              placeholder="e.g. RTR001"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 uppercase placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Alarms Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <span className="text-xs">Loading alarms from persistent store...</span>
          </div>
        ) : alarms.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No alarms match current filter"
              description="Adjust your search parameters or query all severities."
              action={
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Clear All Filters
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Alarm ID</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Site / Device</th>
                  <th className="py-3 px-4">Alarm Type & Message</th>
                  <th className="py-3 px-4">Repeats</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Raw Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {alarms.map((alarm) => (
                  <tr key={alarm.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-sans">
                      <Badge variant="severity" severity={alarm.severity as SeverityLevel} />
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-100">
                      {alarm.externalAlarmId}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-400 text-[11px]">
                      {alarm.sourceId}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-indigo-400 font-semibold">{alarm.siteId}</span>
                      <span className="text-slate-600 mx-1.5">/</span>
                      <span className="text-slate-200">{alarm.deviceId}</span>
                    </td>
                    <td className="py-2.5 px-4 font-sans max-w-xs">
                      <div className="font-semibold text-slate-200 text-xs">{alarm.alarmType}</div>
                      <div className="text-slate-400 text-[11px] truncate" title={alarm.message}>
                        {alarm.message}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      {alarm.repeatCount > 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          x{alarm.repeatCount}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">x1</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {new Date(alarm.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <Badge variant="status" status={alarm.status} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <button
                        onClick={() => handleViewRaw(alarm)}
                        title="View Untouched Raw JSON"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300 border border-slate-700 text-xs transition-colors"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{alarms.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{total}</span> alarms
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-300 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Raw JSON Wire Payload Modal */}
      <Modal
        isOpen={Boolean(selectedRaw || isLoadingRaw)}
        onClose={() => setSelectedRaw(null)}
        title={modalTitle}
        maxWidth="2xl"
      >
        {isLoadingRaw ? (
          <div className="py-8 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span className="text-sm">Fetching immutable wire payload...</span>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Preserved Raw Ingestion Payload (No Transformations Applied)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Original Wire Format
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
}

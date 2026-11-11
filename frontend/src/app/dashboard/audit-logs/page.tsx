'use client';

import React, { useState, useEffect, useCallback } from 'react';
import auditService from '../../../services/auditService';
import { AuditLogItem } from '../../../types/rbac';
import Modal from '../../../components/common/Modal';
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2
} from 'lucide-react';

const ACTIONS_LIST = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'ROLE_ASSIGNED',
  'ROLE_CREATED',
  'ROLE_UPDATED',
  'PERMISSION_CHANGED'
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  // Drill-down Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditLogs({
        page,
        limit,
        search: search || undefined,
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined
      });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, limit, search, actionFilter, targetTypeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'USER_CREATED':
      case 'ROLE_CREATED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'USER_ACTIVATED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'USER_DEACTIVATED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'ROLE_ASSIGNED':
      case 'PERMISSION_CHANGED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'USER_UPDATED':
      case 'ROLE_UPDATED':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EAF1]">
        <div>
          <h1 className="text-xl font-bold text-[#172B4D] tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            <span>Immutable Administrative Audit Trail</span>
          </h1>
          <p className="text-xs text-[#64748B]">
            Cryptographically-sound administrative activity tracking, privilege alterations and security logs
          </p>
        </div>

        <button
          onClick={() => {
            setIsRefreshing(true);
            fetchLogs();
          }}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-[#172B4D] border border-[#E5EAF1] shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#2563EB]' : 'text-[#64748B]'}`} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-[#E5EAF1] shadow-sm flex flex-col md:flex-row items-center gap-4 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor name, email or target..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="w-full md:w-52 px-3 py-2 rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
        >
          <option value="">All Action Types</option>
          {ACTIONS_LIST.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>

        <select
          value={targetTypeFilter}
          onChange={(e) => {
            setTargetTypeFilter(e.target.value);
            setPage(1);
          }}
          className="w-full md:w-44 px-3 py-2 rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB]"
        >
          <option value="">All Target Types</option>
          <option value="USER">USER</option>
          <option value="ROLE">ROLE</option>
          <option value="PERMISSION">PERMISSION</option>
        </select>
      </div>

      {/* Audit Table */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#64748B] gap-3">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-xs">Querying administrative audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-[#64748B] text-xs">
            No administrative audit records found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EAF1] bg-slate-50/80 text-[#64748B] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Administrative Actor</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Origin IP</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                {logs.map((log) => {
                  const logId = log.id || log._id || '';

                  return (
                    <tr key={logId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] font-bold text-[10px]">
                            {log.actorName?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-semibold text-[#172B4D]">{log.actorName}</p>
                            <p className="text-[10px] text-[#64748B] font-mono">{log.actorEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#172B4D]">
                        <span className="text-[#64748B] text-[10px] uppercase font-semibold mr-1.5">
                          [{log.targetType}]
                        </span>
                        <span>{log.targetName || log.targetId || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#64748B] text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          title="Inspect JSON Audit Payload"
                          className="p-1.5 rounded bg-white hover:bg-blue-50 hover:text-[#2563EB] text-[#172B4D] border border-[#E5EAF1] shadow-xs transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-sans font-medium">Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        <div className="px-6 py-3.5 bg-slate-50/50 border-t border-[#E5EAF1] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing <span className="font-semibold text-[#172B4D]">{logs.length}</span> of{' '}
            <span className="font-semibold text-[#172B4D]">{total}</span> recorded events
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded bg-white hover:bg-slate-50 text-[#172B4D] disabled:opacity-40 disabled:cursor-not-allowed border border-[#E5EAF1] shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-[#172B4D] font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded bg-white hover:bg-slate-50 text-[#172B4D] disabled:opacity-40 disabled:cursor-not-allowed border border-[#E5EAF1] shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Audit Drill-Down Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event Inspection: ${selectedLog?.action || ''}`}
        maxWidth="2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-[#E5EAF1]">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Actor</span>
                <span className="text-[#172B4D] font-medium">{selectedLog.actorName} ({selectedLog.actorEmail})</span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Timestamp</span>
                <span className="text-[#172B4D] font-mono">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Target Entity</span>
                <span className="text-[#2563EB] font-mono font-medium">[{selectedLog.targetType}] {selectedLog.targetName}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] uppercase block font-semibold">Origin Client</span>
                <span className="text-[#64748B] truncate block font-mono">{selectedLog.userAgent || selectedLog.ipAddress || 'Internal Call'}</span>
              </div>
            </div>

            {/* State Diffs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-[#172B4D] mb-1.5 block">
                  Previous State Snapshot
                </span>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {selectedLog.previousValues
                    ? JSON.stringify(selectedLog.previousValues, null, 2)
                    : '// No prior state (creation event)'}
                </pre>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#172B4D] mb-1.5 block">
                  Updated State / Changes
                </span>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {selectedLog.updatedValues
                    ? JSON.stringify(selectedLog.updatedValues, null, 2)
                    : '// No state change recorded'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5EAF1]">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-[#172B4D] font-medium border border-[#E5EAF1] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

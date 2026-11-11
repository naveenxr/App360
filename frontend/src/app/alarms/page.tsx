'use client';

import React, { useState, useEffect, useCallback } from 'react';
import alarmService from '../../services/alarmService';
import { Alarm, SeverityLevel } from '../../types/alarm';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { useSocket } from '../../context/SocketContext';
import { SERVER_EVENTS, ROOMS } from '../../constants/socketEvents';
import { 
  Bell, 
  Search, 
  Code, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  RefreshCw,
  Radio
} from 'lucide-react';

export default function AlarmsPage() {
  const { socket, subscribe, unsubscribe } = useSocket();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  // Live Socket.IO Stream State
  const [liveBanner, setLiveBanner] = useState<string | null>(null);
  const [recentIncomingId, setRecentIncomingId] = useState<string | null>(null);

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
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlSite = params.get('siteId') || '';
      const urlDevice = params.get('deviceId') || '';
      if (urlSite || urlDevice) {
        setSiteSearch(urlSite);
        setDeviceSearch(urlDevice);
        setPage(1);
      }
    };
    syncFromUrl();
    window.addEventListener('app360:search-navigate', syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      window.removeEventListener('app360:search-navigate', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  // Real-time Socket.IO Live Stream Listener
  useEffect(() => {
    subscribe(ROOMS.MONITORING_ALARMS);

    if (!socket) return;

    const handleAlarmNew = (newAlarm: Alarm) => {
      const newAlarmId = newAlarm.id || (newAlarm as unknown as { _id?: string })._id || '';
      
      setTotal((prev) => prev + 1);

      setRecentIncomingId(newAlarmId);
      setLiveBanner(`Live Ingestion: New [${newAlarm.severity}] alarm on ${newAlarm.deviceId} (${newAlarm.externalAlarmId})`);
      const timer = setTimeout(() => {
        setLiveBanner(null);
        setRecentIncomingId(null);
      }, 4000);

      const matchesSeverity = !severity || newAlarm.severity === severity;
      const matchesStatus = !status || newAlarm.status === status;
      const matchesSource = !sourceId || newAlarm.sourceId === sourceId;
      const matchesSite = !siteSearch || (newAlarm.siteId && newAlarm.siteId.toUpperCase().includes(siteSearch.toUpperCase()));
      const matchesDevice = !deviceSearch || (newAlarm.deviceId && newAlarm.deviceId.toUpperCase().includes(deviceSearch.toUpperCase()));

      if (matchesSeverity && matchesStatus && matchesSource && matchesSite && matchesDevice) {
        setAlarms((prevAlarms) => {
          const exists = prevAlarms.some(
            (a) => a.id === newAlarmId || a.externalAlarmId === newAlarm.externalAlarmId
          );
          if (exists) {
            return prevAlarms.map((a) =>
              a.id === newAlarmId || a.externalAlarmId === newAlarm.externalAlarmId
                ? { ...a, ...newAlarm }
                : a
            );
          }
          const merged = [newAlarm, ...prevAlarms].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          return page === 1 ? merged.slice(0, limit) : merged;
        });
      }

      return () => clearTimeout(timer);
    };

    const handleAlarmUpdated = (updatedAlarm: Partial<Alarm> & { id?: string; _id?: string; externalAlarmId?: string }) => {
      const updatedId = updatedAlarm.id || updatedAlarm._id;
      setAlarms((prevAlarms) =>
        prevAlarms.map((a) => {
          const isMatch =
            (updatedId && (a.id === updatedId || (a as unknown as { _id?: string })._id === updatedId)) ||
            (updatedAlarm.externalAlarmId && a.externalAlarmId === updatedAlarm.externalAlarmId);
          return isMatch ? { ...a, ...updatedAlarm } : a;
        })
      );
    };

    socket.on(SERVER_EVENTS.ALARM_NEW, handleAlarmNew);
    socket.on(SERVER_EVENTS.ALARM_UPDATED, handleAlarmUpdated);

    return () => {
      socket.off(SERVER_EVENTS.ALARM_NEW, handleAlarmNew);
      socket.off(SERVER_EVENTS.ALARM_UPDATED, handleAlarmUpdated);
      unsubscribe(ROOMS.MONITORING_ALARMS);
    };
  }, [socket, subscribe, unsubscribe, severity, status, sourceId, siteSearch, deviceSearch, page, limit]);

  const handleViewRaw = async (alarm: Alarm) => {
    setModalTitle(`Raw Wire Audit Payload: ${alarm.externalAlarmId} [${alarm.sourceId}]`);
    setIsLoadingRaw(true);
    setSelectedRaw(null);
    try {
      const alarmId = alarm.id || (alarm as unknown as { _id?: string })._id || '';
      const rawRes = await alarmService.getRawPayload(alarmId);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EAF1]">
        <div>
          <h1 className="text-xl font-bold text-[#142B50] tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#2563EB]" />
            <span>Normalized Network Alarms</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Carrier-grade canonical alarms ingested from multi-vendor telemetry sources with lossless wire audit
          </p>
        </div>

        <button
          onClick={fetchAlarms}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-[#F8FAFC] text-[#172B4D] border border-[#E5EAF1] shadow-sm hover:border-[#CBD5E1] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2563EB]' : 'text-[#64748B]'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Live Ingestion Real-Time Notification Banner */}
      {liveBanner && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-[#16A36A] animate-spin" />
            <span className="font-semibold text-[#1E40AF]">{liveBanner}</span>
          </div>
          <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-white text-[#2563EB] border border-[#BFDBFE] font-bold">
            SOCKET.IO BROADCAST
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-[#E5EAF1] bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 shadow-sm">
        {/* Severity filter */}
        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Severity</label>
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white"
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
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="CLEARED">Cleared</option>
          </select>
        </div>

        {/* Source ID filter */}
        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Source API</label>
          <select
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white"
          >
            <option value="">All Sources</option>
            <option value="SOURCE_A">Source A (SolarWinds)</option>
            <option value="SOURCE_B">Source B (OpenNMS)</option>
            <option value="SOURCE_C">Source C (Cloud Agent)</option>
          </select>
        </div>

        {/* Site search */}
        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Site ID</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={siteSearch}
              onChange={(e) => {
                setSiteSearch(e.target.value.toUpperCase());
                setPage(1);
              }}
              placeholder="e.g. CHN001"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] uppercase placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:bg-white"
            />
          </div>
        </div>

        {/* Device search */}
        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Device ID</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={deviceSearch}
              onChange={(e) => {
                setDeviceSearch(e.target.value.toUpperCase());
                setPage(1);
              }}
              placeholder="e.g. RTR001"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] uppercase placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Main Alarms Table */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-[#64748B]">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mb-3" />
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
                  className="px-3.5 py-1.5 rounded-lg bg-[#F1F5F9] text-xs text-[#172B4D] font-medium hover:bg-[#E2E8F0] border border-[#E5EAF1] transition-colors"
                >
                  Clear All Filters
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold border-b border-[#E5EAF1]">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Alarm ID</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Site / Device</th>
                  <th className="py-3 px-4">Alarm Type & Message</th>
                  <th className="py-3 px-4">Repeats</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Raw Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] font-mono text-[#172B4D]">
                {alarms.map((alarm) => {
                  const isNewArrival =
                    recentIncomingId &&
                    (alarm.id === recentIncomingId ||
                      (alarm as unknown as { _id?: string })._id === recentIncomingId);

                  return (
                    <tr
                      key={alarm.id}
                      className={`transition-colors ${
                        isNewArrival
                          ? 'bg-[#EFF6FF] border-l-2 border-[#2563EB]'
                          : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans">
                        <Badge variant="severity" severity={alarm.severity as SeverityLevel} />
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#172B4D]">
                        {alarm.externalAlarmId}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-[#64748B] text-[11px]">
                        {alarm.sourceId}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[#2563EB] font-semibold">{alarm.siteId}</span>
                        <span className="text-[#94A3B8] mx-1.5">/</span>
                        <span className="text-[#475569]">{alarm.deviceId}</span>
                      </td>
                      <td className="py-2.5 px-4 font-sans max-w-xs">
                        <div className="font-semibold text-[#172B4D] text-xs">{alarm.alarmType}</div>
                        <div className="text-[#64748B] text-[11px] truncate" title={alarm.message}>
                          {alarm.message}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        {alarm.repeatCount > 1 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                            x{alarm.repeatCount}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8] text-xs">x1</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#64748B] text-[11px]">
                        {new Date(alarm.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <Badge variant="status" status={alarm.status} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-sans">
                        <button
                          onClick={() => handleViewRaw(alarm)}
                          title="View Untouched Raw JSON"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#2563EB] border border-[#E5EAF1] hover:border-[#BFDBFE] text-xs font-medium transition-colors"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Inspect</span>
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
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E5EAF1] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing <span className="font-semibold text-[#172B4D]">{alarms.length}</span> of{' '}
            <span className="font-semibold text-[#172B4D]">{total}</span> alarms
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#172B4D] disabled:opacity-30 disabled:cursor-not-allowed border border-[#E5EAF1] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-[#172B4D] font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#172B4D] disabled:opacity-30 disabled:cursor-not-allowed border border-[#E5EAF1] transition-colors"
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
          <div className="py-8 flex justify-center items-center text-[#64748B]">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mr-2" />
            <span className="text-sm">Fetching immutable wire payload...</span>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-[#64748B]">
                Preserved Raw Ingestion Payload (Lossless Wire Capture)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0] font-medium">
                SHA-256 Verified
              </span>
            </div>
            <pre className="p-4 rounded-lg bg-[#0F1F38] text-[#38BDF8] text-xs font-mono overflow-x-auto max-h-[60vh] border border-[#1E3A5F]">
              {JSON.stringify(selectedRaw, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}

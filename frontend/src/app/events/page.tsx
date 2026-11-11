'use client';

import React, { useState, useEffect, useCallback } from 'react';
import eventService, { RelatedAlarmsResponse } from '../../services/eventService';
import alarmService from '../../services/alarmService';
import { CorrelatedEvent } from '../../types/event';
import { Alarm, SeverityLevel } from '../../types/alarm';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { SERVER_EVENTS, ROOMS } from '../../constants/socketEvents';
import {
  Layers,
  Search,
  CheckCircle,
  Clock,
  Eye,
  Check,
  Code,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Radio
} from 'lucide-react';

export default function EventsPage() {
  const { hasPermission } = useAuth();
  const { socket, subscribe, unsubscribe } = useSocket();
  const canUpdateEvents = hasPermission('alarm', 'update');

  const [events, setEvents] = useState<CorrelatedEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  // Live Socket.IO Stream State
  const [liveBanner, setLiveBanner] = useState<string | null>(null);
  const [recentIncidentId, setRecentIncidentId] = useState<string | null>(null);

  // Filters
  const [severity, setSeverity] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [siteSearch, setSiteSearch] = useState<string>('');
  const [deviceSearch, setDeviceSearch] = useState<string>('');

  // Drill-down Modal (Constituent Alarms)
  const [selectedEventAlarms, setSelectedEventAlarms] = useState<RelatedAlarmsResponse | null>(null);
  const [isLoadingAlarms, setIsLoadingAlarms] = useState(false);

  // Action Modals (Acknowledge / Resolve)
  const [activeActionModal, setActiveActionModal] = useState<'ACK' | 'RESOLVE' | null>(null);
  const [targetEvent, setTargetEvent] = useState<CorrelatedEvent | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Raw Payload Modal for drill-down alarms
  const [selectedRaw, setSelectedRaw] = useState<Record<string, unknown> | null>(null);
  const [rawTitle, setRawTitle] = useState('');
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await eventService.getEvents({
        page,
        limit,
        severity: severity || undefined,
        status: status || undefined,
        siteId: siteSearch || undefined,
        deviceId: deviceSearch || undefined
      });
      setEvents(data.events);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to query correlated events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, severity, status, siteSearch, deviceSearch]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Real-time Socket.IO Live Stream Listener for Incidents
  useEffect(() => {
    subscribe(ROOMS.MONITORING_EVENTS);

    if (!socket) return;

    const handleIncidentCreated = (newEvent: CorrelatedEvent) => {
      const eventUniqueId = newEvent.id || (newEvent as unknown as { _id?: string })._id || newEvent.eventId;

      setTotal((prev) => prev + 1);
      setRecentIncidentId(eventUniqueId);
      setLiveBanner(`Correlated Incident Created: [${newEvent.severity}] on ${newEvent.deviceId} (${newEvent.eventId})`);
      const timer = setTimeout(() => {
        setLiveBanner(null);
        setRecentIncidentId(null);
      }, 4500);

      const matchesSeverity = !severity || newEvent.severity === severity;
      const matchesStatus = !status || newEvent.status === status;
      const matchesSite = !siteSearch || (newEvent.siteId && newEvent.siteId.toUpperCase().includes(siteSearch.toUpperCase()));
      const matchesDevice = !deviceSearch || (newEvent.deviceId && newEvent.deviceId.toUpperCase().includes(deviceSearch.toUpperCase()));

      if (matchesSeverity && matchesStatus && matchesSite && matchesDevice) {
        setEvents((prevEvents) => {
          const exists = prevEvents.some((e) => e.id === eventUniqueId || e.eventId === newEvent.eventId);
          if (exists) {
            return prevEvents.map((e) =>
              e.id === eventUniqueId || e.eventId === newEvent.eventId ? { ...e, ...newEvent } : e
            );
          }
          const merged = [newEvent, ...prevEvents].sort(
            (a, b) => new Date(b.lastOccurredAt).getTime() - new Date(a.lastOccurredAt).getTime()
          );
          return page === 1 ? merged.slice(0, limit) : merged;
        });
      }

      return () => clearTimeout(timer);
    };

    const handleIncidentUpdated = (updatedEvent: Partial<CorrelatedEvent> & { id?: string; _id?: string; eventId?: string }) => {
      const updatedId = updatedEvent.id || updatedEvent._id;

      setEvents((prevEvents) =>
        prevEvents.map((e) => {
          const isMatch =
            (updatedId && (e.id === updatedId || (e as unknown as { _id?: string })._id === updatedId)) ||
            (updatedEvent.eventId && e.eventId === updatedEvent.eventId);
          return isMatch ? { ...e, ...updatedEvent } : e;
        })
      );

      // If active targetEvent in action modal is being modified, synchronize it
      setTargetEvent((prev) => {
        if (!prev) return null;
        const isMatch =
          (updatedId && (prev.id === updatedId || (prev as unknown as { _id?: string })._id === updatedId)) ||
          (updatedEvent.eventId && prev.eventId === updatedEvent.eventId);
        return isMatch ? { ...prev, ...updatedEvent } : prev;
      });
    };

    socket.on(SERVER_EVENTS.INCIDENT_CREATED, handleIncidentCreated);
    socket.on(SERVER_EVENTS.INCIDENT_UPDATED, handleIncidentUpdated);

    return () => {
      socket.off(SERVER_EVENTS.INCIDENT_CREATED, handleIncidentCreated);
      socket.off(SERVER_EVENTS.INCIDENT_UPDATED, handleIncidentUpdated);
      unsubscribe(ROOMS.MONITORING_EVENTS);
    };
  }, [socket, subscribe, unsubscribe, severity, status, siteSearch, deviceSearch, page, limit]);

  const handleOpenDrillDown = async (event: CorrelatedEvent) => {
    setIsLoadingAlarms(true);
    setSelectedEventAlarms(null);
    const eventId = event.id || (event as unknown as { _id?: string })._id || event.eventId || '';
    try {
      const data = await eventService.getEventAlarms(eventId);
      setSelectedEventAlarms(data);
    } catch (e) {
      console.error('Failed to load constituent alarms:', e);
    } finally {
      setIsLoadingAlarms(false);
    }
  };

  const handleOpenActionModal = (event: CorrelatedEvent, type: 'ACK' | 'RESOLVE') => {
    setTargetEvent(event);
    setActiveActionModal(type);
    setActionNotes('');
    setActionError(null);
  };

  const handleSubmitAction = async () => {
    if (!targetEvent || !activeActionModal) return;
    setIsSubmittingAction(true);
    setActionError(null);
    const eventId = targetEvent.id || (targetEvent as unknown as { _id?: string })._id || '';
    try {
      if (activeActionModal === 'ACK') {
        await eventService.acknowledgeEvent(eventId, actionNotes);
      } else {
        await eventService.resolveEvent(eventId, actionNotes);
      }
      setActiveActionModal(null);
      setTargetEvent(null);
      fetchEvents();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Operation rejected. Please verify permissions.';
      setActionError(errorMsg);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleViewRawFromAlarm = async (alarm: Alarm) => {
    setRawTitle(`Raw Payload - ${alarm.externalAlarmId} (${alarm.sourceId})`);
    setIsLoadingRaw(true);
    setSelectedRaw(null);
    const alarmId = alarm.id || (alarm as unknown as { _id?: string })._id || '';
    try {
      const rawDoc = await alarmService.getRawPayload(alarmId);
      setSelectedRaw(rawDoc.rawPayload || (alarm.rawPayload as Record<string, unknown>));
    } catch {
      setSelectedRaw(alarm.rawPayload || { note: 'Wire format from memory snapshot' });
    } finally {
      setIsLoadingRaw(false);
    }
  };

  const formatSpan = (firstIso: string, lastIso: string) => {
    const diffMs = Math.max(0, new Date(lastIso).getTime() - new Date(firstIso).getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>AIOps Correlated Incidents</span>
          </h1>
          <p className="text-xs text-slate-400">
            Automated spatial and 5-minute temporal window grouping suppressing alarm storms
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Live Correlated Event Real-Time Banner */}
      {liveBanner && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs shadow-lg animate-pulse">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="font-medium text-slate-100">{liveBanner}</span>
          </div>
          <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            AIOPS CORRELATION STREAM
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Severity */}
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

        {/* Status */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Incident Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open (Active)</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
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

      {/* Events Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <span className="text-xs">Correlating active incidents...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No correlated incidents match criteria"
              description="No active multi-alarm incidents currently meet the selected filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Site / Device</th>
                  <th className="py-3 px-4">Rule</th>
                  <th className="py-3 px-4">Window Span</th>
                  <th className="py-3 px-4">Member Alarms</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {events.map((event) => {
                  const isNewArrival =
                    recentIncidentId &&
                    (event.id === recentIncidentId ||
                      (event as unknown as { _id?: string })._id === recentIncidentId ||
                      event.eventId === recentIncidentId);

                  return (
                    <tr
                      key={event.id}
                      className={`transition-colors ${
                        isNewArrival
                          ? 'bg-indigo-900/40 border-l-2 border-indigo-400 animate-pulse'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 font-sans">
                        <Badge variant="severity" severity={event.severity as SeverityLevel} />
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        {event.eventId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-indigo-400 font-semibold">{event.siteId}</span>
                        <span className="text-slate-600 mx-1.5">/</span>
                        <span className="text-slate-200">{event.deviceId}</span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-400 text-[11px]">
                        {event.correlationRule}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatSpan(event.firstOccurredAt, event.lastOccurredAt)}</span>
                          <span className="text-[10px] text-slate-500">(&le; 5m)</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <button
                          onClick={() => handleOpenDrillDown(event)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                        >
                          <Layers className="w-3 h-3" />
                          <span>{event.alarmIds?.length || 0} Alarms</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <Badge variant="status" status={event.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDrillDown(event)}
                            title="View Constituent Alarms & Drill-down"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {event.status === 'OPEN' && canUpdateEvents && (
                            <button
                              onClick={() => handleOpenActionModal(event, 'ACK')}
                              title="Acknowledge Incident"
                              className="p-1.5 rounded bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 text-slate-300 border border-slate-700 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {event.status !== 'RESOLVED' && canUpdateEvents && (
                            <button
                              onClick={() => handleOpenActionModal(event, 'RESOLVE')}
                              title="Resolve Incident & Clear Alarms"
                              className="p-1.5 rounded bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-300 border border-slate-700 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{events.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{total}</span> incidents
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

      {/* Drill-down Modal (Constituent Alarms List) */}
      <Modal
        isOpen={Boolean(selectedEventAlarms || isLoadingAlarms)}
        onClose={() => setSelectedEventAlarms(null)}
        title={`Incident Member Alarms - ${selectedEventAlarms?.eventId || ''}`}
        maxWidth="4xl"
      >
        {isLoadingAlarms ? (
          <div className="py-12 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span className="text-sm">Fetching correlated constituent alarms...</span>
          </div>
        ) : selectedEventAlarms ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-400">Target Facility: </span>
                <span className="font-bold text-indigo-400">{selectedEventAlarms.siteId}</span>
                <span className="text-slate-600 mx-2">|</span>
                <span className="text-slate-400">Device: </span>
                <span className="font-bold text-slate-200">{selectedEventAlarms.deviceId}</span>
              </div>
              <div>
                <span className="text-slate-400">Aggregate Severity: </span>
                <Badge variant="severity" severity={selectedEventAlarms.severity} />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Alarm ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Message</th>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3 text-right">Raw Wire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                  {selectedEventAlarms.alarms?.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-sans">
                        <Badge variant="severity" severity={a.severity} />
                      </td>
                      <td className="py-2 px-3 text-slate-100 font-semibold">{a.externalAlarmId}</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">{a.alarmType}</td>
                      <td className="py-2 px-3 text-slate-400 font-sans truncate max-w-xs">{a.message}</td>
                      <td className="py-2 px-3 text-[11px] text-slate-400">
                        {new Date(a.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-2 px-3 text-right font-sans">
                        <button
                          onClick={() => handleViewRawFromAlarm(a)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-indigo-300 text-xs border border-slate-700"
                        >
                          <Code className="w-3 h-3" />
                          <span>Payload</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Action Modal (Acknowledge / Resolve) */}
      <Modal
        isOpen={Boolean(activeActionModal && targetEvent)}
        onClose={() => setActiveActionModal(null)}
        title={
          activeActionModal === 'ACK'
            ? `Acknowledge Incident: ${targetEvent?.eventId}`
            : `Resolve Incident: ${targetEvent?.eventId}`
        }
        maxWidth="md"
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <p className="text-xs text-slate-400">
            {activeActionModal === 'ACK'
              ? 'Acknowledge operational ownership of this correlated incident. The incident will transition to ACKNOWLEDGED.'
              : 'Resolving this incident will transition its status to RESOLVED and automatically clear all constituent alarms.'}
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Operator Notes / Remediation Summary
            </label>
            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="e.g. Core router fiber link reset. Traffic rerouted successfully."
              rows={3}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setActiveActionModal(null)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitAction}
              disabled={isSubmittingAction}
              className={`px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all ${
                activeActionModal === 'ACK'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              {isSubmittingAction ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm {activeActionModal === 'ACK' ? 'Acknowledgment' : 'Resolution'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Raw Payload Modal inside drill-down */}
      <Modal
        isOpen={Boolean(selectedRaw || isLoadingRaw)}
        onClose={() => setSelectedRaw(null)}
        title={rawTitle}
        maxWidth="2xl"
      >
        {isLoadingRaw ? (
          <div className="py-8 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span className="text-sm">Fetching wire JSON payload...</span>
          </div>
        ) : (
          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono overflow-x-auto max-h-[60vh]">
            {JSON.stringify(selectedRaw, null, 2)}
          </pre>
        )}
      </Modal>
    </div>
  );
}


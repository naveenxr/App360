'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MapFilterBar from '../../components/map/MapFilterBar';
import topologyService from '../../services/topologyService';
import alarmService from '../../services/alarmService';
import { Site, NodeLiveAlarmsResponse, TopologySummary } from '../../types/topology';
import { Alarm, SeverityLevel } from '../../types/alarm';
import { CorrelatedEvent } from '../../types/event';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { useSocket } from '../../context/SocketContext';
import { SERVER_EVENTS, ROOMS } from '../../constants/socketEvents';
import {
  MapPin,
  Activity,
  Layers,
  X,
  Code,
  Loader2,
  RefreshCw,
  Clock
} from 'lucide-react';

// Dynamic import with SSR disabled for Leaflet compatibility
const NetworkMap = dynamic(() => import('../../components/map/NetworkMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[650px] rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-400 shadow-2xl">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
      <span className="text-xs">Initializing Carrier-Grade Cartographic Map...</span>
    </div>
  )
});

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 5,
  MAJOR: 4,
  MINOR: 3,
  WARNING: 2,
  INFO: 1,
  CLEAR: 0
};

export default function MapPage() {
  const { socket, subscribe, unsubscribe } = useSocket();
  const [sites, setSites] = useState<Site[]>([]);
  const [summary, setSummary] = useState<TopologySummary | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [region, setRegion] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');

  // Dynamic Node Live Inspection Drawer
  const [inspectedNode, setInspectedNode] = useState<NodeLiveAlarmsResponse | null>(null);
  const [isLoadingNode, setIsLoadingNode] = useState(false);
  const [nodeError, setNodeError] = useState<string | null>(null);

  // Raw Payload Modal
  const [selectedRaw, setSelectedRaw] = useState<Record<string, unknown> | null>(null);
  const [rawTitle, setRawTitle] = useState('');
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);

  const fetchTopologyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sitesData, summaryData] = await Promise.all([
        topologyService.getSites({
          region: region || undefined,
          severity: severity || undefined
        }),
        topologyService.getTopologySummary()
      ]);

      setSites(sitesData);
      setSummary(summaryData);
    } catch (e) {
      console.error('Failed to load topology map data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [region, severity]);

  useEffect(() => {
    fetchTopologyData();
  }, [fetchTopologyData]);

  // Real-time Dynamic Topology Updates
  useEffect(() => {
    subscribe(ROOMS.MONITORING_ALARMS);
    subscribe(ROOMS.MONITORING_TOPOLOGY);
    subscribe(ROOMS.MONITORING_EVENTS);

    if (!socket) return;

    const handleAlarmNew = (alarm: Alarm) => {
      const siteUpper = alarm.siteId?.toUpperCase();
      const deviceUpper = alarm.deviceId?.toUpperCase();

      // 1. Update affected site marker without reloading full map
      setSites((prevSites) =>
        prevSites.map((s) => {
          if (s.siteId.toUpperCase() === siteUpper) {
            const nextAlarmCount = (s.activeAlarmCount || 0) + 1;
            const currentRank = SEVERITY_RANK[s.currentSeverity] || 0;
            const incomingRank = SEVERITY_RANK[alarm.severity] || 0;
            const nextSeverity = incomingRank > currentRank ? (alarm.severity as SeverityLevel) : s.currentSeverity;

            return {
              ...s,
              activeAlarmCount: nextAlarmCount,
              currentSeverity: nextSeverity
            };
          }
          return s;
        })
      );

      // 2. Synchronize selected site if open
      setSelectedSite((prev) => {
        if (!prev || prev.siteId.toUpperCase() !== siteUpper) return prev;
        const currentRank = SEVERITY_RANK[prev.currentSeverity] || 0;
        const incomingRank = SEVERITY_RANK[alarm.severity] || 0;
        return {
          ...prev,
          activeAlarmCount: (prev.activeAlarmCount || 0) + 1,
          currentSeverity: incomingRank > currentRank ? (alarm.severity as SeverityLevel) : prev.currentSeverity
        };
      });

      // 3. Update inspected node drawer if the affected device is currently open
      setInspectedNode((prev) => {
        if (!prev || prev.node.deviceId.toUpperCase() !== deviceUpper) return prev;
        const exists = prev.activeAlarms.some(
          (a) => a.id === alarm.id || a.externalAlarmId === alarm.externalAlarmId
        );
        const updatedAlarms = exists ? prev.activeAlarms : [alarm, ...prev.activeAlarms];
        const currentRank = SEVERITY_RANK[prev.node.currentSeverity] || 0;
        const incomingRank = SEVERITY_RANK[alarm.severity] || 0;

        return {
          ...prev,
          activeAlarmCount: updatedAlarms.length,
          activeAlarms: updatedAlarms,
          node: {
            ...prev.node,
            currentSeverity: incomingRank > currentRank ? (alarm.severity as SeverityLevel) : prev.node.currentSeverity
          }
        };
      });

      // 4. Update topology summary counters
      setSummary((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          activeAlarms: prev.activeAlarms + 1
        };
      });
    };

    const handleAlarmUpdated = (updatedAlarm: Partial<Alarm> & { id?: string; _id?: string; siteId?: string; deviceId?: string; status?: string }) => {
      if (updatedAlarm.status === 'CLEARED') {
        const deviceUpper = updatedAlarm.deviceId?.toUpperCase();
        const siteUpper = updatedAlarm.siteId?.toUpperCase();
        const alarmId = updatedAlarm.id || updatedAlarm._id;

        // Decrease active count on inspected device if open
        setInspectedNode((prev) => {
          if (!prev || (deviceUpper && prev.node.deviceId.toUpperCase() !== deviceUpper)) return prev;
          const filtered = prev.activeAlarms.filter(
            (a) => a.id !== alarmId && (a as unknown as { _id?: string })._id !== alarmId
          );
          return {
            ...prev,
            activeAlarms: filtered,
            activeAlarmCount: filtered.length
          };
        });

        // Decrease active alarm count on affected site
        if (siteUpper) {
          setSites((prevSites) =>
            prevSites.map((s) => {
              if (s.siteId.toUpperCase() === siteUpper) {
                return {
                  ...s,
                  activeAlarmCount: Math.max(0, (s.activeAlarmCount || 0) - 1)
                };
              }
              return s;
            })
          );
        }
      }
    };

    const handleIncidentEvent = (incident: { siteId?: string; deviceId?: string; status?: string }) => {
      const deviceUpper = incident.deviceId?.toUpperCase();
      setInspectedNode((prev) => {
        if (!prev || (deviceUpper && prev.node.deviceId.toUpperCase() !== deviceUpper)) return prev;
        return {
          ...prev,
          linkedCorrelatedEvent: {
            ...(prev.linkedCorrelatedEvent || {}),
            ...incident
          } as unknown as CorrelatedEvent
        };
      });
    };

    socket.on(SERVER_EVENTS.ALARM_NEW, handleAlarmNew);
    socket.on(SERVER_EVENTS.ALARM_UPDATED, handleAlarmUpdated);
    socket.on(SERVER_EVENTS.INCIDENT_CREATED, handleIncidentEvent);
    socket.on(SERVER_EVENTS.INCIDENT_UPDATED, handleIncidentEvent);

    return () => {
      socket.off(SERVER_EVENTS.ALARM_NEW, handleAlarmNew);
      socket.off(SERVER_EVENTS.ALARM_UPDATED, handleAlarmUpdated);
      socket.off(SERVER_EVENTS.INCIDENT_CREATED, handleIncidentEvent);
      socket.off(SERVER_EVENTS.INCIDENT_UPDATED, handleIncidentEvent);
      unsubscribe(ROOMS.MONITORING_ALARMS);
      unsubscribe(ROOMS.MONITORING_TOPOLOGY);
      unsubscribe(ROOMS.MONITORING_EVENTS);
    };
  }, [socket, subscribe, unsubscribe]);

  // Dynamic Marker Selection handler: immediately queries backend REST API
  const handleInspectNode = async (deviceId: string) => {
    setIsLoadingNode(true);
    setNodeError(null);
    setInspectedNode(null);

    try {
      const liveData = await topologyService.getNodeLiveAlarms(deviceId);
      setInspectedNode(liveData);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `Failed to fetch live telemetry for node [${deviceId}]`;
      setNodeError(msg);
    } finally {
      setIsLoadingNode(false);
    }
  };

  const handleViewRaw = async (alarm: Alarm) => {
    setRawTitle(`Raw Wire Telemetry: ${alarm.externalAlarmId} (${alarm.sourceId})`);
    setIsLoadingRaw(true);
    setSelectedRaw(null);
    try {
      const rawRes = await alarmService.getRawPayload(alarm.id);
      setSelectedRaw(rawRes.rawPayload || (alarm.rawPayload as Record<string, unknown>));
    } catch {
      setSelectedRaw(alarm.rawPayload || { note: 'Wire format from node snapshot' });
    } finally {
      setIsLoadingRaw(false);
    }
  };

  const handleResetFilters = () => {
    setRegion('');
    setSeverity('');
    setSearch('');
  };

  // Filter sites by search term locally for instant feedback
  const filteredSites = sites.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.siteId.toLowerCase().includes(term) ||
      s.name.toLowerCase().includes(term) ||
      (s.address && s.address.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <span>Interactive Network Topology Map</span>
          </h1>
          <p className="text-xs text-slate-400">
            OpenStreetMap geospatial visualization with live device marker selection and dynamic alarm telemetry
          </p>
        </div>

        <button
          onClick={fetchTopologyData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
          <span>Refresh Map</span>
        </button>
      </div>

      {/* Filter Bar */}
      <MapFilterBar
        region={region}
        onRegionChange={setRegion}
        severity={severity}
        onSeverityChange={setSeverity}
        search={search}
        onSearchChange={setSearch}
        onReset={handleResetFilters}
        summary={summary}
      />

      {/* Map and Inspector Container */}
      <div className="relative grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Map (takes 3 cols if inspector open, else full 4 cols) */}
        <div className={inspectedNode || isLoadingNode ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <NetworkMap
            sites={filteredSites}
            selectedSite={selectedSite}
            onSelectSite={(s) => setSelectedSite(s)}
            onInspectNode={handleInspectNode}
          />
        </div>

        {/* Dynamic Node Live Alarms Drawer (Right Side) */}
        {(inspectedNode || isLoadingNode || nodeError) && (
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between max-h-[650px] overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-semibold text-sm text-slate-100">Dynamic Node Inspector</h3>
                </div>
                <button
                  onClick={() => {
                    setInspectedNode(null);
                    setNodeError(null);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoadingNode ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                  <span className="text-xs">Querying live backend alarms for node...</span>
                </div>
              ) : nodeError ? (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {nodeError}
                </div>
              ) : inspectedNode ? (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* Node Metadata Card */}
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-100 text-sm">
                        {inspectedNode.node.deviceId}
                      </span>
                      <Badge variant="severity" severity={inspectedNode.node.currentSeverity} />
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Type: <strong className="text-slate-300 font-sans">{inspectedNode.node.type}</strong></span>
                      <span className="font-mono text-slate-500">{inspectedNode.node.ipAddress}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>Facility: <strong className="text-indigo-400 font-mono">{inspectedNode.node.siteId}</strong></span>
                      <span className="text-emerald-400 font-semibold">{inspectedNode.node.status}</span>
                    </div>
                  </div>

                  {/* Linked Correlated Incident */}
                  {inspectedNode.linkedCorrelatedEvent ? (
                    <div className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-300 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Linked AIOps Incident</span>
                        </span>
                        <Badge variant="status" status={inspectedNode.linkedCorrelatedEvent.status} />
                      </div>
                      <div className="font-mono text-[11px] text-slate-200">
                        {inspectedNode.linkedCorrelatedEvent.eventId}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Rule: {inspectedNode.linkedCorrelatedEvent.correlationRule}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-500 text-center">
                      No active correlated incident on this device
                    </div>
                  )}

                  {/* Active Alarms Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-200">
                        Active Alarms ({inspectedNode.activeAlarmCount})
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">Live Telemetry</span>
                    </div>

                    {inspectedNode.activeAlarms.length === 0 ? (
                      <div className="p-4 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        All telemetry normal. No active alarms.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {inspectedNode.activeAlarms.map((a) => (
                          <div
                            key={a.id}
                            className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200 text-[11px]">{a.alarmType}</span>
                              <Badge variant="severity" severity={a.severity} className="text-[9px] py-0 px-1" />
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug truncate" title={a.message}>
                              {a.message}
                            </p>
                            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                              <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                              <button
                                onClick={() => handleViewRaw(a)}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                              >
                                <Code className="w-3 h-3" />
                                <span>Payload</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Raw Payload Modal */}
      <Modal
        isOpen={Boolean(selectedRaw || isLoadingRaw)}
        onClose={() => setSelectedRaw(null)}
        title={rawTitle}
        maxWidth="2xl"
      >
        {isLoadingRaw ? (
          <div className="py-8 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span className="text-sm">Fetching wire payload...</span>
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

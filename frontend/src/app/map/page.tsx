'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    <div className="w-full h-[650px] rounded-xl border border-[#E5EAF1] bg-white flex flex-col items-center justify-center text-[#64748B] shadow-sm">
      <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mb-3" />
      <span className="text-xs font-medium">Initializing Cartographic Topology Map...</span>
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

  const lastSyncedDeviceRef = useRef<string | null>(null);

  const handleInspectNode = useCallback(async (deviceId: string) => {
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
  }, []);

  useEffect(() => {
    fetchTopologyData();
  }, [fetchTopologyData]);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlSite = params.get('siteId');
      const urlDevice = params.get('deviceId');
      if (urlSite) {
        setSearch(urlSite);
        const matched = sites.find((s) => s.siteId.toUpperCase() === urlSite.toUpperCase());
        if (matched) setSelectedSite(matched);
      }
      if (urlDevice && lastSyncedDeviceRef.current !== urlDevice) {
        lastSyncedDeviceRef.current = urlDevice;
        handleInspectNode(urlDevice);
      }
    };
    syncFromUrl();
    const handleCustomNavigate = () => {
      lastSyncedDeviceRef.current = null;
      syncFromUrl();
    };
    window.addEventListener('app360:search-navigate', handleCustomNavigate);
    window.addEventListener('popstate', handleCustomNavigate);
    return () => {
      window.removeEventListener('app360:search-navigate', handleCustomNavigate);
      window.removeEventListener('popstate', handleCustomNavigate);
    };
  }, [sites, handleInspectNode]);

  // Real-time Dynamic Topology Updates
  useEffect(() => {
    subscribe(ROOMS.MONITORING_ALARMS);
    subscribe(ROOMS.MONITORING_TOPOLOGY);
    subscribe(ROOMS.MONITORING_EVENTS);

    if (!socket) return;

    const handleAlarmNew = (alarm: Alarm) => {
      if (!alarm || !alarm.siteId) return;
      const targetSiteId = String(alarm.siteId).toUpperCase();

      setSites((prevSites) =>
        prevSites.map((site) => {
          if (site.siteId.toUpperCase() !== targetSiteId) return site;

          const currentSiteRank = SEVERITY_RANK[site.currentSeverity || 'CLEAR'] || 0;
          const alarmRank = SEVERITY_RANK[alarm.severity || 'INFO'] || 0;
          const newWorst = alarmRank > currentSiteRank ? (alarm.severity as SeverityLevel) : site.currentSeverity;

          return {
            ...site,
            currentSeverity: newWorst,
            activeAlarmCount: (site.activeAlarmCount || 0) + 1
          };
        })
      );

      // If active node drawer is inspecting this device, refresh it live
      setInspectedNode((prev) => {
        if (!prev || prev.node.deviceId.toUpperCase() !== String(alarm.deviceId).toUpperCase()) {
          return prev;
        }
        return {
          ...prev,
          activeAlarms: [alarm, ...(prev.activeAlarms || [])],
          activeAlarmCount: (prev.activeAlarmCount || 0) + 1
        };
      });
    };

    const handleIncidentUpdate = (incident: CorrelatedEvent) => {
      if (!incident || !incident.siteId) return;
      const targetSiteId = String(incident.siteId).toUpperCase();

      if (incident.status === 'RESOLVED') {
        fetchTopologyData();
      } else {
        setSites((prevSites) =>
          prevSites.map((site) => {
            if (site.siteId.toUpperCase() !== targetSiteId) return site;
            const incRank = SEVERITY_RANK[incident.severity || 'INFO'] || 0;
            const curRank = SEVERITY_RANK[site.currentSeverity || 'CLEAR'] || 0;
            return {
              ...site,
              currentSeverity: incRank > curRank ? (incident.severity as SeverityLevel) : site.currentSeverity
            };
          })
        );
      }
    };

    socket.on(SERVER_EVENTS.ALARM_NEW, handleAlarmNew);
    socket.on(SERVER_EVENTS.INCIDENT_CREATED, handleIncidentUpdate);
    socket.on(SERVER_EVENTS.INCIDENT_UPDATED, handleIncidentUpdate);

    return () => {
      socket.off(SERVER_EVENTS.ALARM_NEW, handleAlarmNew);
      socket.off(SERVER_EVENTS.INCIDENT_CREATED, handleIncidentUpdate);
      socket.off(SERVER_EVENTS.INCIDENT_UPDATED, handleIncidentUpdate);
      unsubscribe(ROOMS.MONITORING_ALARMS);
      unsubscribe(ROOMS.MONITORING_TOPOLOGY);
      unsubscribe(ROOMS.MONITORING_EVENTS);
    };
  }, [socket, subscribe, unsubscribe, fetchTopologyData]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EAF1]">
        <div>
          <h1 className="text-xl font-bold text-[#142B50] tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#2563EB]" />
            <span>Interactive Network Topology Map</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Geospatial carrier node visualization with live device telemetry inspection and dynamic severity rollups
          </p>
        </div>

        <button
          onClick={fetchTopologyData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-[#F8FAFC] text-[#172B4D] border border-[#E5EAF1] shadow-sm hover:border-[#CBD5E1] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2563EB]' : 'text-[#64748B]'}`} />
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
        {/* Interactive Map Canvas */}
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
          <div className="lg:col-span-1 bg-white border border-[#E5EAF1] rounded-xl p-5 shadow-lg flex flex-col justify-between max-h-[650px] overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="font-semibold text-sm text-[#142B50]">Dynamic Node Inspector</h3>
                </div>
                <button
                  onClick={() => {
                    setInspectedNode(null);
                    setNodeError(null);
                  }}
                  className="p-1 rounded-lg text-[#64748B] hover:text-[#172B4D] hover:bg-[#F1F5F9] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoadingNode ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#64748B] py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mb-2" />
                  <span className="text-xs">Querying live backend alarms for node...</span>
                </div>
              ) : nodeError ? (
                <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC4545] text-xs">
                  {nodeError}
                </div>
              ) : inspectedNode ? (
                <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                  {/* Node Identity Card */}
                  <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#142B50] text-sm">{inspectedNode.node.name}</span>
                      <span className="font-mono text-[11px] text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                        {inspectedNode.node.deviceId}
                      </span>
                    </div>
                    <div className="text-[#64748B] flex items-center justify-between text-[11px]">
                      <span>Role: <strong className="text-[#172B4D]">{inspectedNode.node.type}</strong></span>
                      <span>Site: <strong className="text-[#172B4D]">{inspectedNode.node.siteId}</strong></span>
                    </div>
                    <div className="text-[#64748B] text-[11px] font-mono">
                      IP: <span className="text-[#172B4D]">{inspectedNode.node.ipAddress}</span>
                    </div>
                  </div>

                  {/* Correlated Event Badge (If Active) */}
                  {inspectedNode.linkedCorrelatedEvent && (
                    <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-semibold text-[#1E40AF]">
                          <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>Correlated Incident</span>
                        </div>
                        <Badge variant="severity" severity={inspectedNode.linkedCorrelatedEvent.severity} />
                      </div>
                      <div className="text-[11px] font-mono text-[#2563EB] font-bold">
                        {inspectedNode.linkedCorrelatedEvent.eventId}
                      </div>
                      <div className="text-[10px] text-[#64748B] mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Rule: {inspectedNode.linkedCorrelatedEvent.correlationRule}</span>
                      </div>
                    </div>
                  )}

                  {/* Active Alarms Feed */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                      <span>Active Alarms ({inspectedNode.activeAlarmCount})</span>
                    </div>

                    {inspectedNode.activeAlarms.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E5EAF1]">
                        Node operating normally. No active alarms.
                      </div>
                    ) : (
                      inspectedNode.activeAlarms.map((alarm) => (
                        <div
                          key={alarm.id}
                          className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs space-y-1.5 hover:border-[#CBD5E1] transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="severity" severity={alarm.severity} />
                            <button
                              onClick={() => handleViewRaw(alarm)}
                              title="Inspect lossless raw payload"
                              className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 font-medium"
                            >
                              <Code className="w-3 h-3" />
                              <span>Raw</span>
                            </button>
                          </div>
                          <div className="font-semibold text-[#172B4D]">{alarm.alarmType}</div>
                          <p className="text-[#64748B] text-[11px] leading-relaxed truncate">{alarm.message}</p>
                          <div className="text-[10px] text-[#94A3B8] font-mono">
                            {new Date(alarm.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Raw Payload Modal from Node Drawer */}
      <Modal
        isOpen={Boolean(selectedRaw || isLoadingRaw)}
        onClose={() => setSelectedRaw(null)}
        title={rawTitle}
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
}

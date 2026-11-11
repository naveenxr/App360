'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatCard from '../../components/dashboard/StatCard';
import AlarmChart from '../../components/dashboard/AlarmChart';
import IncidentTrendChart from '../../components/dashboard/IncidentTrendChart';
import RecentAlarms from '../../components/dashboard/RecentAlarms';
import dashboardService from '../../services/dashboardService';
import alarmService from '../../services/alarmService';
import { DashboardSummary } from '../../types/dashboard';
import { Alarm } from '../../types/alarm';
import { useSocket } from '../../context/SocketContext';
import { SERVER_EVENTS, ROOMS } from '../../constants/socketEvents';
import { Bell, Layers, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { socket, subscribe, unsubscribe } = useSocket();
  const [summary, setSummary] = useState<DashboardSummary>({
    totalAlarms: 0,
    activeAlarms: 0,
    totalEvents: 0,
    openEvents: 0,
    noiseReductionPercent: 0,
    severityDistribution: {
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      WARNING: 0,
      INFO: 0
    }
  });

  const [recentAlarms, setRecentAlarms] = useState<Alarm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sumData, alarmsData] = await Promise.all([
        dashboardService.getDashboardSummary(),
        alarmService.getAlarms({ limit: 8, status: 'ACTIVE' })
      ]);
      setSummary(sumData);
      setRecentAlarms(alarmsData.alarms);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Live Dashboard Telemetry Integration
  useEffect(() => {
    subscribe(ROOMS.MONITORING_ALARMS);
    subscribe(ROOMS.MONITORING_EVENTS);

    if (!socket) return;

    const handleAlarmNew = (newAlarm: Alarm) => {
      setSummary((prev) => {
        const nextTotalAlarms = prev.totalAlarms + 1;
        const nextActiveAlarms = newAlarm.status === 'ACTIVE' ? prev.activeAlarms + 1 : prev.activeAlarms;
        const sevKey = (newAlarm.severity || 'INFO') as keyof typeof prev.severityDistribution;

        const nextSeverityDist = {
          ...prev.severityDistribution,
          [sevKey]: (prev.severityDistribution[sevKey] || 0) + 1
        };

        const nextNoiseReduction =
          nextTotalAlarms > 0
            ? Math.max(0, Math.round(((nextTotalAlarms - prev.totalEvents) / nextTotalAlarms) * 100))
            : 0;

        return {
          ...prev,
          totalAlarms: nextTotalAlarms,
          activeAlarms: nextActiveAlarms,
          severityDistribution: nextSeverityDist,
          noiseReductionPercent: nextNoiseReduction
        };
      });

      if (newAlarm.status === 'ACTIVE') {
        const newAlarmId = newAlarm.id || (newAlarm as unknown as { _id?: string })._id;
        setRecentAlarms((prev) => {
          const exists = prev.some((a) => a.id === newAlarmId || a.externalAlarmId === newAlarm.externalAlarmId);
          if (exists) {
            return prev.map((a) =>
              a.id === newAlarmId || a.externalAlarmId === newAlarm.externalAlarmId ? { ...a, ...newAlarm } : a
            );
          }
          return [newAlarm, ...prev.slice(0, 7)];
        });
      }
    };

    const handleAlarmUpdated = (updatedAlarm: Partial<Alarm> & { id?: string; _id?: string; externalAlarmId?: string }) => {
      const updatedId = updatedAlarm.id || updatedAlarm._id;
      setRecentAlarms((prev) =>
        prev
          .map((a) => {
            const matches =
              (updatedId && (a.id === updatedId || (a as unknown as { _id?: string })._id === updatedId)) ||
              (updatedAlarm.externalAlarmId && a.externalAlarmId === updatedAlarm.externalAlarmId);
            return matches ? { ...a, ...updatedAlarm } : a;
          })
          .filter((a) => a.status !== 'CLEARED')
      );
    };

    const handleIncidentCreated = (newEvent: { status?: string }) => {
      setSummary((prev) => {
        const nextTotalEvents = prev.totalEvents + 1;
        const nextOpenEvents = newEvent.status === 'OPEN' ? prev.openEvents + 1 : prev.openEvents;

        const nextNoiseReduction =
          prev.totalAlarms > 0
            ? Math.max(0, Math.round(((prev.totalAlarms - nextTotalEvents) / prev.totalAlarms) * 100))
            : 0;

        return {
          ...prev,
          totalEvents: nextTotalEvents,
          openEvents: nextOpenEvents,
          noiseReductionPercent: nextNoiseReduction
        };
      });
    };

    const handleIncidentUpdated = (updatedEvent: { status?: string }) => {
      if (updatedEvent.status && updatedEvent.status !== 'OPEN') {
        setSummary((prev) => ({
          ...prev,
          openEvents: Math.max(0, prev.openEvents - 1)
        }));
      }
    };

    socket.on(SERVER_EVENTS.ALARM_NEW, handleAlarmNew);
    socket.on(SERVER_EVENTS.ALARM_UPDATED, handleAlarmUpdated);
    socket.on(SERVER_EVENTS.INCIDENT_CREATED, handleIncidentCreated);
    socket.on(SERVER_EVENTS.INCIDENT_UPDATED, handleIncidentUpdated);

    return () => {
      socket.off(SERVER_EVENTS.ALARM_NEW, handleAlarmNew);
      socket.off(SERVER_EVENTS.ALARM_UPDATED, handleAlarmUpdated);
      socket.off(SERVER_EVENTS.INCIDENT_CREATED, handleIncidentCreated);
      socket.off(SERVER_EVENTS.INCIDENT_UPDATED, handleIncidentUpdated);
      unsubscribe(ROOMS.MONITORING_ALARMS);
      unsubscribe(ROOMS.MONITORING_EVENTS);
    };
  }, [socket, subscribe, unsubscribe]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Compute proportional sparklines from live metrics
  const sparklines = useMemo(() => {
    const scaleSeries = (current: number, ratios: number[]) =>
      ratios.map((r) => Math.max(0, Math.round(current * r)));

    const critCount = summary.severityDistribution.CRITICAL || 0;
    return {
      alarms: scaleSeries(summary.totalAlarms, [0.42, 0.55, 0.48, 0.68, 0.75, 0.88, 1]),
      events: scaleSeries(summary.totalEvents, [0.5, 0.45, 0.65, 0.6, 0.8, 0.85, 1]),
      noise: scaleSeries(summary.noiseReductionPercent, [0.85, 0.88, 0.91, 0.94, 0.96, 0.98, 1]),
      critical: scaleSeries(critCount, [0.3, 0.6, 0.5, 0.8, 0.7, 0.9, 1]),
    };
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EAF1]">
        <div>
          <h1 className="text-xl font-bold text-[#142B50] tracking-tight">NOC Command Dashboard</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time multi-source network telemetry, alarm storm suppression and incident correlation
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-[#F8FAFC] text-[#172B4D] border border-[#E5EAF1] shadow-sm hover:border-[#CBD5E1] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#2563EB]' : 'text-[#64748B]'}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      {/* Row 1: Metric Cards Grid with Mini Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ingested Alarms"
          value={summary.totalAlarms}
          subtitle="Normalized wire events"
          trendData={sparklines.alarms}
          icon={<Bell className="w-5 h-5" />}
          variant="info"
        />

        <StatCard
          title="Correlated Incidents"
          value={summary.totalEvents}
          subtitle={`${summary.openEvents} active unresolved`}
          trendData={sparklines.events}
          icon={<Layers className="w-5 h-5" />}
          variant="warning"
        />

        <StatCard
          title="Noise Reduction Rate"
          value={`${summary.noiseReductionPercent}%`}
          subtitle="5-min window coalesced"
          trendData={sparklines.noise}
          icon={<Sparkles className="w-5 h-5 text-[#16A36A]" />}
          variant="success"
        />

        <StatCard
          title="Critical Incidents"
          value={summary.severityDistribution.CRITICAL || 0}
          subtitle="P1 High Priority Alerts"
          trendData={sparklines.critical}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="danger"
        />
      </div>

      {/* Row 2: Severity Breakdown Donut+Bar (5/12) + Telemetry Ingestion Trend AreaChart (7/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <AlarmChart distribution={summary.severityDistribution} />
        </div>

        <div className="lg:col-span-7">
          <IncidentTrendChart
            recentAlarms={recentAlarms}
            distribution={summary.severityDistribution}
            totalAlarms={summary.totalAlarms}
            totalEvents={summary.totalEvents}
          />
        </div>
      </div>

      {/* Row 3: Live Ingested Alarms Stream */}
      <RecentAlarms alarms={recentAlarms} isLoading={isLoading} />
    </div>
  );
}

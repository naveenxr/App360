'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../../components/dashboard/StatCard';
import AlarmChart from '../../components/dashboard/AlarmChart';
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

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ingested Alarms"
          value={summary.totalAlarms}
          subtitle="Normalized wire events"
          icon={<Bell className="w-5 h-5" />}
          variant="info"
        />

        <StatCard
          title="Correlated Incidents"
          value={summary.totalEvents}
          subtitle={`${summary.openEvents} active unresolved`}
          icon={<Layers className="w-5 h-5" />}
          variant="warning"
        />

        <StatCard
          title="Noise Reduction Rate"
          value={`${summary.noiseReductionPercent}%`}
          subtitle="AIOps suppression ratio"
          trend="5-min window coalesced"
          icon={<Sparkles className="w-5 h-5 text-[#16A36A]" />}
          variant="success"
        />

        <StatCard
          title="Critical Incidents"
          value={summary.severityDistribution.CRITICAL || 0}
          subtitle="P1 High Priority Alerts"
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="danger"
        />
      </div>

      {/* Visual Analytics & Live Alarms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Chart */}
        <div className="lg:col-span-1">
          <AlarmChart distribution={summary.severityDistribution} />
        </div>

        {/* Live Ingested Alarms Stream */}
        <div className="lg:col-span-2">
          <RecentAlarms alarms={recentAlarms} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

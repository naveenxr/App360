'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '../../components/dashboard/StatCard';
import AlarmChart from '../../components/dashboard/AlarmChart';
import RecentAlarms from '../../components/dashboard/RecentAlarms';
import dashboardService from '../../services/dashboardService';
import alarmService from '../../services/alarmService';
import { DashboardSummary } from '../../types/dashboard';
import { Alarm } from '../../types/alarm';
import { Bell, Layers, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">NOC Command Dashboard</h1>
          <p className="text-xs text-slate-400">
            Real-time multi-source network telemetry, alarm storm suppression and incident correlation
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
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
          icon={<Sparkles className="w-5 h-5 text-indigo-400" />}
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

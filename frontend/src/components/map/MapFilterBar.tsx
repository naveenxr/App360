'use client';

import React from 'react';
import { TopologySummary } from '../../types/topology';
import { Search, RotateCcw } from 'lucide-react';

interface MapFilterBarProps {
  region: string;
  onRegionChange: (val: string) => void;
  severity: string;
  onSeverityChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  onReset: () => void;
  summary: TopologySummary | null;
}

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
  region,
  onRegionChange,
  severity,
  onSeverityChange,
  search,
  onSearchChange,
  onReset,
  summary
}) => {
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Filters Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-2xl">
        {/* Region */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Region</label>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Regions (India)</option>
            <option value="South">South Region</option>
            <option value="West">West Region</option>
            <option value="North">North Region</option>
            <option value="East">East Region</option>
            <option value="Central">Central Region</option>
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Severity Rollup</label>
          <select
            value={severity}
            onChange={(e) => onSeverityChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Outages</option>
            <option value="MAJOR">Major Alerts</option>
            <option value="MINOR">Minor Issues</option>
            <option value="WARNING">Warnings</option>
            <option value="CLEAR">Normal (Clear)</option>
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Search Site</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="e.g. Chennai, MUM001"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Summary Badges & Reset */}
      <div className="flex items-center gap-3 self-end md:self-center">
        {summary && (
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
              <span className="text-slate-500">Sites: </span>
              <span className="font-semibold text-slate-100">{summary.totalSites}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400">
              <span className="opacity-80">Critical: </span>
              <span className="font-semibold">{summary.severityBreakdown.CRITICAL || 0}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <span className="opacity-80">Active Alarms: </span>
              <span className="font-semibold">{summary.activeAlarms}</span>
            </div>
          </div>
        )}

        <button
          onClick={onReset}
          title="Reset Filters"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default MapFilterBar;

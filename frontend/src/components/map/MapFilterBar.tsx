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
    <div className="p-4 rounded-xl border border-[#E5EAF1] bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Filters Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-2xl">
        {/* Region */}
        <div>
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Region</label>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white"
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
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Severity Rollup</label>
          <select
            value={severity}
            onChange={(e) => onSeverityChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white"
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
          <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Search Site</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="e.g. Chennai, MUM001"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Quick Summary Badges & Reset */}
      <div className="flex items-center gap-3 self-end md:self-center">
        {summary && (
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#E5EAF1] text-[#172B4D]">
              <span className="text-[#64748B]">Sites: </span>
              <span className="font-semibold text-[#172B4D]">{summary.totalSites}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC4545]">
              <span className="opacity-90">Critical: </span>
              <span className="font-semibold">{summary.severityBreakdown.CRITICAL || 0}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB]">
              <span className="opacity-90">Active Alarms: </span>
              <span className="font-semibold">{summary.activeAlarms}</span>
            </div>
          </div>
        )}

        <button
          onClick={onReset}
          title="Reset Filters"
          className="p-2 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172B4D] border border-[#E5EAF1] transition-colors shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default MapFilterBar;

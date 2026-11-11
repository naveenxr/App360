'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { SeverityLevel } from '../../types/alarm';

interface AlarmChartProps {
  distribution: Record<SeverityLevel, number>;
}

const SEVERITY_CONFIG: { key: SeverityLevel; label: string; color: string }[] = [
  { key: 'CRITICAL', label: 'Critical', color: '#DC4545' },
  { key: 'MAJOR',    label: 'Major',    color: '#EA580C' },
  { key: 'MINOR',    label: 'Minor',    color: '#D97706' },
  { key: 'WARNING',  label: 'Warning',  color: '#CA8A04' },
  { key: 'INFO',     label: 'Info',     color: '#2563EB' },
];

interface TooltipPayload {
  name: string;
  value: number;
  payload: { color: string };
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-white border border-[#E5EAF1] rounded-lg px-3 py-2 shadow-md text-xs">
        <span className="font-semibold text-[#172B4D]">{item.name}</span>
        <span className="ml-2 text-[#64748B]">{item.value} alarms</span>
      </div>
    );
  }
  return null;
};

export const AlarmChart: React.FC<AlarmChartProps> = ({ distribution }) => {
  const total = Object.values(distribution).reduce((acc, v) => acc + (v || 0), 0);

  const pieData = SEVERITY_CONFIG
    .map((s) => ({ name: s.label, value: distribution[s.key] || 0, color: s.color }))
    .filter((d) => d.value > 0);

  const barData = SEVERITY_CONFIG.map((s) => ({
    name: s.label.substring(0, 4),
    fullName: s.label,
    value: distribution[s.key] || 0,
    color: s.color,
  }));

  return (
    <div className="p-6 rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-sm font-semibold text-[#172B4D]">Alarms by Severity</h4>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] bg-[#F8FAFC] border border-[#E5EAF1] rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
          {total} Total
        </span>
      </div>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#94A3B8]">No alarm data available</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 flex-1">
          {/* Donut Chart */}
          <div className="relative h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[#172B4D] leading-none">{total}</span>
              <span className="text-[10px] text-[#64748B] mt-0.5 uppercase tracking-wide">Active</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-[110px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={18} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1 border-t border-[#F1F5F9]">
            {SEVERITY_CONFIG.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[#64748B]">{s.label}</span>
                <span className="font-semibold text-[#172B4D]">{distribution[s.key] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlarmChart;

import React from 'react';
import { SeverityLevel } from '../../types/alarm';

interface AlarmChartProps {
  distribution: Record<SeverityLevel, number>;
}

export const AlarmChart: React.FC<AlarmChartProps> = ({ distribution }) => {
  const severities: { key: SeverityLevel; label: string; color: string; barColor: string }[] = [
    { key: 'CRITICAL', label: 'Critical', color: 'text-[#DC4545]', barColor: 'bg-[#DC4545]' },
    { key: 'MAJOR', label: 'Major', color: 'text-[#EA580C]', barColor: 'bg-[#EA580C]' },
    { key: 'MINOR', label: 'Minor', color: 'text-[#D97706]', barColor: 'bg-[#D97706]' },
    { key: 'WARNING', label: 'Warning', color: 'text-[#CA8A04]', barColor: 'bg-[#CA8A04]' },
    { key: 'INFO', label: 'Info', color: 'text-[#2563EB]', barColor: 'bg-[#2563EB]' }
  ];

  const total = Object.values(distribution).reduce((acc, v) => acc + (v || 0), 0);

  return (
    <div className="p-6 rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-[#172B4D]">Alarms by Severity</h4>
          <span className="text-xs text-[#64748B] font-medium">Total: {total}</span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="h-2.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden flex mb-6">
          {total === 0 ? (
            <div className="h-full w-full bg-[#E2E8F0]" />
          ) : (
            severities.map((s) => {
              const count = distribution[s.key] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={s.key}
                  style={{ width: `${pct}%` }}
                  className={`h-full ${s.barColor} transition-all duration-300`}
                  title={`${s.label}: ${count} (${pct.toFixed(1)}%)`}
                />
              );
            })
          )}
        </div>

        {/* Distribution List */}
        <div className="space-y-3">
          {severities.map((s) => {
            const count = distribution[s.key] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={s.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.barColor}`} />
                  <span className="text-[#172B4D] font-medium">{s.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#64748B]">{pct}%</span>
                  <span className={`font-semibold ${s.color} min-w-[24px] text-right`}>{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[#E5EAF1] text-[11px] text-[#64748B] text-center">
        Real-time telemetry distribution computed across active carrier sites
      </div>
    </div>
  );
};

export default AlarmChart;

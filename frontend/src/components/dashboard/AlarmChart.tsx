import React from 'react';
import { SeverityLevel } from '../../types/alarm';

interface AlarmChartProps {
  distribution: Record<SeverityLevel, number>;
}

export const AlarmChart: React.FC<AlarmChartProps> = ({ distribution }) => {
  const severities: { key: SeverityLevel; label: string; color: string; barColor: string }[] = [
    { key: 'CRITICAL', label: 'Critical', color: 'text-red-400', barColor: 'bg-red-500' },
    { key: 'MAJOR', label: 'Major', color: 'text-orange-400', barColor: 'bg-orange-500' },
    { key: 'MINOR', label: 'Minor', color: 'text-yellow-400', barColor: 'bg-yellow-500' },
    { key: 'WARNING', label: 'Warning', color: 'text-amber-400', barColor: 'bg-amber-500' },
    { key: 'INFO', label: 'Info', color: 'text-blue-400', barColor: 'bg-blue-500' }
  ];

  const total = Object.values(distribution).reduce((acc, v) => acc + (v || 0), 0);

  return (
    <div className="p-6 rounded-xl border border-slate-800 bg-slate-900 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-slate-100">Alarms by Severity</h4>
          <span className="text-xs text-slate-400 font-medium">Total: {total}</span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex mb-6">
          {total === 0 ? (
            <div className="h-full w-full bg-slate-800" />
          ) : (
            severities.map((s) => {
              const count = distribution[s.key] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={s.key}
                  style={{ width: `${pct}%` }}
                  className={`h-full ${s.barColor} transition-all duration-500`}
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
                  <span className={`w-2 h-2 rounded-full ${s.barColor}`} />
                  <span className="text-slate-300 font-medium">{s.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{pct}%</span>
                  <span className={`font-semibold ${s.color} min-w-[24px] text-right`}>{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
        AIOps aggregate alarm classification
      </div>
    </div>
  );
};

export default AlarmChart;

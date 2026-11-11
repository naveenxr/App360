import React from 'react';
import { SeverityLevel } from '../../types/alarm';

interface BadgeProps {
  variant?: 'severity' | 'status' | 'default';
  severity?: SeverityLevel | string;
  status?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  severity,
  status,
  children,
  className = ''
}) => {
  if (variant === 'severity' && severity) {
    const s = String(severity).toUpperCase();
    let colorClasses = 'bg-slate-700 text-slate-200 border-slate-600';

    if (s === 'CRITICAL') {
      colorClasses = 'bg-red-500/10 text-red-400 border-red-500/30';
    } else if (s === 'MAJOR') {
      colorClasses = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    } else if (s === 'MINOR') {
      colorClasses = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    } else if (s === 'WARNING') {
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    } else if (s === 'INFO' || s === 'CLEAR') {
      colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
        {children || s}
      </span>
    );
  }

  if (variant === 'status' && status) {
    const st = String(status).toUpperCase();
    let colorClasses = 'bg-slate-700 text-slate-300 border-slate-600';

    if (st === 'ACTIVE' || st === 'OPEN') {
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    } else if (st === 'ACKNOWLEDGED') {
      colorClasses = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    } else if (st === 'RESOLVED' || st === 'CLEARED') {
      colorClasses = 'bg-slate-700/50 text-slate-400 border-slate-700';
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses} ${className}`}
      >
        {children || st}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;


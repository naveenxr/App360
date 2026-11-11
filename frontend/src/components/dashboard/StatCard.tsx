import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'success';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default'
}) => {
  const variantStyles = {
    default: {
      border: 'border-slate-800',
      bg: 'bg-slate-900',
      iconBg: 'bg-slate-800 text-slate-300'
    },
    danger: {
      border: 'border-red-500/20',
      bg: 'bg-slate-900',
      iconBg: 'bg-red-500/10 text-red-400'
    },
    warning: {
      border: 'border-amber-500/20',
      bg: 'bg-slate-900',
      iconBg: 'bg-amber-500/10 text-amber-400'
    },
    info: {
      border: 'border-indigo-500/20',
      bg: 'bg-slate-900',
      iconBg: 'bg-indigo-500/10 text-indigo-400'
    },
    success: {
      border: 'border-emerald-500/20',
      bg: 'bg-slate-900',
      iconBg: 'bg-emerald-500/10 text-emerald-400'
    }
  }[variant];

  return (
    <div className={`p-5 rounded-xl border ${variantStyles.border} ${variantStyles.bg} flex flex-col justify-between shadow-sm`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-lg ${variantStyles.iconBg}`}>{icon}</div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{value}</h3>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            {subtitle && <span>{subtitle}</span>}
            {trend && <span className="text-indigo-400 font-medium">{trend}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

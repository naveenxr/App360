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
      border: 'border-[#E5EAF1]',
      iconBg: 'bg-[#F1F5F9] text-[#475569]'
    },
    danger: {
      border: 'border-[#FECACA]',
      iconBg: 'bg-[#FEF2F2] text-[#DC4545]'
    },
    warning: {
      border: 'border-[#FDE68A]',
      iconBg: 'bg-[#FFFBEB] text-[#D97706]'
    },
    info: {
      border: 'border-[#BFDBFE]',
      iconBg: 'bg-[#EFF6FF] text-[#2563EB]'
    },
    success: {
      border: 'border-[#A7F3D0]',
      iconBg: 'bg-[#ECFDF5] text-[#16A36A]'
    }
  }[variant];

  return (
    <div className={`p-5 rounded-xl border ${variantStyles.border} bg-white flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)] transition-all`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-lg ${variantStyles.iconBg}`}>{icon}</div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-bold text-[#172B4D] tracking-tight">{value}</h3>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center justify-between text-xs text-[#64748B]">
            {subtitle && <span>{subtitle}</span>}
            {trend && <span className="text-[#2563EB] font-semibold">{trend}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

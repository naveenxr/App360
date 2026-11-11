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
    let colorClasses = 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]';
    let dotColor = 'bg-[#64748B]';

    if (s === 'CRITICAL') {
      colorClasses = 'bg-[#FEF2F2] text-[#DC4545] border-[#FECACA]';
      dotColor = 'bg-[#DC4545]';
    } else if (s === 'MAJOR') {
      colorClasses = 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]';
      dotColor = 'bg-[#EA580C]';
    } else if (s === 'MINOR') {
      colorClasses = 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';
      dotColor = 'bg-[#D97706]';
    } else if (s === 'WARNING') {
      colorClasses = 'bg-[#FEFCE8] text-[#CA8A04] border-[#FEF08A]';
      dotColor = 'bg-[#CA8A04]';
    } else if (s === 'INFO' || s === 'CLEAR') {
      colorClasses = 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]';
      dotColor = 'bg-[#2563EB]';
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colorClasses} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5`} />
        {children || s}
      </span>
    );
  }

  if (variant === 'status' && status) {
    const st = String(status).toUpperCase();
    let colorClasses = 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]';

    if (st === 'ACTIVE' || st === 'OPEN') {
      colorClasses = 'bg-[#ECFDF5] text-[#16A36A] border-[#A7F3D0]';
    } else if (st === 'ACKNOWLEDGED') {
      colorClasses = 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]';
    } else if (st === 'RESOLVED' || st === 'CLEARED') {
      colorClasses = 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]';
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${colorClasses} ${className}`}
      >
        {children || st}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;

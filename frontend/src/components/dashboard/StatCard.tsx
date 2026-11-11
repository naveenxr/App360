'use client';

import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendData?: number[];
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'success';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendData,
  variant = 'default',
}) => {
  const variantStyles = {
    default: {
      border: 'border-[#E5EAF1]',
      iconBg: 'bg-[#F1F5F9] text-[#475569]',
      stroke: '#64748B',
    },
    danger: {
      border: 'border-[#FECACA]',
      iconBg: 'bg-[#FEF2F2] text-[#DC4545]',
      stroke: '#DC4545',
    },
    warning: {
      border: 'border-[#FDE68A]',
      iconBg: 'bg-[#FFFBEB] text-[#D97706]',
      stroke: '#D97706',
    },
    info: {
      border: 'border-[#BFDBFE]',
      iconBg: 'bg-[#EFF6FF] text-[#2563EB]',
      stroke: '#2563EB',
    },
    success: {
      border: 'border-[#A7F3D0]',
      iconBg: 'bg-[#ECFDF5] text-[#16A36A]',
      stroke: '#16A36A',
    },
  }[variant];

  const sparkData = trendData?.map((v, i) => ({ i, v }));

  return (
    <div
      className={`p-5 rounded-xl border ${variantStyles.border} bg-white flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)] transition-all`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-lg ${variantStyles.iconBg}`}>{icon}</div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-2xl font-bold text-[#172B4D] tracking-tight tabular-nums">{value}</h3>
          {(subtitle || trend) && (
            <div className="mt-1 flex items-center gap-2 text-xs text-[#64748B]">
              {subtitle && <span>{subtitle}</span>}
              {trend && <span className="text-[#2563EB] font-semibold">{trend}</span>}
            </div>
          )}
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="w-20 h-9 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={variantStyles.stroke}
                  strokeWidth={1.75}
                  fill={variantStyles.stroke}
                  fillOpacity={0.12}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

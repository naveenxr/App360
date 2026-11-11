import React from 'react';
import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-[#CBD5E1] rounded-xl bg-white shadow-sm">
      <div className="p-3 mb-3 rounded-full bg-[#EFF6FF] text-[#2563EB]">
        {icon || <AlertCircle className="w-6 h-6" />}
      </div>
      <h4 className="text-sm font-semibold text-[#172B4D]">{title}</h4>
      {description && <p className="mt-1 text-xs text-[#64748B] max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;

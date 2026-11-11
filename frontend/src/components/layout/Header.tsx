'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { 
  LogOut, 
  Loader2, 
  Bell, 
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import GlobalSearch from './GlobalSearch';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const { connectionState, lastConnectedAt } = useSocket();

  const getPageTitle = (path: string): { section: string; title: string } => {
    if (path.startsWith('/dashboard/users')) return { section: 'Administration', title: 'User Directory' };
    if (path.startsWith('/dashboard/roles')) return { section: 'Administration', title: 'Dynamic Roles' };
    if (path.startsWith('/dashboard/permissions')) return { section: 'Administration', title: 'Permission Matrix' };
    if (path.startsWith('/dashboard/audit-logs')) return { section: 'Administration', title: 'Audit Trail' };
    if (path.startsWith('/dashboard')) return { section: 'Operations', title: 'NOC Dashboard' };
    if (path.startsWith('/map')) return { section: 'Operations', title: 'Interactive Topology Map' };
    if (path.startsWith('/alarms')) return { section: 'Operations', title: 'Live Ingested Alarms' };
    if (path.startsWith('/events')) return { section: 'Operations', title: 'Correlated Incidents' };
    if (path.startsWith('/api-sources')) return { section: 'Operations', title: 'API Ingestion Sources' };
    if (path.startsWith('/settings')) return { section: 'Administration', title: 'System Settings' };
    return { section: 'Portal', title: 'App360 NOC' };
  };

  const { section, title } = getPageTitle(pathname);

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5EAF1] sticky top-0 z-30 px-6 sm:px-8 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Left: Breadcrumbs & Page Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
          <span className="font-medium text-[#64748B] hover:text-[#172B4D] transition-colors">{section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span className="font-semibold text-[#172B4D]">{title}</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <GlobalSearch />

      {/* Right: Engine Status, Profile & Sign Out */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Real-time Socket.IO Connection Pill */}
        <div className="flex items-center">
          {connectionState === 'connected' && (
            <div
              title={lastConnectedAt ? `Connected since ${formatTime(lastConnectedAt)}` : 'Real-time WebSocket connected'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#16A36A] text-xs font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-[#16A36A] animate-pulse" />
              <span className="hidden sm:inline font-semibold">Live Engine</span>
              <span className="text-[10px] text-[#059669] font-mono border-l border-[#A7F3D0] pl-1.5 hidden md:inline">
                {lastConnectedAt ? formatTime(lastConnectedAt) : 'Connected'}
              </span>
            </div>
          )}

          {connectionState === 'connecting' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D99A21] text-xs font-medium">
              <Loader2 className="w-3 h-3 animate-spin text-[#D99A21]" />
              <span>Connecting...</span>
            </div>
          )}

          {connectionState === 'reconnecting' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D99A21] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#D99A21] animate-ping" />
              <span>Reconnecting</span>
            </div>
          )}

          {connectionState === 'disconnected' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#DC4545] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#DC4545]" />
              <span>Offline</span>
            </div>
          )}
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          title="NOC Notifications"
          className="p-2 rounded-lg text-[#64748B] hover:text-[#172B4D] hover:bg-[#F1F5F9] border border-transparent hover:border-[#E5EAF1] transition-all relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#2563EB] absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-[#E5EAF1] hidden sm:block" />

        {/* User Profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="text-xs font-semibold text-[#172B4D] max-w-[140px] truncate">
              {user?.name || user?.email || 'Administrator'}
            </div>
            <div className="text-[11px] text-[#64748B] flex items-center gap-1">
              <span className="font-medium text-[#2563EB]">{role || 'ADMIN'}</span>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#DC4545] bg-[#F7F9FC] hover:bg-[#FEF2F2] border border-[#E5EAF1] hover:border-[#FECACA] transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

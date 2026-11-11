'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Bell, 
  Layers, 
  MapPin, 
  Radio, 
  Settings, 
  Activity, 
  ShieldCheck,
  Users,
  KeyRound,
  Grid3X3,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, role, hasPermission } = useAuth();

  const isAdministrator = role === 'ADMIN';
  const canReadUsers = isAdministrator || hasPermission('user', 'read') || hasPermission('api', 'read');
  const canReadRoles = isAdministrator || hasPermission('role', 'read');
  const canReadAudit = isAdministrator || hasPermission('audit', 'read');

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Topology Map', href: '/map', icon: MapPin },
    { name: 'Live Alarms', href: '/alarms', icon: Bell },
    { name: 'Correlated Events', href: '/events', icon: Layers },
    { name: 'API Ingestion Sources', href: '/api-sources', icon: Radio },
  ];

  const adminNav = [
    ...(canReadUsers ? [{ name: 'User Directory', href: '/dashboard/users', icon: Users }] : []),
    ...(canReadRoles ? [{ name: 'Dynamic Roles', href: '/dashboard/roles', icon: KeyRound }] : []),
    ...(canReadRoles ? [{ name: 'Permission Matrix', href: '/dashboard/permissions', icon: Grid3X3 }] : []),
    ...(canReadAudit ? [{ name: 'Audit Trail', href: '/dashboard/audit-logs', icon: FileText }] : []),
    { name: 'System Settings', href: '/settings', icon: Settings }
  ];

  const isItemActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-base tracking-wide flex items-center gap-1.5">
              <span>App360</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AIOps
              </span>
            </div>
            <p className="text-xs text-slate-400">Network & Alarm NOC</p>
          </div>
        </div>

        {/* Scrollable Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
          {/* NOC Telemetry */}
          <div>
            <p className="px-3 text-[10px] font-semibold tracking-wider uppercase text-slate-500 mb-2">
              Operations & Telemetry
            </p>
            <nav className="space-y-1">
              {mainNav.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Administration & Security */}
          {adminNav.length > 0 && (
            <div>
              <p className="px-3 text-[10px] font-semibold tracking-wider uppercase text-slate-500 mb-2">
                Administration & Security
              </p>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const active = isItemActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Operator Session Footer */}
      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold text-xs border border-slate-700">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.name || 'Operator'}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span className="truncate">{role || 'OPERATOR'}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

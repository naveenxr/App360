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
  Users, 
  KeyRound, 
  Grid3X3, 
  FileText,
  Server
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { role, hasPermission } = useAuth();

  const isAdministrator = role === 'ADMIN';
  const canReadUsers = isAdministrator || hasPermission('user', 'read') || hasPermission('api', 'read');
  const canReadRoles = isAdministrator || hasPermission('role', 'read');
  const canReadAudit = isAdministrator || hasPermission('audit', 'read');

  const operationsNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Topology Map', href: '/map', icon: MapPin },
    { name: 'Live Alarms', href: '/alarms', icon: Bell },
    { name: 'Correlated Events', href: '/events', icon: Layers },
    { name: 'API Ingestion Sources', href: '/api-sources', icon: Radio },
  ];

  const administrationNav = [
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
    <aside className="w-64 bg-[#142B50] text-white flex flex-col justify-between h-screen fixed left-0 top-0 z-40 select-none shadow-[2px_0_8px_rgba(0,0,0,0.06)] border-r border-[#0D1E38]">
      {/* Brand Header */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[#1D3B68] shrink-0 bg-[#0F2240]">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <span>App360</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#2563EB]/30 text-[#93C5FD] border border-[#2563EB]/40">
                AIOps
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">Carrier NOC Platform</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Operations & Telemetry */}
          <div>
            <p className="px-3 text-[10px] font-bold tracking-wider uppercase text-[#8CA3BA] mb-2">
              Operations & Telemetry
            </p>
            <nav className="space-y-1">
              {operationsNav.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#2563EB] text-white shadow-sm font-semibold'
                        : 'text-[#CBD5E1] hover:text-white hover:bg-[#1D3B68]/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#94A3B8]'}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Administration & Security */}
          <div>
            <p className="px-3 text-[10px] font-bold tracking-wider uppercase text-[#8CA3BA] mb-2">
              Administration & Security
            </p>
            <nav className="space-y-1">
              {administrationNav.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#2563EB] text-white shadow-sm font-semibold'
                        : 'text-[#CBD5E1] hover:text-white hover:bg-[#1D3B68]/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#94A3B8]'}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-3.5 border-t border-[#1D3B68] bg-[#0F2240] shrink-0">
        <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="font-medium text-[#E2E8F0]">NOC Engine v1.0</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#16A36A]/20 text-[#4ADE80] font-semibold">
            Active
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

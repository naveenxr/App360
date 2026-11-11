'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Loader2,
  Bell,
  Layers,
  MapPin,
  Server,
  Users,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import alarmService from '../../services/alarmService';
import eventService from '../../services/eventService';
import topologyService from '../../services/topologyService';
import userService from '../../services/userService';
import { Alarm } from '../../types/alarm';
import { CorrelatedEvent } from '../../types/event';
import { Site, Device } from '../../types/topology';
import { ManagedUser } from '../../types/rbac';

type ResultCategory = 'Pages' | 'Sites' | 'Devices' | 'Alarms' | 'Incidents' | 'Users';

interface SearchResultItem {
  id: string;
  category: ResultCategory;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  href: string;
}

interface CachedData {
  fetchedAt: number;
  alarms: Alarm[];
  events: CorrelatedEvent[];
  sites: Site[];
  devices: Device[];
  users: ManagedUser[];
}

const CACHE_TTL_MS = 15000;

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-[#FEF2F2] text-[#DC4545] border-[#FECACA]',
  MAJOR: 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]',
  MINOR: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
  WARNING: 'bg-[#FEFCE8] text-[#CA8A04] border-[#FEF08A]',
  INFO: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
  CLEAR: 'bg-[#ECFDF5] text-[#16A36A] border-[#A7F3D0]',
};

export const GlobalSearch: React.FC = () => {
  const router = useRouter();
  const { role, hasPermission } = useAuth();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [data, setData] = useState<CachedData>({
    fetchedAt: 0,
    alarms: [],
    events: [],
    sites: [],
    devices: [],
    users: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFetchingRef = useRef(false);

  const isAdmin = role === 'ADMIN';
  const canReadUsers = isAdmin || hasPermission('user', 'read');
  const canReadRoles = isAdmin || hasPermission('role', 'read');
  const canReadAudit = isAdmin || hasPermission('audit', 'read');

  const navPages = useMemo<SearchResultItem[]>(() => {
    const pages: SearchResultItem[] = [
      { id: 'nav-dashboard', category: 'Pages', title: 'NOC Command Dashboard', subtitle: 'Overview, charts & telemetry metrics', href: '/dashboard' },
      { id: 'nav-map', category: 'Pages', title: 'Interactive Topology Map', subtitle: 'Sites, geospatial status & live node inspection', href: '/map' },
      { id: 'nav-alarms', category: 'Pages', title: 'Live Ingested Alarms', subtitle: 'Normalized telemetry & raw payloads', href: '/alarms' },
      { id: 'nav-events', category: 'Pages', title: 'Correlated Incidents', subtitle: 'AIOps coalesced events & lifecycle actions', href: '/events' },
      { id: 'nav-api', category: 'Pages', title: 'API Ingestion Sources', subtitle: 'Multi-vendor adapters & ingestion health', href: '/api-sources' },
      ...(canReadUsers ? [{ id: 'nav-users', category: 'Pages' as const, title: 'User Directory', subtitle: 'Manage operators and account status', href: '/dashboard/users' }] : []),
      ...(canReadRoles ? [{ id: 'nav-roles', category: 'Pages' as const, title: 'Dynamic Roles', subtitle: 'Role definitions & access profiles', href: '/dashboard/roles' }] : []),
      ...(canReadRoles ? [{ id: 'nav-perms', category: 'Pages' as const, title: 'Permission Matrix', subtitle: '9-module RBAC matrix', href: '/dashboard/permissions' }] : []),
      ...(canReadAudit ? [{ id: 'nav-audit', category: 'Pages' as const, title: 'Audit Trail', subtitle: 'Compliance & administration logs', href: '/dashboard/audit-logs' }] : []),
      { id: 'nav-settings', category: 'Pages', title: 'System Settings', subtitle: 'Operator profile & RBAC configuration', href: '/settings' },
    ];
    return pages;
  }, [canReadUsers, canReadRoles, canReadAudit]);

  const loadSearchIndex = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - data.fetchedAt < CACHE_TTL_MS && data.fetchedAt > 0) {
      return;
    }
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const [alarmsRes, eventsRes, sitesRes, nodesRes, usersRes] = await Promise.allSettled([
        alarmService.getAlarms({ limit: 50 }),
        eventService.getEvents({ limit: 35 }),
        topologyService.getSites(),
        topologyService.getNodes(),
        canReadUsers ? userService.getUsers({ limit: 30 }) : Promise.resolve({ users: [], total: 0, page: 1, totalPages: 1 }),
      ]);

      setData({
        fetchedAt: Date.now(),
        alarms: alarmsRes.status === 'fulfilled' ? alarmsRes.value.alarms : [],
        events: eventsRes.status === 'fulfilled' ? eventsRes.value.events : [],
        sites: sitesRes.status === 'fulfilled' ? sitesRes.value : [],
        devices: nodesRes.status === 'fulfilled' ? nodesRes.value : [],
        users: usersRes.status === 'fulfilled' ? usersRes.value.users : [],
      });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [data.fetchedAt, canReadUsers]);

  // Ctrl+K / Cmd+K shortcut & click outside handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        loadSearchIndex();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [loadSearchIndex]);

  const results = useMemo<SearchResultItem[]>(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return navPages.slice(0, 5);
    }

    const matchedPages = navPages
      .filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.subtitle.toLowerCase().includes(term) ||
          p.href.toLowerCase().includes(term)
      )
      .slice(0, 3);

    const matchedSites: SearchResultItem[] = data.sites
      .filter(
        (s) =>
          s.siteId?.toLowerCase().includes(term) ||
          s.name?.toLowerCase().includes(term) ||
          s.region?.toLowerCase().includes(term) ||
          s.address?.toLowerCase().includes(term)
      )
      .slice(0, 4)
      .map((s) => ({
        id: `site-${s.siteId}`,
        category: 'Sites',
        title: `${s.name} (${s.siteId})`,
        subtitle: `${s.region} • ${s.activeAlarmCount || 0} active alarms`,
        badge: s.currentSeverity || 'CLEAR',
        badgeColor: SEVERITY_COLORS[s.currentSeverity || 'CLEAR'] || SEVERITY_COLORS.INFO,
        href: `/map?siteId=${encodeURIComponent(s.siteId)}`,
      }));

    const matchedDevices: SearchResultItem[] = data.devices
      .filter(
        (d) =>
          d.deviceId?.toLowerCase().includes(term) ||
          d.name?.toLowerCase().includes(term) ||
          d.ipAddress?.toLowerCase().includes(term) ||
          d.type?.toLowerCase().includes(term) ||
          d.siteId?.toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map((d) => ({
        id: `dev-${d.deviceId}`,
        category: 'Devices',
        title: `${d.name || d.deviceId} (${d.deviceId})`,
        subtitle: `${d.type} • ${d.ipAddress} • Site ${d.siteId}`,
        badge: d.currentSeverity || 'CLEAR',
        badgeColor: SEVERITY_COLORS[d.currentSeverity || 'CLEAR'] || SEVERITY_COLORS.INFO,
        href: `/map?siteId=${encodeURIComponent(d.siteId)}&deviceId=${encodeURIComponent(d.deviceId)}`,
      }));

    const matchedAlarms: SearchResultItem[] = data.alarms
      .filter(
        (a) =>
          a.alarmType?.toLowerCase().includes(term) ||
          a.message?.toLowerCase().includes(term) ||
          a.externalAlarmId?.toLowerCase().includes(term) ||
          a.siteId?.toLowerCase().includes(term) ||
          a.deviceId?.toLowerCase().includes(term) ||
          a.severity?.toLowerCase().includes(term) ||
          a.sourceId?.toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map((a, idx) => ({
        id: `alarm-${a.id || a.externalAlarmId}-${idx}`,
        category: 'Alarms',
        title: `${a.alarmType} — ${a.deviceId}`,
        subtitle: `${a.siteId} • ${a.message}`,
        badge: a.severity,
        badgeColor: SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.INFO,
        href: `/alarms?deviceId=${encodeURIComponent(a.deviceId)}&siteId=${encodeURIComponent(a.siteId)}`,
      }));

    const matchedEvents: SearchResultItem[] = data.events
      .filter(
        (ev) =>
          ev.eventId?.toLowerCase().includes(term) ||
          ev.correlationRule?.toLowerCase().includes(term) ||
          ev.siteId?.toLowerCase().includes(term) ||
          ev.deviceId?.toLowerCase().includes(term) ||
          ev.severity?.toLowerCase().includes(term) ||
          ev.status?.toLowerCase().includes(term)
      )
      .slice(0, 4)
      .map((ev, idx) => {
        const count = Array.isArray(ev.alarmIds) ? ev.alarmIds.length : 0;
        return {
          id: `event-${ev.eventId || ev.id}-${idx}`,
          category: 'Incidents' as const,
          title: `${ev.eventId || 'Incident'} • ${ev.deviceId}`,
          subtitle: `${ev.siteId} • ${ev.correlationRule || ev.status} (${count} alarms)`,
          badge: ev.severity,
          badgeColor: SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.INFO,
          href: `/events?deviceId=${encodeURIComponent(ev.deviceId)}&siteId=${encodeURIComponent(ev.siteId)}`,
        };
      });

    const matchedUsers: SearchResultItem[] = data.users
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term)
      )
      .slice(0, 3)
      .map((u) => {
        const uid = u.id || u._id || '';
        const roleName =
          typeof u.roleId === 'object' && u.roleId
            ? u.roleId.name
            : typeof u.role === 'object' && u.role
              ? u.role.name
              : 'User';
        return {
          id: `user-${uid}`,
          category: 'Users',
          title: u.name,
          subtitle: `${u.email} • ${roleName}`,
          badge: u.isActive ? 'ACTIVE' : 'DISABLED',
          badgeColor: u.isActive
            ? 'bg-[#ECFDF5] text-[#16A36A] border-[#A7F3D0]'
            : 'bg-[#F1F5F9] text-[#64748B] border-[#E5EAF1]',
          href: `/dashboard/users/${uid}`,
        };
      });

    return [
      ...matchedSites,
      ...matchedDevices,
      ...matchedAlarms,
      ...matchedEvents,
      ...matchedUsers,
      ...matchedPages,
    ];
  }, [query, data, navPages]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    router.push(item.href);
    window.dispatchEvent(new CustomEvent('app360:search-navigate', { detail: { href: item.href } }));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      loadSearchIndex();
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  };

  const getCategoryIcon = (category: ResultCategory) => {
    switch (category) {
      case 'Sites':
        return <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />;
      case 'Devices':
        return <Server className="w-3.5 h-3.5 text-[#0284C7]" />;
      case 'Alarms':
        return <Bell className="w-3.5 h-3.5 text-[#DC4545]" />;
      case 'Incidents':
        return <Layers className="w-3.5 h-3.5 text-[#D97706]" />;
      case 'Users':
        return <Users className="w-3.5 h-3.5 text-[#16A36A]" />;
      default:
        return <Compass className="w-3.5 h-3.5 text-[#64748B]" />;
    }
  };

  return (
    <div ref={containerRef} className="hidden lg:flex items-center flex-1 max-w-md mx-8 relative">
      <div className="relative w-full">
        <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => {
            setIsOpen(true);
            loadSearchIndex();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search alarms, telemetry, sites or devices..."
          aria-label="Global search"
          className="w-full pl-9 pr-16 py-1.5 rounded-lg bg-[#F7F9FC] border border-[#E5EAF1] text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />}
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-0.5 rounded text-[#94A3B8] hover:text-[#172B4D] hover:bg-[#E2E8F0]/60 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-[#64748B] bg-white border border-[#E5EAF1] rounded shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E5EAF1] rounded-xl shadow-[0_12px_28px_-4px_rgba(20,43,80,0.14)] overflow-hidden z-50">
          <div className="px-3.5 py-2 bg-[#F8FAFC] border-b border-[#E5EAF1] flex items-center justify-between text-[11px] text-[#64748B]">
            <span>{query.trim() ? `Results for "${query.trim()}"` : 'Quick Navigation'}</span>
            <span className="text-[10px] text-[#94A3B8]">↑↓ navigate • ↵ select • esc close</span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#F1F5F9]">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs font-medium text-[#475569]">No matching alarms, sites, devices or pages found</p>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Try searching a site ID, device name, IP address, severity, or module name
                </p>
              </div>
            ) : (
              results.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] flex items-center justify-center shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#172B4D] truncate">{item.title}</span>
                          <span className="text-[10px] text-[#94A3B8] font-medium shrink-0">{item.category}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B] truncate mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            item.badgeColor || 'bg-[#F1F5F9] text-[#475569] border-[#E5EAF1]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition-colors ${
                          isSelected ? 'text-[#2563EB]' : 'text-[#CBD5E1]'
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;


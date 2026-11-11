'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import {
  Settings,
  Shield,
  Server,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface RoleData {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, Record<string, boolean>>;
}

export default function SettingsPage() {
  const { user, role } = useAuth();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await apiClient.get('/health');
        if (res.data?.success) {
          setHealthStatus('ONLINE (200 OK)');
        }
      } catch {
        setHealthStatus('DISCONNECTED');
      }
    };

    const fetchRoles = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: RoleData[] }>('/roles');
        setRoles(res.data.data);
      } catch (err) {
        console.warn('Could not load roles list (likely Viewer role without api:read permissions):', err);
      }
    };

    fetchHealth();
    fetchRoles();
  }, []);

  const modules = [
    { key: 'alarm', label: 'Alarms & Events' },
    { key: 'map', label: 'Interactive Topology Map' },
    { key: 'api', label: 'Multi-Source API Ingestion' },
    { key: 'userManagement', label: 'User & Role Administration' }
  ];

  const actions = ['create', 'read', 'update', 'delete'] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#E5EAF1]">
        <h1 className="text-xl font-bold text-[#172B4D] tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#2563EB]" />
          <span>System & RBAC Configuration</span>
        </h1>
        <p className="text-xs text-[#64748B]">
          Operator profile, dynamic database-driven authorization matrix and NOC backend status
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="lg:col-span-1 p-6 rounded-xl border border-[#E5EAF1] bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#172B4D]">{user?.name || 'Active Operator'}</h3>
              <p className="text-xs text-[#64748B]">{user?.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5EAF1] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Assigned Role</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                {role || 'ADMIN'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Account Status</span>
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Auth Token</span>
              <span className="text-[#64748B] font-mono text-[10px]">JWT (RS256 Bearer)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5EAF1]">
            <h4 className="text-xs font-semibold text-[#172B4D] mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Backend Connectivity</span>
            </h4>
            <div className="p-3 rounded-lg bg-slate-50 border border-[#E5EAF1] text-[11px] space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B] shrink-0">API Endpoint:</span>
                <span className="font-mono text-[#172B4D] truncate">{API_BASE_URL}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Health Check:</span>
                <span className="font-mono text-emerald-600 font-semibold">{healthStatus}</span>
              </div>
            </div>
          </div>

          {roles.length > 0 && (
            <div className="pt-4 border-t border-[#E5EAF1]">
              <h4 className="text-xs font-semibold text-[#172B4D] mb-2">Available Roles ({roles.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span
                    key={r.id}
                    className="px-2 py-0.5 rounded bg-slate-100 text-[#172B4D] text-[10px] border border-[#E5EAF1] font-mono"
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic RBAC Matrix */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-[#E5EAF1] bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#172B4D] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2563EB]" />
                <span>Configurable Database-Driven RBAC Matrix</span>
              </h3>
              <p className="text-xs text-[#64748B]">
                Granular module permissions stored in MongoDB and enforced dynamically on each request
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E5EAF1] mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#64748B] border-b border-[#E5EAF1]">
                <tr>
                  <th className="py-3 px-4">System Module</th>
                  <th className="py-3 px-4 text-center">Create</th>
                  <th className="py-3 px-4 text-center">Read</th>
                  <th className="py-3 px-4 text-center">Update</th>
                  <th className="py-3 px-4 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] font-mono text-[#172B4D]">
                {modules.map((m) => {
                  const userPerms =
                    user?.role && typeof user.role === 'object' && user.role.permissions
                      ? user.role.permissions[m.key]
                      : null;
                  const isAdmin = role === 'ADMIN';

                  return (
                    <tr key={m.key} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-sans font-medium text-[#172B4D]">
                        {m.label}
                      </td>
                      {actions.map((act) => {
                        const isGranted = isAdmin || (userPerms && userPerms[act] === true);
                        return (
                          <td key={act} className="py-3 px-4 text-center">
                            {isGranted ? (
                              <span className="inline-flex p-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400">
                                <XCircle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 text-[11px] text-[#64748B] leading-relaxed">
            <span className="text-[#2563EB] font-semibold">Note:</span> Administrators enjoy full wildcard
            read/write access across all modules. Roles can be edited dynamically in the MongoDB `roles`
            collection and are evaluated on each request without requiring application restarts.
          </div>
        </div>
      </div>
    </div>
  );
}

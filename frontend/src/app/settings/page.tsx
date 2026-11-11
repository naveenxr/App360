'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
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
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>System & RBAC Configuration</span>
        </h1>
        <p className="text-xs text-slate-400">
          Operator profile, dynamic database-driven authorization matrix and NOC backend status
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="lg:col-span-1 p-6 rounded-xl border border-slate-800 bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-600/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">{user?.name || 'Active Operator'}</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Assigned Role</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                {role || 'ADMIN'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Account Status</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Auth Token</span>
              <span className="text-slate-500 font-mono text-[10px]">JWT (RS256 Bearer)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>Backend Connectivity</span>
            </h4>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">API Endpoint:</span>
                <span className="font-mono text-slate-300">http://localhost:5000/api</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Health Check:</span>
                <span className="font-mono text-emerald-400">{healthStatus}</span>
              </div>
            </div>
          </div>

          {roles.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Available Roles ({roles.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span
                    key={r.id}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700 font-mono"
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic RBAC Matrix */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-800 bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Configurable Database-Driven RBAC Matrix</span>
              </h3>
              <p className="text-xs text-slate-400">
                Granular module permissions stored in MongoDB and enforced dynamically on each request
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">System Module</th>
                  <th className="py-3 px-4 text-center">Create</th>
                  <th className="py-3 px-4 text-center">Read</th>
                  <th className="py-3 px-4 text-center">Update</th>
                  <th className="py-3 px-4 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {modules.map((m) => {
                  const userPerms =
                    user?.role && typeof user.role === 'object' && user.role.permissions
                      ? user.role.permissions[m.key]
                      : null;
                  const isAdmin = role === 'ADMIN';

                  return (
                    <tr key={m.key} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-sans font-medium text-slate-200">
                        {m.label}
                      </td>
                      {actions.map((act) => {
                        const isGranted = isAdmin || (userPerms && userPerms[act] === true);
                        return (
                          <td key={act} className="py-3 px-4 text-center">
                            {isGranted ? (
                              <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex p-1 rounded-full bg-slate-800 text-slate-600">
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

          <div className="pt-2 text-[11px] text-slate-400 leading-relaxed">
            <span className="text-indigo-400 font-semibold">Note:</span> Administrators enjoy full wildcard
            read/write access across all modules. Roles can be edited dynamically in the MongoDB `roles`
            collection and are evaluated on each request without requiring application restarts.
          </div>
        </div>
      </div>
    </div>
  );
}

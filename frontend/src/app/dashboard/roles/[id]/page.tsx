'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import roleService from '../../../../services/roleService';
import { Role, RolePermissions, ActionPermissions } from '../../../../types/rbac';
import { useAuth } from '../../../../context/AuthContext';
import Modal from '../../../../components/common/Modal';
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Lock
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const MODULES_MAP: { id: string; label: string; desc: string }[] = [
  { id: 'dashboard', label: 'Command Dashboard', desc: 'Real-time telemetry KPIs, noise reduction & analytics' },
  { id: 'alarm', label: 'Normalized Alarms', desc: 'Canonical wire telemetry & lossless payload drill-downs' },
  { id: 'event', label: 'Correlated Incidents', desc: 'AIOps 5-minute sliding window incident coalescing' },
  { id: 'map', label: 'Network Topology Map', desc: 'Geospatial node markers, severity styling & popups' },
  { id: 'api', label: 'API Ingestion Pipeline', desc: 'Multi-source ingestion adapters, polling & logs' },
  { id: 'user', label: 'User Management', desc: 'Operator provisioning, status toggles & directories' },
  { id: 'role', label: 'Role Administration', desc: 'Dynamic RBAC role definitions and capabilities' },
  { id: 'settings', label: 'System Settings', desc: 'Runtime parameters, thresholds & engine preferences' },
  { id: 'audit', label: 'Audit Trail Logs', desc: 'Immutable administrative action logs and compliance audit' }
];

const ACTIONS = [
  { key: 'create' as const, label: 'CREATE' },
  { key: 'read' as const, label: 'READ' },
  { key: 'update' as const, label: 'UPDATE' },
  { key: 'delete' as const, label: 'DELETE' }
];

export default function RoleDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const { role: currentUserRole } = useAuth();
  const isAdministrator = currentUserRole === 'ADMIN';

  const [role, setRole] = useState<Role | null>(null);
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const data = await roleService.getRoleById(id);
        setRole(data);
        setDescription(data.description || '');

        const perms: RolePermissions = {};
        MODULES_MAP.forEach((m) => {
          perms[m.id] = {
            read: Boolean(data.permissions?.[m.id]?.read),
            create: Boolean(data.permissions?.[m.id]?.create),
            update: Boolean(data.permissions?.[m.id]?.update),
            delete: Boolean(data.permissions?.[m.id]?.delete)
          };
        });
        setPermissions(perms);
      } catch (err: unknown) {
        console.error('Failed to load role:', err);
        setError('Failed to fetch role permissions from database.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRole();
  }, [id]);

  const handleToggle = (moduleKey: string, actionKey: keyof ActionPermissions) => {
    if (!isAdministrator) return;
    setPermissions((prev) => {
      const mod = prev[moduleKey] || { read: false, create: false, update: false, delete: false };
      return {
        ...prev,
        [moduleKey]: {
          ...mod,
          [actionKey]: !mod[actionKey]
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await roleService.updateRole(id, {
        description,
        permissions
      });
      setRole(updated);
      setIsConfirmModalOpen(false);
      setSuccessMsg('Role permissions and configuration updated successfully. Changes are active immediately.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save role permissions.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs">Loading role definition and permissions matrix...</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <p className="text-sm text-slate-300">Security role not found.</p>
        <Link
          href="/dashboard/roles"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
        >
          Return to Roles Directory
        </Link>
      </div>
    );
  }

  const isSystem = role.isSystemRole || ['ADMIN', 'ENGINEER', 'VIEWER'].includes(role.name);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/roles"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Roles Directory</span>
        </Link>
      </div>

      {/* Header Banner Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100">{role.name}</h1>
                {isSystem && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Lock className="w-3 h-3" />
                    <span>Protected System Role</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Configure module action permissions evaluated dynamically at request time
              </p>
            </div>
          </div>

          {isAdministrator && (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Permissions</span>
            </button>
          )}
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Description field */}
        <div className="text-xs">
          <label className="block text-slate-400 mb-1 font-medium">Role Operational Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isAdministrator}
            placeholder="Describe role responsibilities..."
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-xs text-slate-200">Module Capabilities Matrix</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {isAdministrator ? 'Click to toggle action authorization' : 'Read-only view'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">System Module</th>
                {ACTIONS.map((a) => (
                  <th key={a.key} className="py-3 px-6 text-center">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {MODULES_MAP.map((m) => {
                const modPerm = permissions[m.id] || { read: false, create: false, update: false, delete: false };

                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-6">
                      <p className="font-semibold text-slate-200">{m.label}</p>
                      <p className="text-[11px] text-slate-500">{m.desc}</p>
                    </td>

                    {ACTIONS.map((a) => {
                      const isGranted = Boolean(modPerm[a.key]);

                      return (
                        <td key={a.key} className="py-3.5 px-6 text-center">
                          <button
                            type="button"
                            disabled={!isAdministrator || role.name === 'ADMIN'}
                            onClick={() => handleToggle(m.id, a.key)}
                            title={
                              role.name === 'ADMIN'
                                ? 'Admin role maintains full administrative bypass'
                                : `${isGranted ? 'Revoke' : 'Grant'} ${a.label} for ${m.label}`
                            }
                            className={`w-7 h-7 rounded-lg border inline-flex items-center justify-center transition-all ${
                              isGranted
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-sm shadow-indigo-600/30'
                                : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'
                            } ${!isAdministrator || role.name === 'ADMIN' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:scale-105'}`}
                          >
                            {isGranted ? '✓' : '—'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Permission Updates"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to persist dynamic permissions for role{' '}
            <span className="font-bold text-slate-100">{role.name}</span>?
            <br />
            <span className="text-slate-400 mt-2 block">
              These changes are committed directly to MongoDB and evaluated at runtime by backend authorization middleware.
              All active sessions will instantly enforce the updated permission boundaries.
            </span>
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Confirm & Persist</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

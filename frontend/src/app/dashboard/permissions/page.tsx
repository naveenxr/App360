'use client';

import React, { useState, useEffect, useCallback } from 'react';
import roleService from '../../../services/roleService';
import { Role, RolePermissions, ActionPermissions } from '../../../types/rbac';
import { useAuth } from '../../../context/AuthContext';
import Modal from '../../../components/common/Modal';
import {
  Grid3X3,
  ShieldCheck,
  Save,
  RefreshCw,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

const MODULES_SPEC: { id: string; label: string; desc: string }[] = [
  { id: 'dashboard', label: '1. Dashboard', desc: 'Command dashboard analytics, KPIs and noise reduction' },
  { id: 'alarm', label: '2. Alarms', desc: 'Canonical wire telemetry list, filters and raw drill-down' },
  { id: 'event', label: '3. Correlated Events', desc: 'AIOps 5-minute sliding window incident coalescing & lifecycle' },
  { id: 'map', label: '4. Network Topology', desc: 'Geospatial node markers, severity styling & popups' },
  { id: 'api', label: '5. API Ingestion', desc: 'Multi-source ingestion adapters, manual triggers & polling' },
  { id: 'user', label: '6. User Management', desc: 'Operator provisioning, status toggles & directories' },
  { id: 'role', label: '7. Role Management', desc: 'Dynamic RBAC role definitions and capabilities' },
  { id: 'settings', label: '8. System Settings', desc: 'Runtime parameters, thresholds & engine preferences' },
  { id: 'audit', label: '9. Audit Logs', desc: 'Immutable administrative action logs and compliance audit' }
];

const ACTIONS = [
  { key: 'create' as const, label: 'CREATE' },
  { key: 'read' as const, label: 'READ' },
  { key: 'update' as const, label: 'UPDATE' },
  { key: 'delete' as const, label: 'DELETE' }
];

export default function PermissionMatrixPage() {
  const { role: currentUserRole } = useAuth();
  const isAdministrator = currentUserRole === 'ADMIN';

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [permissions, setPermissions] = useState<RolePermissions>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const fetchMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await roleService.getPermissionsMatrix();
      setRoles(data.roles);

      if (data.roles.length > 0) {
        const defaultRole =
          data.roles.find((r) => (r.id || r._id) === selectedRoleId) || data.roles[0];
        const currentId = defaultRole.id || defaultRole._id || '';
        setSelectedRoleId(currentId);

        const perms: RolePermissions = {};
        MODULES_SPEC.forEach((m) => {
          perms[m.id] = {
            read: Boolean(defaultRole.permissions?.[m.id]?.read),
            create: Boolean(defaultRole.permissions?.[m.id]?.create),
            update: Boolean(defaultRole.permissions?.[m.id]?.update),
            delete: Boolean(defaultRole.permissions?.[m.id]?.delete)
          };
        });
        setPermissions(perms);
      }
    } catch (err) {
      console.error('Failed to load permissions matrix:', err);
      setError('Failed to fetch permissions matrix from server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    setError(null);
    setSuccessMsg(null);

    const targetRole = roles.find((r) => (r.id || r._id) === roleId);
    if (targetRole) {
      const perms: RolePermissions = {};
      MODULES_SPEC.forEach((m) => {
        perms[m.id] = {
          read: Boolean(targetRole.permissions?.[m.id]?.read),
          create: Boolean(targetRole.permissions?.[m.id]?.create),
          update: Boolean(targetRole.permissions?.[m.id]?.update),
          delete: Boolean(targetRole.permissions?.[m.id]?.delete)
        };
      });
      setPermissions(perms);
    }
  };

  const handleToggle = (moduleKey: string, actionKey: keyof ActionPermissions) => {
    const activeRole = roles.find((r) => (r.id || r._id) === selectedRoleId);
    if (!isAdministrator || activeRole?.name === 'ADMIN') return;

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
    if (!selectedRoleId) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await roleService.updateRolePermissions(selectedRoleId, permissions);
      setIsConfirmModalOpen(false);
      setSuccessMsg('Permissions matrix successfully committed to MongoDB. Effective immediately across all active sessions.');

      // Refresh role list state in background
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update permissions.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRole = roles.find((r) => (r.id || r._id) === selectedRoleId);
  const isSelectedAdmin = selectedRole?.name === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-indigo-400" />
            <span>Dynamic Permission Matrix</span>
          </h1>
          <p className="text-xs text-slate-400">
            Carrier-grade dynamic authorization matrix configured across 9 system modules and 4 action primitives
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchMatrix();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          {isAdministrator && !isSelectedAdmin && (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto text-xs">
        {roles.map((r) => {
          const rId = r.id || r._id || '';
          const isSelected = rId === selectedRoleId;
          const isSys = r.isSystemRole || ['ADMIN', 'ENGINEER', 'VIEWER'].includes(r.name);

          return (
            <button
              key={rId}
              onClick={() => handleRoleChange(rId)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{r.name}</span>
              {isSys && <Lock className="w-3 h-3 text-amber-400 opacity-80" />}
            </button>
          );
        })}
      </div>

      {/* Notifications */}
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

      {isSelectedAdmin && (
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            The <strong className="text-white">ADMIN</strong> role possesses inherent full administrative bypass across all modules. Module toggles are locked for system security integrity.
          </span>
        </div>
      )}

      {/* Matrix Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">
              Active Profile: <span className="font-bold text-indigo-400">{selectedRole?.name}</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            <span>Changes persist directly into MongoDB and apply without server restart</span>
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs">Loading matrix configuration...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">System Module (Row)</th>
                  {ACTIONS.map((a) => (
                    <th key={a.key} className="py-3.5 px-6 text-center">
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {MODULES_SPEC.map((m) => {
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
                              disabled={!isAdministrator || isSelectedAdmin}
                              onClick={() => handleToggle(m.id, a.key)}
                              title={
                                isSelectedAdmin
                                  ? 'Admin retains all privileges'
                                  : `${isGranted ? 'Revoke' : 'Grant'} ${a.label} on ${m.label}`
                              }
                              className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center font-bold text-xs transition-all ${
                                isGranted
                                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-sm shadow-indigo-600/30'
                                  : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'
                              } ${!isAdministrator || isSelectedAdmin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105'}`}
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
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Persist Dynamic Permissions Matrix"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            You are committing updated module authorization boundaries for{' '}
            <span className="font-bold text-slate-100">{selectedRole?.name}</span>.
            <br />
            <span className="text-slate-400 mt-2 block">
              Confirming this operation updates the MongoDB role document. All subsequent API calls made by users assigned to this role will be instantly validated against these rules.
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
                  <span>Committing...</span>
                </>
              ) : (
                <span>Confirm & Commit</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

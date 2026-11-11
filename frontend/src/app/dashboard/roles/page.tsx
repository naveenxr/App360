'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import roleService from '../../../services/roleService';
import { Role, RolePermissions } from '../../../types/rbac';
import { useAuth } from '../../../context/AuthContext';
import Modal from '../../../components/common/Modal';
import {
  KeyRound,
  ShieldCheck,
  Users,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Lock,
  Loader2,
  AlertTriangle,
  Grid3X3
} from 'lucide-react';

export default function RolesManagementPage() {
  const { role: currentUserRole } = useAuth();
  const isAdministrator = currentUserRole === 'ADMIN';

  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create Custom Role Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete Role Modal
  const [targetDeleteRole, setTargetDeleteRole] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (err) {
      console.error('Failed to load roles list:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setCreateError('Role name is required.');
      return;
    }

    setCreateError(null);
    setIsSubmittingCreate(true);
    try {
      await roleService.createRole({
        name: newRoleName.trim().toUpperCase(),
        description: newRoleDesc.trim()
      });
      setIsCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create role. Name may already exist.';
      setCreateError(msg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!targetDeleteRole) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const roleId = targetDeleteRole.id || (targetDeleteRole as unknown as { _id?: string })._id || '';
      await roleService.deleteRole(roleId);
      setTargetDeleteRole(null);
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Cannot delete role with assigned active users or system role.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const countActivePermissions = (permissions?: RolePermissions) => {
    if (!permissions) return 0;
    let count = 0;
    Object.values(permissions).forEach((mod) => {
      if (mod) {
        if (mod.read) count++;
        if (mod.create) count++;
        if (mod.update) count++;
        if (mod.delete) count++;
      }
    });
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EAF1]">
        <div>
          <h1 className="text-xl font-bold text-[#172B4D] tracking-tight flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#2563EB]" />
            <span>Dynamic Role Management</span>
          </h1>
          <p className="text-xs text-[#64748B]">
            Define carrier-grade security profiles, assign user clusters and configure module capabilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/permissions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-[#172B4D] border border-[#E5EAF1] shadow-sm transition-colors"
          >
            <Grid3X3 className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Open Permission Matrix</span>
          </Link>

          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchRoles();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-[#172B4D] border border-[#E5EAF1] shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#2563EB]' : 'text-[#64748B]'}`} />
            <span>Refresh</span>
          </button>

          {isAdministrator && (
            <button
              onClick={() => {
                setIsCreateModalOpen(true);
                setCreateError(null);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#64748B] gap-3">
          <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
          <p className="text-xs">Loading enterprise security roles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((r) => {
            const roleId = r.id || (r as unknown as { _id?: string })._id || '';
            const isSystemRole = r.isSystemRole || ['ADMIN', 'ENGINEER', 'VIEWER'].includes(r.name);
            const activePermCount = countActivePermissions(r.permissions);

            return (
              <div
                key={roleId}
                className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#172B4D] flex items-center gap-1.5">
                          <span>{r.name}</span>
                          {isSystemRole && (
                            <span title="System-Critical Role Protected from Deletion">
                              <Lock className="w-3.5 h-3.5 text-amber-500 inline" />
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isSystemRole
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {isSystemRole ? 'SYSTEM ROLE' : 'CUSTOM ROLE'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#64748B] leading-relaxed mb-4 min-h-[36px]">
                    {r.description || 'Custom organizational profile for operational operators'}
                  </p>

                  {/* Stats Pill Row */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 border border-[#E5EAF1] mb-4 text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#64748B]" />
                      <div>
                        <span className="text-[10px] text-[#64748B] block uppercase font-medium">Assigned Users</span>
                        <span className="font-bold text-[#172B4D]">{r.assignedUserCount || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                      <div>
                        <span className="text-[10px] text-[#64748B] block uppercase font-medium">Privileges</span>
                        <span className="font-bold text-[#2563EB]">
                          {r.name === 'ADMIN' ? 'Full (All)' : `${activePermCount} Grants`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-[#E5EAF1] flex items-center justify-between text-xs">
                  <Link
                    href={`/dashboard/roles/${roleId}`}
                    className="inline-flex items-center gap-1.5 text-[#2563EB] hover:text-blue-700 font-semibold transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Configure Permissions</span>
                  </Link>

                  {!isSystemRole && isAdministrator && (
                    <button
                      onClick={() => {
                        setTargetDeleteRole(r);
                        setDeleteError(null);
                      }}
                      className="p-1.5 rounded hover:bg-red-50 text-[#64748B] hover:text-red-600 transition-colors"
                      title="Delete Custom Role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Custom Role Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Custom Enterprise Role"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-[#172B4D] font-medium mb-1.5">Role Name * (e.g. NOC_SUPERVISOR)</label>
            <input
              type="text"
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value.toUpperCase())}
              placeholder="TIER1_OPERATOR"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] uppercase focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[#172B4D] font-medium mb-1.5">Description</label>
            <textarea
              rows={3}
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              placeholder="Describe the operational responsibilities of this role..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5EAF1]">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-[#172B4D] font-medium border border-[#E5EAF1] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCreate}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmittingCreate ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Role</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!targetDeleteRole}
        onClose={() => setTargetDeleteRole(null)}
        title="Delete Custom Role"
        maxWidth="md"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <p className="text-xs text-[#172B4D] leading-relaxed">
            Are you sure you want to delete custom role{' '}
            <span className="font-bold text-[#172B4D]">{targetDeleteRole?.name}</span>?
            <br />
            <span className="text-[#64748B] mt-2 block">
              This action cannot be undone. System roles and roles with actively assigned users cannot be deleted.
            </span>
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5EAF1]">
            <button
              type="button"
              onClick={() => setTargetDeleteRole(null)}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-[#172B4D] text-xs font-medium border border-[#E5EAF1] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteRole}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Confirm Delete</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

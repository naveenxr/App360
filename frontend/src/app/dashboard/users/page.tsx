'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import userService from '../../../services/userService';
import roleService from '../../../services/roleService';
import { ManagedUser, Role } from '../../../types/rbac';
import { useAuth } from '../../../context/AuthContext';
import Modal from '../../../components/common/Modal';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit,
  Power,
  PowerOff,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function UsersManagementPage() {
  const { role: currentUserRole } = useAuth();
  const isAdministrator = currentUserRole === 'ADMIN';

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Status toggle confirmation modal
  const [targetUser, setTargetUser] = useState<ManagedUser | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await userService.getUsers({
        page,
        limit,
        search: searchTerm || undefined,
        roleId: selectedRoleId || undefined,
        isActive: selectedStatus !== '' ? selectedStatus === 'true' : undefined
      });
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load user roster:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, limit, searchTerm, selectedRoleId, selectedStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const roleList = await roleService.getRoles();
        setRoles(roleList);
      } catch (err) {
        console.error('Failed to load roles list:', err);
      }
    };
    loadRoles();
  }, []);

  const handleToggleStatus = async () => {
    if (!targetUser) return;
    setIsUpdatingStatus(true);
    setStatusActionError(null);
    try {
      const userId = targetUser.id || (targetUser as unknown as { _id?: string })._id || '';
      await userService.updateUserStatus(userId, !targetUser.isActive);
      setTargetUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Operation failed. Cannot alter administrative status.';
      setStatusActionError(errorMsg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getRoleName = (user: ManagedUser) => {
    if (typeof user.roleId === 'object' && user.roleId !== null) {
      return (user.roleId as Role).name;
    }
    if (typeof user.role === 'object' && user.role !== null) {
      return (user.role as Role).name;
    }
    return String(user.roleId || user.role || 'USER');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>User Account Directory</span>
          </h1>
          <p className="text-xs text-slate-400">
            Enterprise RBAC user administration, credential management and role assignment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchUsers();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          {isAdministrator && (
            <Link
              href="/dashboard/users/create"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create User</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-4 text-xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email address..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Role Filter */}
        <select
          value={selectedRoleId}
          onChange={(e) => {
            setSelectedRoleId(e.target.value);
            setPage(1);
          }}
          className="w-full md:w-48 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Roles</option>
          {roles.map((r) => (
            <option key={r.id || r._id} value={r.id || r._id}>
              {r.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="w-full md:w-44 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Deactivated Only</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs">Loading enterprise user roster...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No users match the specified criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Provisioned</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {users.map((u) => {
                  const roleName = getRoleName(u);
                  const isUserActive = u.isActive !== false;
                  const userId = u.id || (u as unknown as { _id?: string })._id || '';

                  return (
                    <tr key={userId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold text-[11px]">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{u.name}</p>
                            <p className="text-[10px] text-slate-500">ID: {userId.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            roleName === 'ADMIN'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : roleName === 'ENGINEER'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : 'bg-slate-700/40 text-slate-300 border-slate-600'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{roleName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isUserActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isUserActive ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                          <span>{isUserActive ? 'ACTIVE' : 'DEACTIVATED'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdministrator && (
                            <>
                              <Link
                                href={`/dashboard/users/${userId}`}
                                title="Edit User Details"
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Link>

                              <button
                                onClick={() => {
                                  setTargetUser(u);
                                  setStatusActionError(null);
                                }}
                                title={isUserActive ? 'Deactivate User' : 'Activate User'}
                                className={`p-1.5 rounded border transition-colors ${
                                  isUserActive
                                    ? 'bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border-slate-700'
                                    : 'bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border-slate-700'
                                }`}
                              >
                                {isUserActive ? (
                                  <PowerOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Power className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{users.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{total}</span> provisioned users
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-300 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Account Status Toggle */}
      <Modal
        isOpen={!!targetUser}
        onClose={() => setTargetUser(null)}
        title={targetUser?.isActive !== false ? 'Deactivate User Account' : 'Reactivate User Account'}
        maxWidth="md"
      >
        <div className="space-y-4">
          {statusActionError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{statusActionError}</span>
            </div>
          )}

          <p className="text-xs text-slate-300 leading-relaxed">
            {targetUser?.isActive !== false ? (
              <>
                Are you sure you want to deactivate <span className="font-bold text-slate-100">{targetUser?.name}</span> (
                <span className="font-mono text-indigo-400">{targetUser?.email}</span>)?
                <br />
                <span className="text-slate-400 mt-2 block">
                  The user will be immediately rejected from authentication and all active sessions will be invalidated.
                </span>
              </>
            ) : (
              <>
                Are you sure you want to reactivate <span className="font-bold text-slate-100">{targetUser?.name}</span>?
                <br />
                <span className="text-slate-400 mt-2 block">
                  The user will regain console access based on their assigned role permissions.
                </span>
              </>
            )}
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setTargetUser(null)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
              className={`px-4 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 ${
                targetUser?.isActive !== false
                  ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
              }`}
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Confirm {targetUser?.isActive !== false ? 'Deactivation' : 'Reactivation'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


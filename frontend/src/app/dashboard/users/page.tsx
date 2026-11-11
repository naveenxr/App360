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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EAF1]">
        <div>
          <h1 className="text-xl font-bold text-[#142B50] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2563EB]" />
            <span>User Account Directory</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-[#F8FAFC] text-[#172B4D] border border-[#E5EAF1] shadow-sm hover:border-[#CBD5E1] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#2563EB]' : 'text-[#64748B]'}`} />
            <span>Refresh</span>
          </button>

          {isAdministrator && (
            <Link
              href="/dashboard/users/create"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create User</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-[#E5EAF1] flex flex-col md:flex-row items-center gap-4 text-xs shadow-sm">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email address..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
          />
        </div>

        {/* Role Filter */}
        <select
          value={selectedRoleId}
          onChange={(e) => {
            setSelectedRoleId(e.target.value);
            setPage(1);
          }}
          className="w-full md:w-48 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white"
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
          className="w-full md:w-44 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white"
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Deactivated Only</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#64748B] gap-3">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-xs">Loading enterprise user roster...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-[#64748B] text-xs">
            No users match the specified criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EAF1] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Provisioned</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] text-[#172B4D]">
                {users.map((u) => {
                  const roleName = getRoleName(u);
                  const isUserActive = u.isActive !== false;
                  const userId = u.id || (u as unknown as { _id?: string })._id || '';

                  return (
                    <tr key={userId} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] font-bold text-xs">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-[#172B4D]">{u.name}</p>
                            <p className="text-[10px] text-[#94A3B8] font-mono">ID: {userId.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#475569]">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                            roleName === 'ADMIN'
                              ? 'bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]'
                              : roleName === 'ENGINEER'
                              ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                              : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{roleName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            isUserActive
                              ? 'bg-[#ECFDF5] text-[#16A36A] border-[#A7F3D0]'
                              : 'bg-[#FEF2F2] text-[#DC4545] border-[#FECACA]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isUserActive ? 'bg-[#16A36A]' : 'bg-[#DC4545]'
                            }`}
                          />
                          <span>{isUserActive ? 'ACTIVE' : 'DEACTIVATED'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B] text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdministrator && (
                            <>
                              <Link
                                href={`/dashboard/users/${userId}`}
                                title="Edit User Details"
                                className="p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#2563EB] border border-[#E5EAF1] hover:border-[#BFDBFE] transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Link>

                              <button
                                onClick={() => {
                                  setTargetUser(u);
                                  setStatusActionError(null);
                                }}
                                title={isUserActive ? 'Deactivate User' : 'Activate User'}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isUserActive
                                    ? 'bg-[#F8FAFC] hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#DC4545] border-[#E5EAF1] hover:border-[#FECACA]'
                                    : 'bg-[#F8FAFC] hover:bg-[#ECFDF5] text-[#64748B] hover:text-[#16A36A] border-[#E5EAF1] hover:border-[#A7F3D0]'
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
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E5EAF1] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing <span className="font-semibold text-[#172B4D]">{users.length}</span> of{' '}
            <span className="font-semibold text-[#172B4D]">{total}</span> provisioned users
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#172B4D] disabled:opacity-30 disabled:cursor-not-allowed border border-[#E5EAF1] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-[#172B4D] font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#172B4D] disabled:opacity-30 disabled:cursor-not-allowed border border-[#E5EAF1] transition-colors"
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
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC4545] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{statusActionError}</span>
            </div>
          )}

          <p className="text-xs text-[#172B4D] leading-relaxed">
            {targetUser?.isActive !== false ? (
              <>
                Are you sure you want to deactivate <span className="font-bold text-[#172B4D]">{targetUser?.name}</span> (
                <span className="font-mono text-[#2563EB]">{targetUser?.email}</span>)?
                <br />
                <span className="text-[#64748B] mt-2 block">
                  The user will be immediately rejected from authentication and all active sessions will be invalidated.
                </span>
              </>
            ) : (
              <>
                Are you sure you want to reactivate <span className="font-bold text-[#172B4D]">{targetUser?.name}</span>?
                <br />
                <span className="text-[#64748B] mt-2 block">
                  The user will regain console access based on their assigned role permissions.
                </span>
              </>
            )}
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5EAF1]">
            <button
              type="button"
              onClick={() => setTargetUser(null)}
              className="px-4 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#172B4D] text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
              className={`px-4 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 ${
                targetUser?.isActive !== false
                  ? 'bg-[#DC4545] hover:bg-[#B91C1C]'
                  : 'bg-[#16A36A] hover:bg-[#15803D]'
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

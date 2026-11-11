'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import userService from '../../../../services/userService';
import roleService from '../../../../services/roleService';
import { ManagedUser, Role } from '../../../../types/rbac';
import { useAuth } from '../../../../context/AuthContext';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Power, PowerOff } from 'lucide-react';

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { role: currentUserRole } = useAuth();
  const isAdministrator = currentUserRole === 'ADMIN';

  const [user, setUser] = useState<ManagedUser | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, rolesList] = await Promise.all([
          userService.getUserById(id),
          roleService.getRoles()
        ]);
        setUser(userData);
        setRoles(rolesList);

        setName(userData.name);
        setEmail(userData.email);

        const currentRoleId =
          typeof userData.roleId === 'object' && userData.roleId !== null
            ? (userData.roleId as Role).id || (userData.roleId as Role)._id
            : String(userData.roleId || '');
        setRoleId(currentRoleId || '');
      } catch (err: unknown) {
        console.error('Failed to load user profile:', err);
        setError('Failed to fetch user record from database.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !roleId) {
      setError('Please provide all mandatory fields.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const payload: { name: string; email: string; roleId: string; password?: string } = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        roleId
      };
      if (newPassword) {
        payload.password = newPassword;
      }

      const updated = await userService.updateUser(id, payload);
      setUser(updated);
      setNewPassword('');
      setSuccessMsg('User profile updated successfully.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update user profile. Check administrative restrictions.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setError(null);
    setSuccessMsg(null);
    setIsTogglingStatus(true);
    try {
      const newStatus = !user.isActive;
      const updated = await userService.updateUserStatus(id, newStatus);
      setUser(updated);
      setSuccessMsg(`User account successfully ${newStatus ? 'reactivated' : 'deactivated'}.`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Cannot alter status of this administrator.';
      setError(msg);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs">Loading user record...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <p className="text-sm text-slate-300">User record not found.</p>
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
        >
          Return to User Directory
        </Link>
      </div>
    );
  }

  const isUserActive = user.isActive !== false;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to User Directory</span>
        </Link>
      </div>

      {/* Main Edit Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
        {/* Header with Status Indicator */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{user.name}</span>
                <span className="font-mono text-xs text-slate-500 font-normal">({user.email})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage profile details, assign RBAC roles and control account lifecycle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                isUserActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isUserActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span>{isUserActive ? 'ACTIVE ACCOUNT' : 'DEACTIVATED'}</span>
            </span>
          </div>
        </div>

        {/* Feedback alerts */}
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

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Work Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Assigned RBAC Role *</span>
              <span className="text-slate-500 text-[11px]">Enforces dynamic module access</span>
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            >
              {roles.map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  {r.name} — {r.description || 'System Role'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Reset Password (leave blank to keep current password)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-slate-800">
            {isAdministrator && (
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  isUserActive
                    ? 'bg-slate-800 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border-slate-700'
                    : 'bg-slate-800 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border-slate-700'
                }`}
              >
                {isTogglingStatus ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isUserActive ? (
                  <PowerOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Power className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{isUserActive ? 'Deactivate Account' : 'Reactivate Account'}</span>
              </button>
            )}

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/users"
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

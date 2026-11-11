'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import userService from '../../../../services/userService';
import roleService from '../../../../services/roleService';
import { Role } from '../../../../types/rbac';
import { UserPlus, ArrowLeft, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function CreateUserPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);

  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await roleService.getRoles();
        setRoles(data);
        if (data.length > 0) {
          const defaultRole = data.find((r) => r.name === 'ENGINEER') || data[0];
          setRoleId(defaultRole.id || defaultRole._id || '');
        }
      } catch (err) {
        console.error('Failed to load roles list:', err);
        setError('Failed to fetch roles from server.');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !roleId) {
      setError('Please provide all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await userService.createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        roleId
      });
      router.push('/dashboard/users');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to provision new user. Check email uniqueness or input format.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#172B4D] font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to User Directory</span>
        </Link>
      </div>

      {/* Card Form */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E5EAF1]">
          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#142B50]">Provision New User</h2>
            <p className="text-xs text-[#64748B]">
              Create a new authenticated operator account and assign enterprise module permissions
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC4545] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC4545]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name */}
          <div>
            <label className="block text-[#172B4D] font-semibold mb-1.5">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Lin"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-1 focus:ring-[#2563EB] transition-all placeholder-[#94A3B8]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[#172B4D] font-semibold mb-1.5">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@app360.internal"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-1 focus:ring-[#2563EB] transition-all placeholder-[#94A3B8] font-mono"
            />
          </div>

          {/* Initial Password */}
          <div>
            <label className="block text-[#172B4D] font-semibold mb-1.5">Initial Password * (min 6 characters)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-1 focus:ring-[#2563EB] transition-all placeholder-[#94A3B8]"
            />
          </div>

          {/* Role Select */}
          <div>
            <label className="block text-[#172B4D] font-semibold mb-1.5 flex items-center justify-between">
              <span>Assigned RBAC Role *</span>
              <span className="text-[#64748B] text-[11px] font-normal">Enforces dynamic module access</span>
            </label>
            {isLoadingRoles ? (
              <div className="py-2 text-[#94A3B8]">Loading roles...</div>
            ) : (
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-[#172B4D] focus:outline-none focus:border-[#2563EB] focus:bg-white"
              >
                {roles.map((r) => (
                  <option key={r.id || r._id} value={r.id || r._id}>
                    {r.name} — {r.description || 'Custom Enterprise Role'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Security Notice */}
          <div className="p-3.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-[11px] flex items-start gap-2.5 mt-4">
            <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
            <p>
              Passphrases are salted with 12 bcrypt rounds and stored as non-reversible cryptographic hashes.
              Credentials will be validated upon console authentication.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5EAF1]">
            <Link
              href="/dashboard/users"
              className="px-4 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#172B4D] font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingRoles}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning...</span>
                </>
              ) : (
                <span>Create User</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

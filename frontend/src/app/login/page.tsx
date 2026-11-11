'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Activity, Lock, Mail, AlertCircle, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showDevCredentials =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true';

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Authentication failed. Please verify your credentials.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center p-4 text-[#172B4D] selection:bg-[#2563EB] selection:text-white">
      <div className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#142B50] tracking-tight">App360 NOC Portal</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Enterprise Telemetry Ingestion, AIOps Correlation & Monitoring
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E5EAF1] rounded-xl p-7 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC4545] text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC4545]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@app360.internal"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 mt-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to NOC Console</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          {showDevCredentials && (
            <div className="mt-6 pt-5 border-t border-[#E5EAF1]">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B] mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Quick Evaluation Profiles:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@app360.internal', 'Admin@360!')}
                  className="py-1.5 px-2 rounded-lg bg-[#F1F5F9] hover:bg-[#EFF6FF] text-[#172B4D] hover:text-[#2563EB] text-center font-medium border border-[#E5EAF1] hover:border-[#BFDBFE] transition-colors"
                >
                  ADMIN
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('engineer.test@app360.internal', 'Password123!')}
                  className="py-1.5 px-2 rounded-lg bg-[#F1F5F9] hover:bg-[#EFF6FF] text-[#172B4D] hover:text-[#2563EB] text-center font-medium border border-[#E5EAF1] hover:border-[#BFDBFE] transition-colors"
                >
                  ENGINEER
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('viewer.test@app360.internal', 'Password123!')}
                  className="py-1.5 px-2 rounded-lg bg-[#F1F5F9] hover:bg-[#EFF6FF] text-[#172B4D] hover:text-[#2563EB] text-center font-medium border border-[#E5EAF1] hover:border-[#BFDBFE] transition-colors"
                >
                  VIEWER
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-[#64748B] mt-5 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
          <span>App360 Carrier-grade NOC &copy; 2026. Enterprise RBAC Enforced.</span>
        </div>
      </div>
    </div>
  );
}

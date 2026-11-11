'use client';

import React from 'react';
import { LogOut, Wifi, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, role, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-8 flex items-center justify-between">
      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Core Engine Online</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
          <Wifi className="w-3.5 h-3.5 text-slate-400" />
          <span>Telemetry Ingestion Active</span>
        </div>
      </div>

      {/* Profile & Logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-right">
          <div>
            <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5 justify-end">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{user?.email || 'admin@app360.internal'}</span>
            </div>
            <p className="text-[11px] text-slate-400">Role: <span className="text-indigo-300 font-semibold">{role || 'ADMIN'}</span></p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-slate-300 border border-slate-700 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Header;


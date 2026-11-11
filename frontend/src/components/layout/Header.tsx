'use client';

import React from 'react';
import { LogOut, UserCheck, Radio, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export const Header: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { connectionState, lastConnectedAt } = useSocket();

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-8 flex items-center justify-between">
      {/* Real-Time WebSocket Connection Status Indicator */}
      <div className="flex items-center gap-3">
        {connectionState === 'connected' && (
          <div
            title={lastConnectedAt ? `Connected since ${formatTime(lastConnectedAt)}` : 'Real-time WebSocket connected'}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Connected</span>
            {lastConnectedAt && (
              <span className="text-[10px] text-emerald-400/70 border-l border-emerald-500/20 pl-2 font-mono">
                {formatTime(lastConnectedAt)}
              </span>
            )}
          </div>
        )}

        {connectionState === 'connecting' && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>Connecting...</span>
          </div>
        )}

        {connectionState === 'reconnecting' && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Reconnecting...</span>
            {lastConnectedAt && (
              <span className="text-[10px] text-amber-400/70 border-l border-amber-500/20 pl-2 font-mono">
                Last: {formatTime(lastConnectedAt)}
              </span>
            )}
          </div>
        )}

        {connectionState === 'disconnected' && (
          <div
            title={lastConnectedAt ? `Last connected: ${formatTime(lastConnectedAt)}` : 'WebSocket disconnected'}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Disconnected</span>
            {lastConnectedAt && (
              <span className="text-[10px] text-rose-400/70 border-l border-rose-500/20 pl-2 font-mono">
                Last: {formatTime(lastConnectedAt)}
              </span>
            )}
          </div>
        )}

        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
          <Radio className="w-3.5 h-3.5 text-indigo-400" />
          <span>Socket.IO Engine</span>
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
            <p className="text-[11px] text-slate-400">
              Role: <span className="text-indigo-300 font-semibold">{role || 'ADMIN'}</span>
            </p>
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

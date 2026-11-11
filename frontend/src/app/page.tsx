'use client';

import { useEffect, useState, useCallback } from 'react';
import { checkBackendHealth } from '../services/health.service';
import { HealthResponse, ConnectionStatus } from '../types/health';

export default function HomePage() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setStatus('checking');
    setErrorMessage(null);

    try {
      const data = await checkBackendHealth();
      setHealthData(data);
      setStatus('connected');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setStatus('disconnected');
      setHealthData(null);
      setLastChecked(new Date().toLocaleTimeString());
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to connect to backend API');
      }
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-md">
        {/* Header Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
            <span>Phase 1</span>
            <span>•</span>
            <span>Foundation Baseline</span>
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            App360
          </h1>

          <p className="mt-2 text-lg font-medium text-slate-400">
            Network Monitoring &amp; Alarm Management System
          </p>
        </div>

        {/* Divider */}
        <div className="my-8 h-px w-full bg-slate-800" />

        {/* Connection Status Panel */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Backend Connection Status
              </span>
              <div className="mt-2 flex items-center gap-3">
                {status === 'checking' && (
                  <>
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-yellow-500"></span>
                    </span>
                    <span className="text-xl font-bold text-yellow-400">
                      Checking...
                    </span>
                  </>
                )}

                {status === 'connected' && (
                  <>
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xl font-bold text-emerald-400">
                      Connected
                    </span>
                  </>
                )}

                {status === 'disconnected' && (
                  <>
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                    </span>
                    <span className="text-xl font-bold text-rose-400">
                      Disconnected
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={fetchHealth}
              disabled={status === 'checking'}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'checking' ? 'Testing Connection...' : 'Recheck Connection'}
            </button>
          </div>

          {/* Detailed Response Block */}
          {healthData && (
            <div className="mt-6 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Backend Health Response (GET /api/health)
              </div>
              <pre className="mt-2 overflow-x-auto text-xs text-emerald-300 font-mono">
                {JSON.stringify(healthData, null, 2)}
              </pre>
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-lg border border-rose-900/50 bg-rose-950/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                Connection Failure
              </div>
              <p className="mt-1 text-xs text-rose-300">{errorMessage}</p>
              <p className="mt-2 text-xs text-slate-400">
                Ensure the Express server is running on <code className="text-slate-200">http://localhost:5000</code>.
              </p>
            </div>
          )}

          {lastChecked && (
            <div className="mt-4 text-right text-xs text-slate-500">
              Last checked at: {lastChecked}
            </div>
          )}
        </div>

        {/* System Architecture Metadata Footer */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <div className="text-xs text-slate-500">Presentation Layer</div>
            <div className="mt-1 text-sm font-semibold text-slate-300">Next.js 14 App Router</div>
          </div>
          <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <div className="text-xs text-slate-500">Business Logic Layer</div>
            <div className="mt-1 text-sm font-semibold text-slate-300">Express.js (Port 5000)</div>
          </div>
          <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
            <div className="text-xs text-slate-500">Communication</div>
            <div className="mt-1 text-sm font-semibold text-slate-300">Axios REST Client</div>
          </div>
        </div>
      </div>
    </main>
  );
}

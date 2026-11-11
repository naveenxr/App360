'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Activity, Lock, Mail, AlertCircle, Loader2, CheckCircle2, Shield, Wifi, Server, Radio } from 'lucide-react';

// Animated network node for canvas background
interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
  type: 'hub' | 'node' | 'endpoint';
}

interface Edge {
  from: number;
  to: number;
  alpha: number;
  active: boolean;
  progress: number;
  speed: number;
}

function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let nodes: Node[] = [];
    let edges: Edge[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Build the network
    const initNetwork = () => {
      nodes = [];
      edges = [];
      const count = Math.floor((canvas.width * canvas.height) / 14000);
      const total = Math.max(18, Math.min(count, 40));

      for (let i = 0; i < total; i++) {
        const type: Node['type'] = i < 3 ? 'hub' : i < 10 ? 'node' : 'endpoint';
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: type === 'hub' ? 5 : type === 'node' ? 3.5 : 2.5,
          alpha: 0.6 + Math.random() * 0.4,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.025,
          type
        });
      }

      // Create edges between nearby nodes
      const maxDist = canvas.width * 0.22;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            edges.push({
              from: i,
              to: j,
              alpha: 0.08 + Math.random() * 0.14,
              active: Math.random() < 0.25,
              progress: Math.random(),
              speed: 0.003 + Math.random() * 0.007
            });
          }
        }
      }
    };
    initNetwork();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update + draw edges
      for (const edge of edges) {
        const a = nodes[edge.from];
        const b = nodes[edge.to];
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        // Static edge line
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(96,165,250,${edge.alpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Data packet traveling along active edges
        if (edge.active) {
          edge.progress += edge.speed;
          if (edge.progress > 1) {
            edge.progress = 0;
            edge.active = Math.random() < 0.7;
          }
          const px = a.x + dx * edge.progress;
          const py = a.y + dy * edge.progress;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(99,179,237,0.95)';
          ctx.fill();
        } else if (Math.random() < 0.002) {
          edge.active = true;
        }
      }

      // Update + draw nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += node.pulseSpeed;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        const pulseFactor = 0.85 + 0.15 * Math.sin(node.pulse);
        const baseColor =
          node.type === 'hub'
            ? '59,130,246'   // blue-500
            : node.type === 'node'
            ? '96,165,250'   // blue-400
            : '147,197,253'; // blue-300

        // Outer glow ring (hubs only)
        if (node.type === 'hub') {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r * 3.5 * pulseFactor, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${baseColor},0.06)`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r * 2 * pulseFactor, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${baseColor},0.14)`;
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor},${node.alpha})`;
        ctx.fill();

        // Bright center highlight
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 0.45 * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,0.75)`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="min-h-screen flex" style={{ background: '#0B1526' }}>

      {/* ── LEFT PANEL: animated network canvas ── */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(135deg, #071020 0%, #0F1E3A 50%, #0D2144 100%)'
        }}
      >
        {/* Animated canvas */}
        <NetworkCanvas />

        {/* Gradient overlay so text stays readable */}
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(7,16,32,0.35) 0%, rgba(7,16,32,0.0) 100%)'
          }}
        />

        {/* Top brand mark */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-lg shadow-blue-600/40">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">App360</span>
          </div>
          <p className="text-blue-300/70 text-xs font-medium tracking-wider uppercase">
            Carrier-grade NOC Platform
          </p>
        </div>

        {/* Centre feature badges */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-white text-3xl font-bold leading-tight mb-6">
            Enterprise Network<br />
            <span className="text-blue-400">Operations Center</span>
          </h2>

          {[
            { icon: <Wifi className="w-4 h-4" />, title: 'Multi-Source Telemetry', desc: 'SolarWinds, OpenNMS & Cloud Agent ingestion' },
            { icon: <Server className="w-4 h-4" />, title: 'AIOps Correlation Engine', desc: '5-minute sliding window alarm coalescing' },
            { icon: <Radio className="w-4 h-4" />, title: 'Real-time Monitoring', desc: 'Live Socket.IO push with zero polling overhead' },
            { icon: <Shield className="w-4 h-4" />, title: 'Dynamic RBAC', desc: 'MongoDB-driven authorization evaluated per request' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 group">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{f.title}</p>
                <p className="text-blue-300/60 text-[11px] mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stats strip */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            { label: 'Monitored Sites', value: '7' },
            { label: 'Network Devices', value: '12' },
            { label: 'Alarm Fidelity', value: '99.9%' },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border border-blue-500/15 bg-blue-500/5 p-3 text-center">
              <p className="text-blue-300 font-bold text-lg">{s.value}</p>
              <p className="text-blue-400/60 text-[10px] mt-0.5 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL: login form ── */}
      <div className="flex-1 lg:max-w-[460px] flex flex-col justify-center items-center p-8 relative"
        style={{ background: '#F7F9FC' }}
      >
        {/* Mobile brand (hidden on lg) */}
        <div className="lg:hidden mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB] text-white shadow-md mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#142B50]">App360 NOC Portal</h1>
          <p className="text-xs text-[#64748B] mt-1">Enterprise Telemetry Ingestion, AIOps Correlation & Monitoring</p>
        </div>

        <div className="w-full max-w-[380px]">
          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-[#142B50] tracking-tight">Sign In</h2>
            <p className="text-xs text-[#64748B] mt-1.5">
              Access your NOC console. All sessions are JWT-authenticated and RBAC-enforced.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC4545] text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@app360.internal"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-white border border-[#E5EAF1] text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-white border border-[#E5EAF1] text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all shadow-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 mt-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-xs font-semibold shadow-sm shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Security notice */}
          <div className="mt-6 p-3.5 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2.5">
            <Shield className="w-3.5 h-3.5 text-[#2563EB] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#2563EB]/80 leading-relaxed">
              This portal enforces enterprise RBAC. Unauthorized access attempts are logged and audited.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center text-[11px] text-[#94A3B8] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
          <span>App360 Carrier-grade NOC &copy; 2026. Enterprise RBAC Enforced.</span>
        </div>
      </div>
    </div>
  );
}

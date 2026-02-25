"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Search, Shield, TestTube2, Eye, RefreshCw, Maximize2,
  Camera, Target, RotateCcw, Grid3x3, AlertCircle, CheckCircle,
  TrendingUp, ChevronRight, Sun, Moon, AlertTriangle, Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

/* ─────────────────────────────────────────────
   Service Data Model
───────────────────────────────────────────── */
const services = [
  {
    id: 1, name: 'auth-service', status: 'healthy',
    layer: 'edge',
    x: 18, y: 28,
    connections: [2, 3],
    p95: '38ms', errRate: '0.0%', sparkline: [60, 75, 65],
    tests: 100, errors: 0, deployment: '2h ago'
  },
  {
    id: 2, name: 'api-gateway', status: 'warning',   // degraded due to blast radius
    layer: 'edge',
    x: 38, y: 22,
    connections: [4, 5, 6],
    p95: '91ms', errRate: '3.2%', sparkline: [55, 80, 95],
    tests: 94, errors: 4, deployment: '3h ago'
  },
  {
    id: 3, name: 'user-db', status: 'healthy',
    layer: 'data',
    x: 18, y: 72,
    connections: [],
    p95: '12ms', errRate: '0.0%', sparkline: [40, 42, 38],
    tests: 100, errors: 0, deployment: '1d ago'
  },
  {
    id: 4, name: 'payment-service', status: 'warning',
    layer: 'compute',
    x: 58, y: 18,
    connections: [7],
    p95: '74ms', errRate: '2.1%', sparkline: [50, 68, 74],
    tests: 94, errors: 2, deployment: '30m ago'
  },
  {
    id: 5, name: 'notification-svc', status: 'healthy',
    layer: 'compute',
    x: 58, y: 48,
    connections: [8],
    p95: '29ms', errRate: '0.0%', sparkline: [30, 28, 32],
    tests: 100, errors: 0, deployment: '5h ago'
  },
  {
    id: 6, name: 'analytics-service', status: 'critical', // failing node
    layer: 'compute',
    x: 58, y: 74,
    connections: [9],
    p95: '820ms', errRate: '14.3%', sparkline: [45, 72, 100],
    tests: 85, errors: 12, deployment: '15m ago'
  },
  {
    id: 7, name: 'stripe-api', status: 'healthy',
    layer: 'edge',
    x: 82, y: 18,
    connections: [],
    p95: '55ms', errRate: '0.0%', sparkline: [55, 57, 54],
    tests: 100, errors: 0, deployment: '1d ago'
  },
  {
    id: 8, name: 'email-queue', status: 'healthy',
    layer: 'data',
    x: 82, y: 48,
    connections: [],
    p95: '8ms', errRate: '0.0%', sparkline: [20, 22, 19],
    tests: 100, errors: 0, deployment: '6h ago'
  },
  {
    id: 9, name: 'postgres-db', status: 'healthy',
    layer: 'data',
    x: 82, y: 74,
    connections: [],
    p95: '15ms', errRate: '0.0%', sparkline: [42, 40, 44],
    tests: 100, errors: 0, deployment: '2d ago'
  },
];

/* Edges that touch the failing node (id=6) or its upstream (id=2→6) */
const BLAST_EDGE = '2-6';
const CRITICAL_ID = 6;

/* ─────────────────────────────────────────────
   Timeline Events
───────────────────────────────────────────── */
const timelineEvents = [
  { position: 8, type: 'deploy', label: 'Deploy v2.0', color: '#22c55e' },
  { position: 20, type: 'scan', label: 'Sentinel Scan', color: '#8b5cf6' },
  { position: 34, type: 'deploy', label: 'Deploy v2.1', color: '#22c55e' },
  { position: 48, type: 'scan', label: 'Sentinel Scan', color: '#8b5cf6' },
  { position: 61, type: 'anomaly', label: 'Anomaly Detected', color: '#ef4444' },
  { position: 72, type: 'scan', label: 'Sentinel Scan', color: '#8b5cf6' },
  { position: 83, type: 'deploy', label: 'Rollback Initiated', color: '#f59e0b' },
  { position: 91, type: 'anomaly', label: 'analytics-service CRIT', color: '#ef4444' },
];

/* ─────────────────────────────────────────────
   Swimlane config
───────────────────────────────────────────── */
const swimlanes = [
  { id: 'edge', label: 'Edge / Gateway', yStart: 5, yEnd: 38 },
  { id: 'compute', label: 'Compute Services', yStart: 40, yEnd: 68 },
  { id: 'data', label: 'Data / Persistence', yStart: 70, yEnd: 95 },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const statusConfig = {
  healthy: { dot: '#22c55e', border: '#22c55e', shadow: '#22c55e40', label: 'Healthy', badgeBg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  warning: { dot: '#f59e0b', border: '#f59e0b', shadow: '#f59e0b40', label: 'Degraded', badgeBg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  critical: { dot: '#ef4444', border: '#ef4444', shadow: '#ef444440', label: 'Failed', badgeBg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-[14px]">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[4px] rounded-sm"
          style={{ height: `${(v / max) * 14}px`, backgroundColor: color, opacity: 0.8 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export function CortexPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [view, setView] = useState<'graph' | 'service' | 'flow'>('graph');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [filters, setFilters] = useState({ sentinel: true, fortress: true, cortex: true });
  const [layers, setLayers] = useState({
    microservices: true, apis: true, databases: true, external: true, queues: true
  });
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  const repoName =
    id === 'infrazero' ? 'InfraZero' :
      id === 'immersa' ? 'Immersa' :
        id === 'velocis-core' ? 'velocis-core' :
          id === 'ai-observatory' ? 'ai-observatory' :
            id === 'distributed-lab' ? 'distributed-lab' : 'test-sandbox';

  const selectedService = selectedNode ? services.find(s => s.id === selectedNode) : null;

  const themeClass = isDarkMode ? 'dark' : '';

  /* ── CSS Animations ── */
  const keyframes = `
    @keyframes dashFlow {
      to { stroke-dashoffset: -40; }
    }
    @keyframes sentinelSweep {
      0%   { left: -2%; opacity: 0; }
      5%   { opacity: 1; }
      90%  { opacity: 1; }
      100% { left: 102%; opacity: 0; }
    }
    @keyframes fortressPing {
      0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 0.7; }
      100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
    }
    @keyframes liveBlip {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(0.75); }
    }
    .animate-dash-flow {
      stroke-dasharray: 8 5;
      animation: dashFlow 1.6s linear infinite;
    }
    .animate-sentinel-sweep {
      animation: sentinelSweep 5s ease-in-out infinite;
    }
    .animate-fortress-ping {
      animation: fortressPing 1.5s ease-out infinite;
    }
    .animate-live-blip {
      animation: liveBlip 1.1s ease-in-out infinite;
    }
    /* Premium custom scrollbar */
    .cc-scroll::-webkit-scrollbar { width: 5px; }
    .cc-scroll::-webkit-scrollbar-track { background: transparent; }
    .cc-scroll::-webkit-scrollbar-thumb { background: rgba(100,100,120,0.3); border-radius: 6px; }
    .cc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100,100,120,0.6); }
  `;

  return (
    <div className={`${themeClass} w-full h-full`}>
      <style>{keyframes}</style>

      <div
        className="w-full h-screen flex flex-col overflow-hidden font-['Inter','Geist_Sans',sans-serif] transition-colors duration-300"
        style={{ backgroundColor: isDarkMode ? '#080a0f' : '#f4f5f7' }}
      >

        {/* ── Top Navigation Bar ── */}
        <div
          className="flex-none z-50 flex items-center justify-between px-5 h-[54px] border-b transition-colors"
          style={{
            backgroundColor: isDarkMode ? 'rgba(12,14,20,0.95)' : 'rgba(255,255,255,0.95)',
            borderColor: isDarkMode ? '#1a1f2e' : '#e5e7eb',
            backdropFilter: 'blur(16px)'
          }}
        >
          {/* Left – Brand + Breadcrumb */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center shadow-sm border border-gray-100 dark:border-zinc-700 dark:bg-zinc-800">
                <span className="text-black dark:text-white font-bold text-xs">V</span>
              </div>
              <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Velocis</span>
            </div>
            <div className={`flex items-center gap-2 text-[13px] font-medium ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
              <button onClick={() => navigate('/dashboard')} className={`hover:${isDarkMode ? 'text-white' : 'text-gray-900'} transition-colors`}>Dashboard</button>
              <span>/</span>
              <button onClick={() => navigate(`/repo/${id}`)} className={`hover:${isDarkMode ? 'text-white' : 'text-gray-900'} transition-colors`}>{repoName}</button>
              <span>/</span>
              <span className={isDarkMode ? 'text-white font-semibold' : 'text-gray-900 font-semibold'}>Visual Cortex</span>
            </div>
          </div>

          {/* Center – View Toggle */}
          <div
            className="hidden md:flex items-center rounded-lg p-[3px] gap-[2px]"
            style={{
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
              border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`
            }}
          >
            {(['graph', 'service', 'flow'] as const).map(viewType => (
              <button
                key={viewType}
                onClick={() => setView(viewType)}
                className="px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-all capitalize"
                style={{
                  backgroundColor: view === viewType
                    ? (isDarkMode ? '#1e2535' : '#ffffff')
                    : 'transparent',
                  color: view === viewType
                    ? (isDarkMode ? '#e2e8f0' : '#111827')
                    : (isDarkMode ? '#6b7280' : '#9ca3af'),
                  boxShadow: view === viewType ? '0 1px 4px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {viewType === 'graph' ? 'Graph View' : viewType === 'service' ? 'Service Map' : 'Dep. Flow'}
              </button>
            ))}
          </div>

          {/* Right – Actions */}
          <div className="flex items-center gap-2">
            {/* Sentinel Active badge */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
              style={{
                backgroundColor: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#a78bfa'
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-live-blip" />
              Sentinel Active
            </div>

            {[
              { icon: RefreshCw, title: 'Refresh' },
              { icon: Target, title: 'Fit to screen' },
              { icon: Maximize2, title: 'Fullscreen' },
            ].map(({ icon: Icon, title }) => (
              <button
                key={title}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}
                title={title}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDarkMode ? '#1e2535' : '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDarkMode ? '#1e2535' : '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div
              className="w-7 h-7 rounded-full flex items-center justify-center ml-1 text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: isDarkMode ? '#1e2535' : '#ede9fe',
                color: isDarkMode ? '#a78bfa' : '#7c3aed',
                border: `1px solid ${isDarkMode ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)'}`
              }}
            >
              R
            </div>
          </div>
        </div>

        {/* ── Main Body ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left Control Panel ── */}
          <AnimatePresence>
            {leftPanelOpen && (
              <motion.div
                initial={{ x: -290, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -290, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="w-[270px] flex-none border-r flex flex-col overflow-hidden cc-scroll transition-colors z-30"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(10,12,18,0.97)' : 'rgba(255,255,255,0.97)',
                  borderColor: isDarkMode ? '#1a1f2e' : '#e5e7eb'
                }}
              >
                <div className="flex-1 overflow-y-auto cc-scroll p-5 space-y-7">

                  {/* Search */}
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                      style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}
                    />
                    <input
                      type="text"
                      placeholder="Search services…"
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-all"
                      style={{
                        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
                        border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`,
                        color: isDarkMode ? '#e2e8f0' : '#111827'
                      }}
                    />
                  </div>

                  {/* Agent Filters */}
                  <div>
                    <h3
                      className="text-[10px] font-bold tracking-widest uppercase mb-3"
                      style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}
                    >
                      Agent Filters
                    </h3>
                    <div className="space-y-2">
                      {[
                        { key: 'sentinel', label: 'Sentinel Signals', icon: Shield, activeColor: '#8b5cf6', activeBg: 'rgba(139,92,246,0.1)', activeBorder: 'rgba(139,92,246,0.4)' },
                        { key: 'fortress', label: 'Fortress Failures', icon: TestTube2, activeColor: '#3b82f6', activeBg: 'rgba(59,130,246,0.1)', activeBorder: 'rgba(59,130,246,0.4)' },
                        { key: 'cortex', label: 'Cortex Layers', icon: Eye, activeColor: '#10b981', activeBg: 'rgba(16,185,129,0.1)', activeBorder: 'rgba(16,185,129,0.4)' },
                      ].map(filter => {
                        const active = filters[filter.key as keyof typeof filters];
                        return (
                          <button
                            key={filter.key}
                            onClick={() => setFilters({ ...filters, [filter.key]: !active })}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all"
                            style={{
                              backgroundColor: active
                                ? filter.activeBg
                                : (isDarkMode ? 'transparent' : '#f9fafb'),
                              border: `1px solid ${active ? filter.activeBorder : (isDarkMode ? '#1a1f2e' : '#e5e7eb')}`,
                              color: active
                                ? filter.activeColor
                                : (isDarkMode ? '#6b7280' : '#9ca3af')
                            }}
                          >
                            <filter.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{filter.label}</span>
                            {/* Active indicator pip */}
                            {active && (
                              <div
                                className="ml-auto w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: filter.activeColor }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Layer Controls */}
                  <div>
                    <h3
                      className="text-[10px] font-bold tracking-widest uppercase mb-3"
                      style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}
                    >
                      Layer Controls
                    </h3>
                    <div className="space-y-1.5">
                      {[
                        { key: 'microservices', label: 'Microservices' },
                        { key: 'apis', label: 'APIs' },
                        { key: 'databases', label: 'Databases' },
                        { key: 'external', label: 'External Services' },
                        { key: 'queues', label: 'Queues' },
                      ].map(layer => {
                        const active = layers[layer.key as keyof typeof layers];
                        return (
                          <label
                            key={layer.key}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all"
                            style={{
                              backgroundColor: active ? (isDarkMode ? 'rgba(255,255,255,0.03)' : '#f3f4f6') : 'transparent'
                            }}
                          >
                            {/* Custom checkbox */}
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                              style={{
                                backgroundColor: active ? '#8b5cf6' : 'transparent',
                                border: `1.5px solid ${active ? '#8b5cf6' : (isDarkMode ? '#374151' : '#d1d5db')}`
                              }}
                            >
                              {active && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => setLayers({ ...layers, [layer.key]: !active })}
                              className="sr-only"
                            />
                            <span
                              className="text-[13px] font-medium"
                              style={{ color: active ? (isDarkMode ? '#e2e8f0' : '#111827') : (isDarkMode ? '#4b5563' : '#9ca3af') }}
                            >
                              {layer.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Graph Density */}
                  <div>
                    <h3
                      className="text-[10px] font-bold tracking-widest uppercase mb-3"
                      style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}
                    >
                      Graph Density
                    </h3>
                    <input
                      type="range" min="0" max="100" defaultValue="70"
                      className="w-full accent-violet-500"
                      style={{ accentColor: '#8b5cf6' }}
                    />
                    <div
                      className="flex justify-between text-[11px] mt-1 font-medium"
                      style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}
                    >
                      <span>Minimal</span><span>Full</span>
                    </div>
                  </div>

                  {/* System Summary */}
                  <div
                    className="rounded-xl p-4 space-y-3"
                    style={{
                      backgroundColor: isDarkMode ? '#0e1117' : '#f9fafb',
                      border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`
                    }}
                  >
                    <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}>
                      System Status
                    </div>
                    {[
                      { label: 'Healthy', count: services.filter(s => s.status === 'healthy').length, color: '#22c55e' },
                      { label: 'Degraded', count: services.filter(s => s.status === 'warning').length, color: '#f59e0b' },
                      { label: 'Critical', count: services.filter(s => s.status === 'critical').length, color: '#ef4444' },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                          <span className="text-[12px]" style={{ color: isDarkMode ? '#6b7280' : '#6b7280' }}>{stat.label}</span>
                        </div>
                        <span className="text-[13px] font-semibold" style={{ color: isDarkMode ? '#e2e8f0' : '#111827' }}>{stat.count}</span>
                      </div>
                    ))}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Main Graph Canvas ── */}
          <div className="flex-1 relative overflow-hidden">

            {/* Background Grid */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(${isDarkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px),
                  linear-gradient(90deg, ${isDarkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px',
                backgroundColor: isDarkMode ? '#080a0f' : '#f4f5f7'
              }}
            />
            {/* Vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)' }}
            />

            {/* ── Sentinel Scanning Laser ── */}
            {filters.sentinel && (
              <div
                className="animate-sentinel-sweep absolute top-0 h-full pointer-events-none z-10"
                style={{
                  width: '2px',
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(139,92,246,0.7) 40%, rgba(167,139,250,0.5) 60%, transparent 100%)',
                  boxShadow: '0 0 18px 4px rgba(139,92,246,0.25)',
                  opacity: 0.7
                }}
              />
            )}

            {/* ── Swimlane Plates ── */}
            {swimlanes.map(lane => (
              <div
                key={lane.id}
                className="absolute pointer-events-none"
                style={{
                  left: '2%', right: selectedNode ? '34%' : '2%',
                  top: `${lane.yStart}%`, height: `${lane.yEnd - lane.yStart}%`,
                  border: `1px dashed ${isDarkMode ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.15)'}`,
                  borderRadius: '12px',
                  backgroundColor: isDarkMode
                    ? 'rgba(99,102,241,0.025)'
                    : 'rgba(99,102,241,0.03)',
                  transition: 'right 0.25s ease'
                }}
              >
                <span
                  className="absolute top-2 left-3 text-[10px] font-semibold tracking-widest uppercase select-none"
                  style={{ color: isDarkMode ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.4)' }}
                >
                  {lane.label}
                </span>
              </div>
            ))}

            {/* ── SVG Edge Layer ── */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
              <defs>
                <marker id="arrowHealthy" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#4b5563" />
                </marker>
                <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
                </marker>
              </defs>

              {services.map(service =>
                service.connections.map(targetId => {
                  const target = services.find(s => s.id === targetId);
                  if (!target) return null;
                  const edgeKey = `${service.id}-${targetId}`;
                  const isBlast = edgeKey === BLAST_EDGE || targetId === CRITICAL_ID || service.id === CRITICAL_ID;
                  const strokeColor = isBlast ? '#ef4444' : (isDarkMode ? '#374151' : '#d1d5db');
                  const x1 = `${service.x}%`, y1 = `${service.y}%`;
                  const x2 = `${target.x}%`, y2 = `${target.y}%`;
                  // cubic bezier control points for organic curves
                  const cx1 = `${(service.x + target.x) / 2 + (target.y - service.y) * 0.15}%`;
                  const cy1 = `${service.y}%`;
                  const cx2 = `${(service.x + target.x) / 2 + (target.y - service.y) * 0.15}%`;
                  const cy2 = `${target.y}%`;

                  return (
                    <path
                      key={edgeKey}
                      d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isBlast ? 2 : 1.5}
                      strokeOpacity={isBlast ? 0.9 : 0.55}
                      className="animate-dash-flow"
                      markerEnd={isBlast ? 'url(#arrowRed)' : 'url(#arrowHealthy)'}
                    />
                  );
                })
              )}
            </svg>

            {/* ── Service Nodes ── */}
            <div className="absolute inset-0" style={{ zIndex: 10 }}>
              {services.map((service, index) => {
                const cfg = statusConfig[service.status as keyof typeof statusConfig];
                const isCritical = service.id === CRITICAL_ID;
                const sparkColor = service.status === 'critical' ? '#ef4444' : service.status === 'warning' ? '#f59e0b' : '#22c55e';

                return (
                  <motion.div
                    key={service.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.07 }}
                    className="absolute cursor-pointer group"
                    style={{
                      left: `${service.x}%`,
                      top: `${service.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => setSelectedNode(service.id === selectedNode ? null : service.id)}
                  >
                    {/* Ping rings for critical node */}
                    {isCritical && (
                      <>
                        <div
                          className="absolute rounded-full pointer-events-none animate-fortress-ping"
                          style={{
                            width: '90px', height: '90px',
                            top: '50%', left: '50%',
                            border: '2px solid rgba(239,68,68,0.5)',
                            animationDelay: '0s'
                          }}
                        />
                        <div
                          className="absolute rounded-full pointer-events-none animate-fortress-ping"
                          style={{
                            width: '90px', height: '90px',
                            top: '50%', left: '50%',
                            border: '2px solid rgba(239,68,68,0.3)',
                            animationDelay: '0.5s'
                          }}
                        />
                        <div
                          className="absolute rounded-full pointer-events-none animate-fortress-ping"
                          style={{
                            width: '90px', height: '90px',
                            top: '50%', left: '50%',
                            border: '2px solid rgba(239,68,68,0.15)',
                            animationDelay: '1s'
                          }}
                        />
                      </>
                    )}

                    {/* Rich Mini-Card */}
                    <motion.div
                      animate={{ y: [-1.5, 1.5, -1.5] }}
                      transition={{ duration: 4 + index * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                      whileHover={{ scale: 1.06, y: 0 }}
                      className="relative rounded-xl transition-all"
                      style={{
                        width: '148px',
                        backgroundColor: isDarkMode ? '#0e1117' : '#ffffff',
                        border: `1.5px solid ${selectedNode === service.id ? cfg.border : (isDarkMode ? '#1a1f2e' : '#e5e7eb')}`,
                        boxShadow: selectedNode === service.id
                          ? `0 0 0 2px ${cfg.border}55, 0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${cfg.shadow}`
                          : isDarkMode
                            ? `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${cfg.shadow}`
                            : `0 4px 20px rgba(0,0,0,0.12), 0 0 8px ${cfg.shadow}`,
                        padding: '10px 12px'
                      }}
                    >
                      {/* Card Top Row: status dot + name */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
                        />
                        <span
                          className="text-[12px] font-semibold truncate leading-tight"
                          style={{ color: isDarkMode ? '#f1f5f9' : '#111827' }}
                        >
                          {service.name}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold mb-2.5"
                        style={{ backgroundColor: cfg.badgeBg, color: cfg.text }}
                      >
                        {service.status === 'critical' && <AlertCircle className="w-2.5 h-2.5" />}
                        {service.status === 'warning' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {service.status === 'healthy' && <CheckCircle className="w-2.5 h-2.5" />}
                        {cfg.label}
                      </div>

                      {/* Telemetry row */}
                      <div
                        className="flex items-center justify-between text-[10px] font-mono mb-2"
                        style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}
                      >
                        <span>p95 <span style={{ color: isDarkMode ? '#e2e8f0' : '#111827', fontWeight: 600 }}>{service.p95}</span></span>
                        <span>err <span style={{ color: cfg.text, fontWeight: 600 }}>{service.errRate}</span></span>
                      </div>

                      {/* Sparkline */}
                      <Sparkline data={service.sparkline} color={sparkColor} />
                    </motion.div>

                    {/* Fortress action badge for critical node */}
                    {isCritical && filters.fortress && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold shadow-xl"
                        style={{
                          top: 'calc(100% + 8px)',
                          backgroundColor: isDarkMode ? 'rgba(120,53,15,0.95)' : '#fffbeb',
                          border: `1px solid ${isDarkMode ? 'rgba(245,158,11,0.5)' : '#fcd34d'}`,
                          color: isDarkMode ? '#fbbf24' : '#92400e',
                          zIndex: 20,
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Fortress: Rerouting traffic…
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Toggle Left Panel Btn */}
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className="absolute top-3 left-3 p-2 rounded-lg backdrop-blur-sm transition-all hover:scale-105 z-20"
              style={{
                backgroundColor: isDarkMode ? 'rgba(14,17,23,0.85)' : 'rgba(255,255,255,0.9)',
                border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`
              }}
            >
              <motion.div animate={{ rotate: leftPanelOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
                <ChevronLeft className="w-4 h-4" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }} />
              </motion.div>
            </button>

            {/* Canvas label */}
            <div
              className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-2"
              style={{
                backgroundColor: isDarkMode ? 'rgba(14,17,23,0.85)' : 'rgba(255,255,255,0.9)',
                border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`,
                color: isDarkMode ? '#4b5563' : '#9ca3af',
                backdropFilter: 'blur(8px)'
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-live-blip" style={{ backgroundColor: '#ef4444' }} />
              Live Architecture View
            </div>

            {/* Floating Quick Actions */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
              {[
                { icon: AlertCircle, label: 'Focus failing nodes', color: '#ef4444' },
                { icon: RotateCcw, label: 'Reset view', color: isDarkMode ? '#6b7280' : '#9ca3af' },
                { icon: Grid3x3, label: 'Auto-layout', color: isDarkMode ? '#6b7280' : '#9ca3af' },
                { icon: Camera, label: 'Screenshot graph', color: isDarkMode ? '#6b7280' : '#9ca3af' },
              ].map((action, index) => (
                <motion.button
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.8 + index * 0.08 }}
                  whileHover={{ scale: 1.12 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(14,17,23,0.9)' : 'rgba(255,255,255,0.9)',
                    border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`
                  }}
                  title={action.label}
                >
                  <action.icon className="w-4 h-4" style={{ color: action.color }} />
                </motion.button>
              ))}
            </div>
          </div>

          {/* ── Right Inspector Panel ── */}
          <AnimatePresence>
            {selectedNode && selectedService && (
              <motion.div
                initial={{ x: 360, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 360, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="w-[320px] flex-none border-l flex flex-col overflow-hidden z-30"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(10,12,18,0.97)' : 'rgba(255,255,255,0.97)',
                  borderColor: isDarkMode ? '#1a1f2e' : '#e5e7eb'
                }}
              >
                <div className="flex-1 overflow-y-auto cc-scroll p-5 space-y-5">

                  {/* Service Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2
                        className="text-lg font-bold tracking-tight"
                        style={{ color: isDarkMode ? '#f1f5f9' : '#111827' }}
                      >
                        {selectedService.name}
                      </h2>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="p-1 rounded transition-colors"
                        style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDarkMode ? '#1e2535' : '#f3f4f6')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Status badge */}
                    {(() => {
                      const cfg = statusConfig[selectedService.status as keyof typeof statusConfig];
                      return (
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                          style={{ backgroundColor: cfg.badgeBg, color: cfg.text }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                          {cfg.label}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Telemetry */}
                  <div
                    className="rounded-xl p-4 grid grid-cols-2 gap-3"
                    style={{
                      backgroundColor: isDarkMode ? '#0e1117' : '#f9fafb',
                      border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`
                    }}
                  >
                    {[
                      { label: 'p95 Latency', value: selectedService.p95 },
                      { label: 'Error Rate', value: selectedService.errRate },
                      { label: 'Tests', value: `${selectedService.tests}%` },
                      { label: 'Last Deploy', value: selectedService.deployment },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}>
                          {item.label}
                        </div>
                        <div className="text-[14px] font-semibold" style={{ color: isDarkMode ? '#f1f5f9' : '#111827' }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sentinel Insights */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
                      <h3 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
                        Sentinel Insights
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {selectedService.status === 'critical' && (
                        <div
                          className="flex items-start gap-2.5 p-3 rounded-lg"
                          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-500" />
                          <p className="text-[12px] leading-relaxed" style={{ color: isDarkMode ? '#fca5a5' : '#b91c1c' }}>
                            Critical memory leak detected in request handler. p95 latency exceeds SLO.
                          </p>
                        </div>
                      )}
                      {selectedService.status === 'warning' && (
                        <div
                          className="flex items-start gap-2.5 p-3 rounded-lg"
                          style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                          <p className="text-[12px] leading-relaxed" style={{ color: isDarkMode ? '#fcd34d' : '#92400e' }}>
                            Potential race condition detected. Elevated error rate — blast radius from analytics-service.
                          </p>
                        </div>
                      )}
                      <div
                        className="flex items-start gap-2.5 p-3 rounded-lg"
                        style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#f9fafb', border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#6b7280' }} />
                        <p className="text-[12px] leading-relaxed" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
                          Memory usage spike observed during peak hours (08:00–10:00 UTC).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fortress Status */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TestTube2 className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                      <h3 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
                        Fortress Status
                      </h3>
                    </div>
                    <div
                      className="rounded-xl p-4 space-y-2.5"
                      style={{
                        backgroundColor: isDarkMode ? '#0e1117' : '#f9fafb',
                        border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px]" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>Tests passing</span>
                        <span className="text-[13px] font-semibold" style={{ color: isDarkMode ? '#f1f5f9' : '#111827' }}>{selectedService.tests}%</span>
                      </div>
                      {selectedService.status !== 'healthy' && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px]" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>Last failure</span>
                          <span className="text-[13px] font-semibold" style={{ color: isDarkMode ? '#f1f5f9' : '#111827' }}>12 min ago</span>
                        </div>
                      )}
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#1a1f2e' : '#e5e7eb' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${selectedService.tests}%`,
                            backgroundColor: selectedService.tests === 100 ? '#22c55e' : selectedService.tests >= 90 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dependencies */}
                  <div>
                    <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>
                      Dependencies
                    </h3>
                    <div className="space-y-1.5">
                      {selectedService.connections.map(connId => {
                        const conn = services.find(s => s.id === connId);
                        if (!conn) return null;
                        const connCfg = statusConfig[conn.status as keyof typeof statusConfig];
                        return (
                          <button
                            key={connId}
                            onClick={() => setSelectedNode(connId)}
                            className="w-full flex items-center justify-between p-3 rounded-lg transition-all"
                            style={{
                              backgroundColor: isDarkMode ? '#0e1117' : '#f9fafb',
                              border: `1px solid ${isDarkMode ? '#1a1f2e' : '#e5e7eb'}`
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = connCfg.border + '80')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = isDarkMode ? '#1a1f2e' : '#e5e7eb')}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: connCfg.dot }} />
                              <span className="text-[13px] font-medium" style={{ color: isDarkMode ? '#e2e8f0' : '#111827' }}>{conn.name}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5" style={{ color: isDarkMode ? '#4b5563' : '#d1d5db' }} />
                          </button>
                        );
                      })}
                      {selectedService.connections.length === 0 && (
                        <p className="text-[12px]" style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}>No downstream dependencies</p>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-[13px] transition-all hover:opacity-90"
                    style={{
                      backgroundColor: isDarkMode ? '#f1f5f9' : '#111827',
                      color: isDarkMode ? '#111827' : '#f1f5f9'
                    }}
                  >
                    Open in Workspace <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom System Activity Timeline ── */}
        <div
          className="flex-none border-t transition-colors"
          style={{
            backgroundColor: isDarkMode ? 'rgba(10,12,18,0.97)' : 'rgba(255,255,255,0.97)',
            borderColor: isDarkMode ? '#1a1f2e' : '#e5e7eb',
            backdropFilter: 'blur(16px)',
            height: '76px'
          }}
        >
          <div className="h-full px-6 flex flex-col justify-center gap-2">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}
              >
                System Activity Timeline
              </span>
              <div className="flex items-center gap-4">
                <span className="text-[10px]" style={{ color: isDarkMode ? '#4b5563' : '#9ca3af' }}>Last 24 hours</span>
                {/* LIVE indicator */}
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-live-blip" />
                  <span className="text-[10px] font-bold tracking-wider text-red-500">LIVE</span>
                </div>
              </div>
            </div>

            {/* Timeline Track */}
            <div className="relative h-6">
              {/* Track bar */}
              <div
                className="absolute inset-y-0 left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full"
                style={{ backgroundColor: isDarkMode ? '#1a1f2e' : '#e5e7eb' }}
              />

              {/* Event markers */}
              {timelineEvents.map((event, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer group"
                  style={{ left: `${event.position}%` }}
                  onMouseEnter={() => setHoveredEvent(i)}
                  onMouseLeave={() => setHoveredEvent(null)}
                >
                  {/* Marker dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2 transition-transform group-hover:scale-150"
                    style={{
                      backgroundColor: event.color,
                      borderColor: isDarkMode ? '#080a0f' : '#f4f5f7',
                      boxShadow: `0 0 8px ${event.color}88`
                    }}
                  />
                  {/* Tooltip */}
                  {hoveredEvent === i && (
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none shadow-xl"
                      style={{
                        backgroundColor: isDarkMode ? '#1a1f2e' : '#111827',
                        color: event.color,
                        border: `1px solid ${event.color}44`
                      }}
                    >
                      {event.label}
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                        style={{ borderTopColor: isDarkMode ? '#1a1f2e' : '#111827' }}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* LIVE dot at far right */}
              <div
                className="absolute top-1/2 right-0 -translate-y-1/2 flex items-center gap-1"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-live-blip" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

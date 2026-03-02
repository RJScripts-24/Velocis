import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Home, Star, Sun, Moon, Loader2 } from 'lucide-react';
import type { DashboardResponse, ActivityEvent, SystemHealth } from '../../lib/api';
import { useAuth } from '../../lib/auth';

// Mock data — replace with API calls once backend auth is live
const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: '1', agent: 'sentinel', message: 'Security scan complete — no critical issues', repo_id: 'velocis-commerce', repo_name: 'velocis-commerce', timestamp_ago: '2m ago', severity: 'healthy', timestamp: new Date().toISOString() },
  { id: '2', agent: 'fortress', message: '42 unit tests passing', repo_id: 'velocis-commerce', repo_name: 'velocis-commerce', timestamp_ago: '5m ago', severity: 'healthy', timestamp: new Date().toISOString() },
  { id: '3', agent: 'cortex', message: 'Dependency graph updated', repo_id: 'velocis-commerce', repo_name: 'velocis-commerce', timestamp_ago: '12m ago', severity: 'info', timestamp: new Date().toISOString() },
  { id: '4', agent: 'sentinel', message: 'PR #7 reviewed — 2 suggestions', repo_id: 'velocis-commerce', repo_name: 'velocis-commerce', timestamp_ago: '28m ago', severity: 'info', timestamp: new Date().toISOString() },
];

const MOCK_HEALTH: SystemHealth = {
  api_latency_ms: 48,
  queue_depth: 0,
  agent_uptime_pct: 99.9,
  storage_used_pct: 14,
};

const MOCK_DASHBOARD: DashboardResponse = {
  user: { name: 'Developer', avatar_url: '' },
  summary: { healthy: 1, warning: 0, critical: 0, open_risks: 2, agents_running: 3 },
  repos: [
    {
      id: 'velocis-commerce',
      name: 'velocis-commerce',
      status: 'healthy',
      language: 'TypeScript',
      last_activity: [
        { agent: 'sentinel', message: 'Security scan complete — no critical issues', severity: 'healthy', timestamp_ago: '2m ago' },
        { agent: 'fortress', message: '42 tests passing, 0 failing', severity: 'healthy', timestamp_ago: '5m ago' },
      ],
      commit_sparkline: [2, 4, 3, 5, 6, 4, 7, 5, 8, 9, 6, 7],
      commit_trend_label: '+12% this week',
      commit_trend_direction: 'up',
    },
  ],
  activity_feed: MOCK_ACTIVITY,
  recent_deployments: [
    { repo_id: 'velocis-commerce', environment: 'production', status: 'success', deployed_at: new Date().toISOString() },
  ],
  system: MOCK_HEALTH,
};

const CommitBarChart = ({
  data,
  color,
}: {
  data: number[];
  color: string;
}) => {
  const max = Math.max(...data) || 1;
  return (
    <div className="flex items-end gap-px w-full h-[44px]">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1 shrink-0 rounded-t-sm"
          style={{
            height: `${Math.max(12, (v / max) * 100)}%`,
            backgroundColor: color,
            opacity: i === data.length - 1 ? 1 : 0.25 + (i / data.length) * 0.65,
          }}
        />
      ))}
    </div>
  );
};

export function DashboardPage() {
  const [activityTab, setActivityTab] = useState("all");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mock state — replace with API calls once backend auth is live
  const [dashboardData] = useState<DashboardResponse>(MOCK_DASHBOARD);
  const [activityData] = useState<ActivityEvent[]>(MOCK_ACTIVITY);
  const [systemHealth] = useState<SystemHealth>(MOCK_HEALTH);
  const [isLoading] = useState(false);

  const themeClass = isDarkMode ? 'dark' : '';

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'GOOD MORNING';
    if (hr < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className={`${themeClass} w-full min-h-screen`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes custom-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      <div className="min-h-screen flex flex-col font-['Geist_Sans',_'Inter',_sans-serif] bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">

        {/* Global Noise Texture Overlay */}
        <div
          className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.035]"
          style={{ backgroundImage: "url('/noise.png')" }}
        />

        {/* Dark Mode Overlays matching Workspace */}
        {isDarkMode && (
          <>
            {/* Deep Slate Radial Glow */}
            <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(30,41,59,1)_0%,_rgba(15,23,42,1)_100%)] opacity-80 mix-blend-multiply" />

            {/* Additional glow layers matching old dashboard but styled for Tailwind */}
            <div className="fixed z-0 pointer-events-none w-[70vw] h-[70vh] -top-[20vh] -left-[10vw] bg-[radial-gradient(ellipse,_rgba(29,78,216,0.12)_0%,_transparent_65%)] blur-[40px]" />
            <div className="fixed z-0 pointer-events-none w-[50vw] h-[50vh] -bottom-[10vh] -right-[10vw] bg-[radial-gradient(ellipse,_rgba(5,150,105,0.09)_0%,_transparent_65%)] blur-[40px]" />
            <div className="fixed z-0 pointer-events-none w-[40vw] h-[40vh] top-[30vh] left-[35vw] bg-[radial-gradient(ellipse,_rgba(109,40,217,0.06)_0%,_transparent_65%)] blur-[60px]" />

            {/* Subtle Vignette */}
            <div className="fixed inset-0 pointer-events-none z-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />

            {/* Fine Noise Texture */}
            <div
              className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                mixBlendMode: 'overlay'
              }}
            />
          </>
        )}

        {/* Premium Header / Navbar */}
        <div className="flex-none z-50 border-b border-zinc-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl transition-colors duration-300 sticky top-0">
          <div className="px-6 h-[60px] flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 dark:bg-slate-800 shadow-sm border border-zinc-700 dark:border-slate-700">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="font-semibold text-zinc-900 dark:text-slate-100 hidden sm:block tracking-tight">Velocis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-slate-400 font-medium ml-2">
                <Home className="w-4 h-4" />
                <span className="text-zinc-300 dark:text-slate-700">/</span>
                <span className="text-zinc-900 dark:text-slate-100 font-semibold flex items-center gap-1.5">
                  Dashboard
                </span>
              </div>
            </div>

            {/* Center - Search */}
            <div className="hidden md:flex flex-1 max-w-[320px] bg-zinc-100/50 dark:bg-slate-800/50 border border-zinc-200 dark:border-slate-700 rounded-lg h-[34px] px-3 items-center gap-2 mx-auto">
              <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-500" />
              <span className="text-[13px] text-zinc-400 dark:text-slate-500 flex-1">Search...</span>
              <div className="text-[11px] text-zinc-400 dark:text-slate-500 ml-auto font-['JetBrains_Mono',_monospace]">⌘K</div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
                <div className="w-[7px] h-[7px] rounded-full bg-emerald-500 animate-[custom-pulse_2s_infinite]" />
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">sys ok</div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-800/30">
                <div className="w-[7px] h-[7px] rounded-full bg-amber-500" />
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-500">1 warn</div>
              </div>

              <div className="hidden lg:flex gap-0.5 ml-2">
                {['1h', '24h', '7d', '30d'].map(t => (
                  <button key={t} className={`text-xs px-2.5 py-1 rounded-md transition-colors ${t === '24h' ? 'font-bold bg-zinc-200/50 dark:bg-slate-800 text-zinc-900 dark:text-slate-100' : 'font-medium text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800/50'}`}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="text-xs text-zinc-400 dark:text-slate-500 ml-1 hidden lg:block font-medium">2m ago</div>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 ml-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-100"
              >
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              <button className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 shadow-sm flex items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors">
                <Star className="w-4 h-4 text-zinc-400 dark:text-slate-500" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full" />
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 relative shadow-sm cursor-pointer hover:scale-105 transition-transform text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  R
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] items-start relative z-10 w-full max-w-[1920px] mx-auto">

          {/* LEFT COLUMN - Main Dashboard */}
          <div className="p-6 md:p-8 lg:p-10 xl:pr-12">

            {/* HERO */}
            <div className="mb-8">
              {/* Condensed header: single clean line */}
              <div className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-slate-100">
                {getGreeting()}, {dashboardData?.user.name ?? user?.name ?? 'there'}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[13px] text-zinc-400 dark:text-slate-500 font-medium">
                <span>{currentDate}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-slate-600 inline-block" />
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[custom-pulse_2s_infinite] inline-block" />
                  {dashboardData?.summary.agents_running ?? 3} agents running
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  {dashboardData?.summary.warning ?? 1} warning active
                </span>
              </div>

              {/* Unified Metrics Bar — full-width, 4 segments with 1px dividers */}
              <div className="mt-6 w-full border border-[rgba(16,24,40,0.06)] dark:border-zinc-800 bg-white dark:bg-[#111114] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-lg flex divide-x divide-[rgba(16,24,40,0.06)] dark:divide-zinc-800">
                {[
                  { label: 'Healthy Repos', value: String(dashboardData?.summary.healthy ?? '—'), fg: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', anim: 'animate-[custom-pulse_2.5s_infinite]' },
                  { label: 'Warnings', value: String(dashboardData?.summary.warning ?? '—'), fg: 'text-amber-700 dark:text-amber-500', dot: 'bg-amber-500', anim: '' },
                  { label: 'Critical', value: String(dashboardData?.summary.critical ?? '—'), fg: 'text-rose-700 dark:text-rose-500', dot: 'bg-rose-500', anim: '' },
                  { label: 'Open Risks', value: String(dashboardData?.summary.open_risks ?? '—'), fg: 'text-zinc-700 dark:text-zinc-400', dot: 'bg-zinc-400 dark:bg-zinc-500', anim: '' },
                ].map((seg, i) => (
                  <div key={i} className="flex-1 flex items-center gap-3 px-5 py-4">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${seg.dot} ${seg.anim}`} />
                    <div>
                      <div className={`text-2xl font-bold leading-none tracking-tighter ${seg.fg}`}>{seg.value}</div>
                      <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mt-1 leading-none">{seg.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REPOSITORIES HEADER */}
            <div className="flex items-center gap-4">
              <div className="text-xl font-[700] tracking-tight text-zinc-900 dark:text-white font-['JetBrains_Mono',_monospace]">Repositories</div>
              <div className="flex gap-4 ml-auto font-medium text-[13px] text-zinc-500 dark:text-slate-400">
                <div className="hidden sm:flex items-center gap-1.5"><div className="w-[7px] h-[7px] rounded-full bg-emerald-500" />Healthy {dashboardData?.summary.healthy ?? '—'}</div>
                <div className="hidden sm:flex items-center gap-1.5"><div className="w-[7px] h-[7px] rounded-full bg-amber-500" />Warning {dashboardData?.summary.warning ?? '—'}</div>
                <div className="hidden sm:flex items-center gap-1.5"><div className="w-[7px] h-[7px] rounded-full bg-rose-500" />Critical {dashboardData?.summary.critical ?? '—'}</div>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-zinc-200 dark:from-slate-800/80 to-transparent mt-3 mb-6" />

            {/* REPO GRID — dynamic from API */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isLoading && (
                <div className="col-span-2 flex items-center justify-center py-20 gap-3 text-zinc-400 dark:text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Loading dashboard…</span>
                </div>
              )}
              {!isLoading && (dashboardData?.repos ?? []).map((repo) => {
                const statusColors: Record<string, { bar: string; badge: string; badgeBg: string; badgeBorder: string; dotColor: string; label: string }> = {
                  critical: { bar: 'border-t-rose-500', badge: 'text-rose-700 dark:text-rose-400', badgeBg: 'bg-rose-50 dark:bg-rose-950/30', badgeBorder: 'border-rose-200 dark:border-rose-800/40', dotColor: 'bg-rose-500', label: 'CRITICAL' },
                  warning: { bar: 'border-t-amber-500', badge: 'text-amber-700 dark:text-amber-400', badgeBg: 'bg-amber-50 dark:bg-amber-950/30', badgeBorder: 'border-amber-200 dark:border-amber-800/40', dotColor: 'bg-amber-500', label: 'WARNING' },
                  healthy: { bar: 'border-t-emerald-500', badge: 'text-emerald-700 dark:text-emerald-400', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/30', badgeBorder: 'border-emerald-200 dark:border-emerald-800/40', dotColor: 'bg-emerald-500', label: 'HEALTHY' },
                };
                const sc = statusColors[repo.status] ?? statusColors.healthy;
                const agentColors: Record<string, string> = { sentinel: 'text-indigo-600 dark:text-indigo-400', fortress: 'text-sky-600 dark:text-sky-400', cortex: 'text-emerald-600 dark:text-emerald-400' };
                const severityFg: Record<string, string> = { critical: 'text-rose-600 dark:text-rose-400', warning: 'text-amber-600 dark:text-amber-500', info: 'text-blue-600 dark:text-blue-400', healthy: 'text-emerald-600 dark:text-emerald-400' };
                const trendColor = repo.commit_trend_direction === 'down' ? 'text-rose-600 dark:text-rose-500' : repo.commit_trend_direction === 'up' ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500';
                const barColor = repo.status === 'critical' ? '#ef4444' : repo.status === 'warning' ? '#f59e0b' : '#10b981';
                return (
              <div
                key={repo.id}
                className={`group bg-white dark:bg-[#111114] border border-[rgba(16,24,40,0.06)] dark:border-zinc-800 border-t-2 ${sc.bar} rounded-2xl p-5 relative overflow-hidden cursor-pointer shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)] ring-1 ring-inset ring-black/5 dark:ring-white/[0.06] hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}
                onClick={() => navigate(`/repo/${repo.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-slate-100" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{repo.name}</div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${sc.badgeBg} ${sc.badge} border ${sc.badgeBorder}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${sc.dotColor}`} />{sc.label}
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  {repo.last_activity.slice(0, 2).map((act, ai) => (
                    <div key={ai} className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${agentColors[act.agent]?.replace('text-', 'bg-').split(' ')[0] ?? 'bg-zinc-400'}`} />
                      <div className={`text-xs font-bold shrink-0 ${agentColors[act.agent] ?? 'text-zinc-500'}`}>{act.agent.charAt(0).toUpperCase() + act.agent.slice(1)} →</div>
                      <div className={`text-[13px] font-medium flex-1 truncate ${severityFg[act.severity] ?? 'text-zinc-600 dark:text-zinc-400'}`}>{act.message}</div>
                      <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">{act.timestamp_ago}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-slate-500 mb-1.5 tracking-wider">commit activity · 7d</div>
                  <CommitBarChart data={repo.commit_sparkline} color={barColor} />
                  <div className={`flex justify-end mt-1 text-xs font-bold ${trendColor}`}>{repo.commit_trend_label}</div>
                </div>
              </div>
                );
              })}


            </div>
          </div>

          {/* RIGHT COLUMN - Activity & System Panels */}
          <div className="hidden xl:flex flex-col gap-5 border-l border-zinc-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#0A0A0E] backdrop-blur-xl p-5 z-20 w-[340px] shrink-0 pb-20">

            <div className="flex-1 flex flex-col gap-5">
              {/* ACTIVITY PANEL */}
              <div className="flex flex-col bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.025)] ring-1 ring-inset ring-black/5 dark:ring-white/[0.06] overflow-hidden shrink-0">
                <div className="p-4 pb-0 shrink-0">
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-semibold tracking-tight text-[15px] text-zinc-900 dark:text-white">Activity</div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">5 new</span>
                      <div className="relative flex h-2 w-2">
                        <span className="animate-[ping-slow_2s_infinite] absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">LIVE</span>
                    </div>
                  </div>

                  <div className="flex gap-1 pb-3 border-b border-zinc-100 dark:border-slate-800/60">
                    {['All', 'Sentinel', 'Fortress', 'Cortex'].map(tab => (
                      <button key={tab} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'All' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20' : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-slate-200 hover:bg-zinc-50 dark:hover:bg-slate-800/50'}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 scrollbar-hide max-h-[400px]">
                  {activityData
                    .filter(evt => activityTab === 'all' || evt.agent === activityTab.toLowerCase())
                    .map((evt, i) => {
                      const agentFg: Record<string, string> = { sentinel: 'text-indigo-600 dark:text-indigo-300', fortress: 'text-sky-600 dark:text-sky-300', cortex: 'text-emerald-600 dark:text-emerald-300' };
                      return (
                        <div key={evt.id ?? i} className="p-3.5 border-b border-zinc-100 dark:border-slate-800/50 hover:bg-zinc-50 dark:hover:bg-slate-800/30 transition-colors cursor-default">
                          <div className="flex justify-between items-center mb-1">
                            <div className={`text-[9px] font-bold uppercase tracking-widest ${agentFg[evt.agent] ?? 'text-zinc-500'}`}>{evt.agent}</div>
                            <div className="text-[10px] font-medium text-zinc-400 dark:text-slate-500">{evt.timestamp_ago}</div>
                          </div>
                          <div>
                            <span className="text-[13px] font-medium text-zinc-600 dark:text-slate-400">{evt.message} · </span>
                            <span className="text-[13px] font-bold text-zinc-900 dark:text-slate-100">{evt.repo_name}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* SYSTEM PANEL */}
              <div className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.025)] ring-1 ring-inset ring-black/5 dark:ring-white/[0.06] p-5 shrink-0">
                <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-slate-500 mb-4 font-['JetBrains_Mono',_monospace]">System</div>
                <div className="space-y-3">
                  {[
                    { label: 'API latency', val: systemHealth ? `${systemHealth.api_latency_ms}ms` : '—', color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500' },
                    { label: 'Queue depth', val: systemHealth ? String(systemHealth.queue_depth) : '—', color: 'text-zinc-900 dark:text-white', border: 'border-zinc-300 dark:border-slate-600' },
                    { label: 'Agent uptime', val: systemHealth ? `${systemHealth.agent_uptime_pct}%` : '—', color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500' },
                    { label: 'Storage', val: systemHealth ? `${systemHealth.storage_used_pct}%` : '—', color: 'text-amber-600 dark:text-amber-500', border: 'border-amber-500' }
                  ].map((r, i) => (
                    <div key={i} className={`flex justify-between items-center pb-2 ${i !== 3 ? 'border-b border-zinc-100 dark:border-slate-800/60' : ''}`}>
                      <div className={`pl-2.5 border-l-2 ${r.border} text-[13px] font-medium text-zinc-500 dark:text-slate-400 transition-colors`}>{r.label}</div>
                      <div className={`text-[13px] font-bold ${r.color}`}>{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECENT DEPLOYMENTS PANEL */}
              <div className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.025)] ring-1 ring-inset ring-black/5 dark:ring-white/[0.06] p-5 shrink-0">
                <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-slate-500 mb-4 font-['JetBrains_Mono',_monospace]">Recent Deployments</div>
                <div className="space-y-0.5">
                  {(dashboardData?.recent_deployments ?? []).map((dep, i) => (
                    <div key={i} className={`flex justify-between items-center py-2.5 ${i !== 0 ? 'border-t border-zinc-100 dark:border-slate-800/60' : ''}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${dep.status === 'failed' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <span className="text-[13px] font-bold text-zinc-900 dark:text-slate-100">{dep.repo_id}</span>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400 dark:text-slate-500">{dep.environment} · {new Date(dep.deployed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

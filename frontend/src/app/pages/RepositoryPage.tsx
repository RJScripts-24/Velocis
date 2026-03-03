import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, CheckCircle, Shield, TestTube2, Eye, GitBranch,
  ChevronRight, Home, Activity, Settings, Webhook, Sliders,
  TrendingUp, AlertCircle, Cloud, Folder, FileText, Bot,
  Sun, Moon, Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import type { RepoDetail, ActivityEvent } from '../../lib/api';
import { CommitBarChart } from './DashboardPage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Default fallback values used while data is loading or if the API fails
const FALLBACK_REPO: RepoDetail = {
  id: '',
  name: 'Loadingâ€¦',
  status: 'healthy',
  status_label: 'Loading',
  visibility: 'private',
  language: 'â€”',
  last_scanned_ago: 'â€”',
  last_scanned_at: new Date().toISOString(),
  size_loc: 'â€”',
  metrics: {
    risk_score: 'â€”',
    test_stability_pct: 0,
    architecture_drift: 'â€”',
    last_action_ago: 'â€”',
  },
  sentinel: { active_prs: 0, last_update_ago: 'â€”' },
  fortress: { status_message: 'â€”', last_run_ago: 'â€”' },
  cortex: { last_update_ago: 'â€”', service_count: 0 },
  risks: { critical: 0, medium: 0, low: 0 },
  commit_sparkline: [],
  commit_trend_label: '',
  commit_trend_direction: 'flat' as const,
};



function useCounter(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * target));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

function AnimatedCounter({ value }: { value: number }) {
  const count = useCounter(value, 2000);
  return <>{count}</>;
}

// â”€â”€â”€ Mini Terminal (replaces node-network SVG for "Launch Visual Cortex") â”€â”€â”€
const MiniTerminal = () => (
  <div className="w-full h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-zinc-700/60 flex flex-col">
    {/* macOS-style window header */}
    <div className="flex items-center gap-1.5 px-3 py-2 bg-[#2a2a2a] border-b border-zinc-700/50 shrink-0">
      <span className="w-[9px] h-[9px] rounded-full bg-[#ff5f57]" />
      <span className="w-[9px] h-[9px] rounded-full bg-[#febc2e]" />
      <span className="w-[9px] h-[9px] rounded-full bg-[#28c840]" />
      <span className="ml-2 text-[10px] text-zinc-500 font-mono">cortex â€” live trace</span>
    </div>
    {/* Terminal body */}
    <div className="p-3 font-mono text-[11px] leading-snug space-y-[3px] flex-1">
      <div><span className="text-zinc-600">12:01:03</span> <span className="text-emerald-400">[TRACE]</span> <span className="text-zinc-300">GET /api/services â†’ 200</span> <span className="text-zinc-600">38ms</span></div>
      <div><span className="text-zinc-600">12:01:04</span> <span className="text-sky-400">[SPAN ]</span> <span className="text-zinc-300">db.query workers_pool</span> <span className="text-zinc-600">12ms</span></div>
      <div><span className="text-zinc-600">12:01:04</span> <span className="text-amber-400">[WARN ]</span> <span className="text-amber-300/90">writer.go:214 mutex contention</span></div>
      <div><span className="text-zinc-600">12:01:05</span> <span className="text-emerald-400">[TRACE]</span> <span className="text-zinc-300">POST /api/scale â†’ 202</span> <span className="text-zinc-600">21ms</span></div>
      <div className="flex items-center gap-1 pt-0.5">
        <span className="text-zinc-600">12:01:05</span>
        <span className="text-zinc-400 animate-pulse">â–</span>
      </div>
    </div>
  </div>
);

// â”€â”€â”€ PR Risk Bars â€” monochromatic indigo scale, thin (h-1.5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const prData = [
  { label: "PR #478", risk: 15 },
  { label: "PR #479", risk: 62 },
  { label: "PR #480", risk: 8 },
  { label: "PR #481", risk: 44 },
  { label: "PR #482", risk: 91 },
  { label: "PR #483", risk: 27 },
];

// Monochromatic indigo: higher risk â†’ more saturated/darker shade
const getIndigoBarColor = (risk: number) => {
  if (risk >= 80) return 'bg-indigo-700 dark:bg-indigo-500';
  if (risk >= 55) return 'bg-indigo-500 dark:bg-indigo-400';
  if (risk >= 35) return 'bg-indigo-400 dark:bg-indigo-300';
  return 'bg-indigo-300/80 dark:bg-indigo-200/60';
};

const PRRiskBars = () => (
  <div className="w-full h-full flex flex-col justify-center gap-[7px] py-1">
    {prData.map((d, i) => (
      <div key={i} className="flex items-center gap-2">
        <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 w-10 shrink-0 tabular-nums font-mono">{d.label}</span>
        <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-sm overflow-hidden">
          <motion.div
            className={`h-full rounded-sm ${getIndigoBarColor(d.risk)}`}
            initial={{ width: 0 }}
            animate={{ width: `${d.risk}%` }}
            transition={{ delay: i * 0.08, duration: 0.55, ease: "easeOut" }}
          />
        </div>
        <span className="text-[9px] font-semibold w-6 text-right tabular-nums text-zinc-500 dark:text-zinc-400 font-mono">{d.risk}%</span>
      </div>
    ))}
  </div>
);

// â”€â”€â”€ GitHub-style Mini Bar Chart (replaces wavy line for "QA Pipeline") â”€â”€â”€â”€â”€
const qaData = [94, 97, 95, 100, 98, 92, 96, 100, 99, 95, 98, 100, 97, 100, 96, 98, 97, 100, 95, 99, 100, 96, 97, 98, 100, 99, 97, 100];

const QABarChart = () => {
  const max = Math.max(...qaData);
  const min = 90;
  return (
    <div className="w-full h-full flex flex-col justify-end gap-0.5">
      <div className="flex items-end gap-px flex-1">
        {qaData.map((v, i) => {
          const heightPct = Math.max(10, ((v - min) / (max - min)) * 100);
          const isLast = i === qaData.length - 1;
          const color = v === 100 ? '#10b981' : v >= 97 ? '#34d399' : v >= 95 ? '#fbbf24' : '#f87171';
          return (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className="w-full rounded-t-[1px]"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: color,
                  opacity: isLast ? 1 : 0.55 + (i / qaData.length) * 0.45,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-zinc-400 dark:text-zinc-600 font-medium pt-1">
        <span>28d ago</span><span>14d ago</span><span>today</span>
      </div>
    </div>
  );
};

// â”€â”€â”€ AWS Resource Key-Value List (replaces donut chart for "Infrastructure") â”€
const awsResources = [
  { name: 'Lambda', count: 42, ok: true },
  { name: 'DynamoDB', count: 3, ok: true },
  { name: 'S3', count: 12, ok: true },
  { name: 'ECS', count: 8, ok: true },
  { name: 'CloudFront', count: 4, ok: true },
  { name: 'RDS', count: 2, ok: false },
];

const AWSResourceList = () => (
  <div className="w-full h-full flex flex-col justify-center gap-[5px]">
    {awsResources.map((r, i) => (
      <div key={i} className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: r.ok ? '#10b981' : '#f59e0b' }}
          />
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{r.name}</span>
        </div>
        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{r.count}</span>
      </div>
    ))}
  </div>
);

// â”€â”€â”€ Canonical card class helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const cardCls = [
  "bg-white dark:bg-zinc-900",
  "border border-[rgba(16,24,40,0.06)] dark:border-zinc-800",
  "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)]",
  "ring-1 ring-inset ring-black/5 dark:ring-white/10",
].join(" ");

export function RepositoryPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState<RepoDetail>(FALLBACK_REPO);
  const [repoActivity, setRepoActivity] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const themeClass = isDarkMode ? 'dark' : '';

  // Fetch repo details and activity from the backend
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch repo detail
        const repoRes = await fetch(`${BACKEND_URL}/api/repos/${id}`, { credentials: 'include' });
        if (repoRes.status === 401) { navigate('/auth'); return; }
        if (!repoRes.ok) throw new Error(`Failed to load repository (${repoRes.status})`);
        const repoData: RepoDetail = await repoRes.json();
        if (!cancelled) setRepo(repoData);

        // Fetch activity for this repo
        try {
          const actRes = await fetch(`${BACKEND_URL}/api/activity?repo_id=${encodeURIComponent(id)}&limit=10`, { credentials: 'include' });
          if (actRes.ok) {
            const actData = await actRes.json();
            if (!cancelled) setRepoActivity(actData.events ?? []);
          }
        } catch (_) { /* activity is non-fatal */ }
      } catch (err: any) {
        console.error('Error loading repo:', err);
        if (!cancelled) setError(err.message ?? 'Failed to load repository');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (isLoading || !repo) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f6f7fb] dark:bg-[#0A0A0E] gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        <span className="text-sm text-zinc-400">Loading repositoryâ€¦</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f6f7fb] dark:bg-[#0A0A0E] gap-3">
        <AlertCircle className="w-7 h-7 text-rose-500" />
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{error}</span>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const criticalPct = Math.round((repo.risks.critical / (repo.risks.critical + repo.risks.medium + repo.risks.low)) * 100) || 0;
  const mediumPct = Math.round((repo.risks.medium / (repo.risks.critical + repo.risks.medium + repo.risks.low)) * 100) || 0;
  const totalRisks = repo.risks.critical + repo.risks.medium + repo.risks.low;

  const triAgentCards = [
    {
      title: "Launch Visual Cortex",
      description: "Spin up a full preview environment with live trace data attached.",
      icon: Eye,
      accentColor: "#10b981",
      action: () => navigate(`/repo/${id}/cortex`),
      cta: "Visual Cortex",
      preview: <MiniTerminal />,
    },
    {
      title: "Enter Workspace",
      description: "Review current open risk items directly inside the code flow.",
      icon: FileText,
      accentColor: "#6366f1",
      action: () => navigate(`/repo/${id}/workspace`),
      cta: "Workspace",
      preview: <PRRiskBars />,
    },
    {
      title: "QA Pipeline Data",
      description: "View current build history, test suites, and performance metrics.",
      icon: TestTube2,
      accentColor: "#3b82f6",
      action: () => navigate(`/repo/${id}/pipeline`),
      cta: "QA Pipeline",
      preview: <QABarChart />,
    },
    {
      title: "Infrastructure View",
      description: "AWS status, resource load, and live cost tracking tools.",
      icon: Cloud,
      accentColor: "#f59e0b",
      action: () => navigate(`/repo/${id}/infrastructure`),
      cta: "Infrastructure",
      preview: <AWSResourceList />,
    }
  ];

  const agentIconMap: Record<string, React.ElementType> = { sentinel: Shield, fortress: TestTube2, cortex: Cloud };
  const agentColorMap: Record<string, string> = { sentinel: '#6366f1', fortress: '#3b82f6', cortex: '#10b981' };
  const activityItems = repoActivity.map(e => ({
    agent: e.agent.toUpperCase(),
    icon: agentIconMap[e.agent] ?? Bot,
    time: e.timestamp_ago,
    text: e.message,
    color: agentColorMap[e.agent] ?? '#94a3b8',
  }));

  // Shared CTA button style (secondary, no neon)
  const ctaBtnCls = "px-3 py-1.5 text-sm font-semibold rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-200 flex items-center gap-2 w-fit transition-all duration-150";

  return (
    <div className={`${themeClass} w-full min-h-screen`}>
      <style>{`
        @keyframes custom-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes ping-slow { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.4); opacity: 0; } }
      `}</style>

      <div className="min-h-screen flex flex-col font-['Geist_Sans',_'Inter',_sans-serif] bg-[#f6f7fb] dark:bg-[#0A0A0E] text-zinc-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">

        {/* NAVBAR */}
        <div className="flex-none z-50 border-b border-zinc-200 dark:border-slate-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl transition-colors duration-300 sticky top-0 px-6 h-[60px] flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 dark:bg-slate-800 shadow-sm border border-zinc-700 dark:border-slate-700 text-white font-bold text-sm">V</div>
            <div className="flex items-center gap-2 text-sm ml-2">
              <span
                className="text-zinc-500 dark:text-slate-400 cursor-pointer hover:text-zinc-800 dark:hover:text-slate-200 transition-colors"
                onClick={() => navigate('/dashboard')}
              >Dashboard</span>
              <span className="text-zinc-300 dark:text-slate-700">/</span>
              <span className="font-semibold text-zinc-900 dark:text-slate-100">{repo.name}</span>

            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 ml-auto">
            <button className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center relative cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
              <Bell size={16} className="text-zinc-400 dark:text-slate-500" />
              <div className="absolute -top-1 -right-1 w-[8px] h-[8px] bg-red-500 rounded-full border-2 border-white dark:border-zinc-950" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
              <div className="w-[7px] h-[7px] rounded-full bg-emerald-500 animate-[custom-pulse_2s_infinite]" />
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">GitHub Sync</div>
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 ml-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-slate-400"
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="relative ml-1">
              <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full" />
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 relative shadow-sm cursor-pointer hover:scale-105 transition-transform text-indigo-600 dark:text-indigo-400 font-bold text-sm">R</div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT â€” two-column layout */}
        <div className="w-full flex-1 flex flex-col min-h-0">
          <div className="relative z-10 w-full flex-1">

            {/* Full-width page header */}
            <div className="px-6 md:px-10 pt-8 pb-0">
              <div className="flex items-start justify-between mb-3">
                <h1 className="text-4xl md:text-5xl font-['JetBrains_Mono',_monospace] font-bold text-zinc-900 dark:text-white tracking-tight">{repo.name}</h1>
                <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30 flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[custom-pulse_2s_infinite]" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{repo.status_label}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-8 text-xs font-medium text-zinc-500 dark:text-slate-400 flex-wrap">
                {[repo.visibility, repo.language, repo.size_loc].map((txt, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-zinc-300 dark:text-slate-600 text-[10px]">â€¢</span>}
                    <div className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-slate-300">{txt}</div>
                  </React.Fragment>
                ))}
                <span className="text-zinc-300 dark:text-slate-600 text-[10px]">â€¢</span>
                <span className="text-zinc-400 dark:text-slate-500 text-xs">Scanned {repo.last_scanned_ago}</span>
              </div>
            </div>

            {/* Two-column body */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] items-start px-6 md:px-10 pb-10 gap-6">

              {/* â”€â”€ LEFT COLUMN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="flex flex-col gap-6 min-w-0">

                {/* KPI STRIP */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { val: repo.metrics.risk_score, lbl: 'PR RISK SCORE', txt: 'text-amber-600 dark:text-amber-400', icn: TrendingUp },
                    { val: `${repo.metrics.test_stability_pct}%`, lbl: 'TEST STABILITY', txt: 'text-emerald-600 dark:text-emerald-400', icn: TestTube2 },
                    { val: repo.metrics.architecture_drift, lbl: 'ARCH DRIFT', txt: 'text-blue-600 dark:text-blue-400', icn: Activity },
                    { val: repo.metrics.last_action_ago, lbl: 'LAST AUTO ACTION', txt: 'text-violet-600 dark:text-violet-400', icn: CheckCircle },
                  ].map((kpi, i) => (
                    <div
                      key={i}
                      className={`group relative ${cardCls} rounded-2xl p-5 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
                    >
                      <kpi.icn className={`w-5 h-5 mb-3 ${kpi.txt}`} />
                      <div>
                        <div className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-1 truncate">{kpi.val}</div>
                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{kpi.lbl}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AGENT COMMAND CENTER */}
                <div>
                  <h2 className="text-xs font-semibold tracking-widest text-gray-500 dark:text-zinc-500 uppercase mb-4">
                    Agent Command Center
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {triAgentCards.map((card, idx) => (
                      <div
                        key={idx}
                        onClick={card.action}
                        className={`group cursor-pointer ${cardCls} rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg grid grid-cols-1 sm:grid-cols-2`}
                      >
                        <div className="p-6 flex flex-col">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                            style={{ backgroundColor: `${card.accentColor}15`, border: `1px solid ${card.accentColor}30` }}
                          >
                            <card.icon className="w-[18px] h-[18px]" style={{ color: card.accentColor }} />
                          </div>
                          <div className="text-lg font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">{card.title}</div>
                          <div className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 mb-6 flex-1">{card.description}</div>
                          <button className={ctaBtnCls} onClick={(e) => { e.stopPropagation(); card.action(); }}>
                            {card.cta} <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 border-t sm:border-t-0 sm:border-l border-[rgba(16,24,40,0.06)] dark:border-zinc-800 p-4 flex flex-col relative min-h-[180px]">
                          {card.preview}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* REPOSITORY ACTIVITY / RISK OVERVIEW */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
                  <div className={`${cardCls} rounded-2xl p-6 flex flex-col`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-[15px] font-bold text-zinc-900 dark:text-white tracking-tight">Repository Activity</div>
                      <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">All Time</div>
                    </div>
                    <div className="flex-1 flex flex-col">
                      {(repo.commit_by_month?.length ?? 0) > 0 ? (() => {
                        const months = repo.commit_by_month!;
                        // Flatten all days into a single array for the continuous line chart
                        const allDays = months.flatMap(m => m.days);
                        const maxVal = Math.max(...allDays, 1);
                        const W = 100, H = 60;
                        const pts = allDays.map((v, i) => {
                          const x = (i / (allDays.length - 1)) * W;
                          const y = H - (v / maxVal) * (H - 6);
                          return `${x.toFixed(2)},${y.toFixed(2)}`;
                        });
                        const lineColor = repo.status === 'critical' ? '#ef4444' : repo.status === 'warning' ? '#f59e0b' : '#60A5FA';
                        const fillId = `fill-${repo.id}`;
                        // Month boundary positions (x%)
                        const monthBounds: { label: string; x: number; count: number }[] = [];
                        let dayIdx = 0;
                        for (const m of months) {
                          const x = (dayIdx / allDays.length) * 100;
                          monthBounds.push({ label: m.month, x, count: m.count });
                          dayIdx += m.days.length;
                        }
                        return (
                          <>
                            {/* SVG line chart */}
                            <div className="relative w-full" style={{ paddingTop: '28%' }}>
                              <svg
                                viewBox={`0 0 ${W} ${H}`}
                                preserveAspectRatio="none"
                                className="absolute inset-0 w-full h-full overflow-visible"
                              >
                                <defs>
                                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
                                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                                  </linearGradient>
                                  {/* Month boundary lines */}
                                  {monthBounds.slice(1).map((mb) => (
                                    <line
                                      key={mb.label + '-div'}
                                      x1={mb.x} y1="0"
                                      x2={mb.x} y2={H}
                                      stroke="currentColor"
                                      strokeWidth="0.4"
                                      strokeDasharray="2 2"
                                      className="text-zinc-200 dark:text-zinc-700"
                                    />
                                  ))}
                                </defs>
                                {/* Fill under line */}
                                <polyline
                                  points={`0,${H} ${pts.join(' ')} ${W},${H}`}
                                  fill={`url(#${fillId})`}
                                  stroke="none"
                                />
                                {/* Line */}
                                <polyline
                                  points={pts.join(' ')}
                                  fill="none"
                                  stroke={lineColor}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {/* Dots only on days with commits */}
                                {allDays.map((v, i) => {
                                  if (v === 0) return null;
                                  const x = (i / (allDays.length - 1)) * W;
                                  const y = H - (v / maxVal) * (H - 6);
                                  return (
                                    <circle key={i} cx={x} cy={y} r="1.5"
                                      fill={lineColor} stroke="white" strokeWidth="0.5" />
                                  );
                                })}
                              </svg>
                            </div>

                            {/* Month labels + commit counts below */}
                            <div className="flex gap-0.5 w-full mt-3">
                              {months.map((m, mi) => (
                                <div
                                  key={m.month}
                                  className="flex-1 flex flex-col items-center gap-0.5 group relative cursor-default"
                                  style={{ flexBasis: `${(m.days.length / allDays.length) * 100}%` }}
                                >
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-800 dark:bg-zinc-700 text-white text-[9px] font-semibold px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                                    {m.count} commit{m.count !== 1 ? 's' : ''}
                                  </div>
                                  {/* Mini bar showing relative count */}
                                  <div className="w-full h-[18px] flex items-end">
                                    <div
                                      className="w-full rounded-t-sm"
                                      style={{
                                        height: `${Math.max(15, (m.count / Math.max(...months.map(x => x.count), 1)) * 100)}%`,
                                        backgroundColor: lineColor,
                                        opacity: 0.25 + (mi / months.length) * 0.55,
                                      }}
                                    />
                                  </div>
                                  {/* Month name */}
                                  <div className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 truncate w-full text-center">
                                    {m.month.split(' ')[0]}
                                  </div>
                                  {/* Year â€” only when it changes */}
                                  <div className="text-[7px] font-medium text-zinc-300 dark:text-zinc-600 h-[9px]">
                                    {mi === 0 || m.month.split(' ')[1] !== months[mi - 1].month.split(' ')[1]
                                      ? m.month.split(' ')[1] : ''}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                              <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">commit history</div>
                              {repo.commit_trend_label && (
                                <div className={`text-xs font-bold ${repo.commit_trend_direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                                  repo.commit_trend_direction === 'down' ? 'text-rose-600 dark:text-rose-400' :
                                    'text-amber-600 dark:text-amber-400'
                                  }`}>{repo.commit_trend_label}</div>
                              )}
                            </div>
                          </>
                        );
                      })() : (
                        <div className="flex flex-col items-center justify-center h-[200px] text-sm text-zinc-400 dark:text-zinc-500">
                          <div className="text-2xl mb-2">ðŸ“Š</div>
                          <div>No commit history available yet</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`${cardCls} rounded-2xl p-6`}>
                    <div className="text-[15px] font-bold text-zinc-900 dark:text-white tracking-tight mb-5">Risk Overview</div>
                    <div className="flex items-center gap-6 py-2">
                      <div
                        className="relative w-24 h-24 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `conic-gradient(#EF4444 0% ${criticalPct}%, #EAB308 ${criticalPct}% ${criticalPct + mediumPct}%, rgba(156,163,175,0.2) ${criticalPct + mediumPct}% 100%)` }}
                      >
                        <div className="absolute inset-2 bg-white dark:bg-zinc-900 rounded-full flex flex-col items-center justify-center shadow-sm">
                          <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none"><AnimatedCounter value={totalRisks} /></div>
                          <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5">TOTAL</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3.5 flex-1">
                        {[
                          { label: 'Critical', dot: 'bg-red-500', val: repo.risks.critical },
                          { label: 'Medium', dot: 'bg-yellow-500', val: repo.risks.medium },
                          { label: 'Low', dot: 'bg-zinc-300 dark:bg-zinc-600', val: repo.risks.low },
                        ].map((r, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${r.dot}`} />
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">{r.label}</div>
                            </div>
                            <div className="text-[22px] font-black text-zinc-900 dark:text-white leading-none"><AnimatedCounter value={r.val} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            {/* â”€â”€ END LEFT COLUMN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

            {/* â”€â”€ RIGHT SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex flex-col gap-5 xl:sticky xl:top-[72px] self-start">

              {/* RECENT AUTONOMOUS ACTIVITY */}
              <div className={`${cardCls} rounded-2xl overflow-hidden`}>
                <div className="px-5 py-4 border-b border-[rgba(16,24,40,0.06)] dark:border-zinc-800 text-[15px] font-bold text-zinc-900 dark:text-white tracking-tight">
                  Recent Activity
                </div>
                {activityItems.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[13px] text-zinc-400 dark:text-zinc-500">No activity yet</div>
                ) : activityItems.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${i === activityItems.length - 1 ? '' : 'border-b border-[rgba(16,24,40,0.04)] dark:border-zinc-800/60'}`}
                  >
                    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5" style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                      <item.icon className="w-3 h-3" style={{ color: item.color }} />
                    </div>
                    <div className="flex flex-col flex-1 gap-0.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{item.agent}</span>
                        <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 shrink-0">{item.time}</span>
                      </div>
                      <div className="text-[12px] leading-snug text-zinc-600 dark:text-slate-300 font-medium">{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TOOL CARDS */}
              <div className={`${cardCls} rounded-2xl overflow-hidden`}>
                <div className="px-5 py-4 border-b border-[rgba(16,24,40,0.06)] dark:border-zinc-800 text-[10px] font-semibold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
                  Settings
                </div>
                {[
                  { icon: Settings, label: 'Repository Settings', sub: 'Manage integrations & tokens' },
                  { icon: Webhook, label: 'Webhook Status', sub: '3 active endpoints' },
                  { icon: Sliders, label: 'Agent Configuration', sub: 'Rules & thresholds' },
                ].map((tool, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 group ${i < 2 ? 'border-b border-[rgba(16,24,40,0.04)] dark:border-zinc-800/60' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex shrink-0 items-center justify-center transition-colors group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700">
                      <tool.icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">{tool.label}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{tool.sub}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                ))}
              </div>

            </div>
            {/* â”€â”€ END RIGHT SIDEBAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

          </div>

          {/* FOOTER â€” full width */}
          <div className="px-6 md:px-10 py-5 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-zinc-400 dark:text-zinc-500">Â© 2026 Velocis Technologies</div>
            <div className="flex gap-5">
              {['Docs', 'Security', 'System Status'].map(link => (
                <span key={link} className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer transition-colors hover:text-zinc-800 dark:hover:text-white">{link}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

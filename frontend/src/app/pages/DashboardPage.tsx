import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Home, Star, Sun, Moon } from 'lucide-react';

const RepoSparkline = ({
  data,
  color,
}: {
  data: number[];
  color: string;
}) => {
  const W = 400, H = 56;
  const P = { t: 8, b: 6, l: 4, r: 4 };
  const cW = W - P.l - P.r;
  const cH = H - P.t - P.b;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: P.l + (i / (data.length - 1)) * cW,
    y: P.t + cH - ((v - min) / range) * cH,
  }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx1 = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 3;
    const cx2 = pts[i].x - (pts[i].x - pts[i - 1].x) / 3;
    d += ` C ${cx1} ${pts[i - 1].y} ${cx2} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const area = d + ` L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  const gId = `sg${Math.round(Math.random() * 99999)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="70%" stopColor={color} stopOpacity="0.05" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5">
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

export function DashboardPage() {
  const [activityTab, setActivityTab] = useState("all");
  const [isDarkMode, setIsDarkMode] = useState(false); // Default matching workspace typically, or set to true for existing feel
  const navigate = useNavigate();

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

      <div className="min-h-screen flex flex-col font-['Geist_Sans',_'Inter',_sans-serif] bg-zinc-50 dark:bg-[#010308] text-zinc-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">

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
            <div className="mb-10">
              <div className="text-[13px] font-['JetBrains_Mono',_monospace] text-sm font-semibold tracking-widest uppercase text-zinc-800 dark:text-slate-200 mb-3">
                {getGreeting()}, RISHI
              </div>
              <div>
              </div>

              <div className="flex items-center gap-4 flex-wrap mt-4 text-[15px] text-zinc-500 dark:text-slate-400 font-medium">
                <div>{currentDate}</div>
                <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-slate-600" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[custom-pulse_2s_infinite]" />
                  <div className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">3 agents running</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <div className="text-[13px] font-semibold text-amber-600 dark:text-amber-500">1 warning active</div>
                </div>
              </div>

              {/* Status Pills */}
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  { label: 'Healthy Repos', value: '4', fg: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/60 dark:border-emerald-800/50', dot: 'bg-emerald-500', divider: 'bg-emerald-200 dark:bg-emerald-800/50', anim: 'animate-[custom-pulse_2.5s_infinite]' },
                  { label: 'Warnings', value: '1', fg: 'text-amber-700 dark:text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/60 dark:border-amber-800/50', dot: 'bg-amber-500', divider: 'bg-amber-200 dark:bg-amber-800/50', anim: '' },
                  { label: 'Critical', value: '1', fg: 'text-rose-700 dark:text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200/60 dark:border-rose-800/50', dot: 'bg-rose-500', divider: 'bg-rose-200 dark:bg-rose-800/50', anim: '' },
                  { label: 'Open Risks', value: '3', fg: 'text-zinc-700 dark:text-slate-300', bg: 'bg-white dark:bg-slate-800/50', border: 'border-zinc-200 dark:border-slate-700', dot: 'bg-zinc-400 dark:bg-slate-500', divider: 'bg-zinc-200 dark:bg-slate-700', anim: '' }
                ].map((pill, i) => (
                  <div key={i} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-sm ${pill.bg} ${pill.border} backdrop-blur-md`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pill.dot} ${pill.anim}`} />
                    <div className={`w-px h-4 shrink-0 ${pill.divider}`} />
                    <div className="flex flex-col">
                      <div className={`text-xl font-bold leading-none ${pill.fg}`}>{pill.value}</div>
                      <div className="text-xs font-semibold text-zinc-500 dark:text-slate-400 mt-1 leading-none">{pill.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REPOSITORIES HEADER */}
            <div className="flex items-center gap-4">
              <div className="text-xl font-[700] tracking-tight text-zinc-900 dark:text-white font-['JetBrains_Mono',_monospace]">Repositories</div>
              <div className="flex gap-4 ml-auto font-medium text-[13px] text-zinc-500 dark:text-slate-400">
                <div className="hidden sm:flex items-center gap-1.5"><div className="w-[7px] h-[7px] rounded-full bg-emerald-500" />Healthy 4</div>
                <div className="hidden sm:flex items-center gap-1.5"><div className="w-[7px] h-[7px] rounded-full bg-amber-500" />Warning 1</div>
                <div className="hidden sm:flex items-center gap-1.5"><div className="w-[7px] h-[7px] rounded-full bg-rose-500" />Critical 1</div>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-zinc-200 dark:from-slate-800/80 to-transparent mt-3 mb-6" />

            {/* REPO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* infrazero */}
              <div
                className="group bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 backdrop-blur-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                onClick={() => navigate('/repo/infrazero')}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-transparent opacity-80" />
                <div className="flex justify-between items-center bg-transparent relative z-10">
                  <div className="text-lg font-bold tracking-tight text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">infrazero</div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-800/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />CRITICAL
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">Sentinel →</div>
                    <div className="text-[13px] font-medium text-rose-600 dark:text-rose-400 flex-1 truncate">race condition flagged in writer.go</div>
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">12m</div>
                  </div>
                  <div className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">Fortress →</div>
                    <div className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 flex-1 truncate">247/247 tests passing</div>
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">1h</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-slate-800/50">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-slate-500 mb-2 tracking-wider">commit activity · 7d</div>
                  <div className="relative rounded-md overflow-hidden h-14">
                    <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-white dark:from-slate-900/60 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-white dark:from-slate-900/60 to-transparent z-10 pointer-events-none" />
                    <RepoSparkline data={[8, 6, 9, 7, 10, 8, 12, 9, 7, 6, 8, 5, 4, 3]} color="#ef4444" />
                  </div>
                  <div className="flex justify-end mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-500">↓ 38%</div>
                </div>
              </div>

              {/* immersa */}
              <div
                className="group bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 backdrop-blur-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                onClick={() => navigate('/repo/immersa')}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-transparent opacity-80" />
                <div className="flex justify-between items-center bg-transparent relative z-10">
                  <div className="text-lg font-bold tracking-tight text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">immersa</div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-800/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />WARNING
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">Sentinel →</div>
                    <div className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 flex-1 truncate">PR #214 clean, merged</div>
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">2h</div>
                  </div>
                  <div className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">Fortress →</div>
                    <div className="text-[13px] font-medium text-amber-600 dark:text-amber-500 flex-1 truncate">8 flaky tests quarantined</div>
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">29m</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-slate-800/50">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-slate-500 mb-2 tracking-wider">commit activity · 7d</div>
                  <div className="relative rounded-md overflow-hidden h-14">
                    <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-white dark:from-slate-900/60 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-white dark:from-slate-900/60 to-transparent z-10 pointer-events-none" />
                    <RepoSparkline data={[5, 6, 8, 7, 9, 11, 9, 10, 8, 9, 10, 9, 8, 10]} color="#f59e0b" />
                  </div>
                  <div className="flex justify-end mt-1.5 text-xs font-bold text-amber-600 dark:text-amber-500">~ volatile</div>
                </div>
              </div>

              {/* nexlayer */}
              <div
                className="group bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 backdrop-blur-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                onClick={() => navigate('/repo/nexlayer')}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent opacity-80" />
                <div className="flex justify-between items-center bg-transparent relative z-10">
                  <div className="text-lg font-bold tracking-tight text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">nexlayer</div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-800/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />HEALTHY
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">Sentinel →</div>
                    <div className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 flex-1 truncate">0 issues in last scan</div>
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">4h</div>
                  </div>
                  <div className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">Fortress →</div>
                    <div className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 flex-1 truncate">suite stable, 312 passing</div>
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">3h</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-slate-800/50">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-slate-500 mb-2 tracking-wider">commit activity · 7d</div>
                  <div className="relative rounded-md overflow-hidden h-14">
                    <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-white dark:from-slate-900/60 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-white dark:from-slate-900/60 to-transparent z-10 pointer-events-none" />
                    <RepoSparkline data={[2, 3, 2.5, 3, 4, 3.5, 4, 5, 4.5, 5, 6, 5.5, 6, 7]} color="#10b981" />
                  </div>
                  <div className="flex justify-end mt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-500">↑ 24%</div>
                </div>
              </div>

              {/* databridge */}
              <div
                className="group bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 backdrop-blur-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                onClick={() => navigate('/repo/databridge')}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent opacity-80" />
                <div className="flex justify-between items-center bg-transparent relative z-10">
                  <div className="text-lg font-bold tracking-tight text-zinc-900 dark:text-slate-100 font-['JetBrains_Mono',_monospace]">databridge</div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-800/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />HEALTHY
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Cortex →</div>
                    <div className="text-[13px] font-medium text-amber-600 dark:text-amber-500 flex-1 truncate">1 stale endpoint detected</div>
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">3h</div>
                  </div>
                  <div className="flex items-center p-2 -mx-2 rounded-lg gap-2 hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">Sentinel →</div>
                    <div className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 flex-1 truncate">no new findings</div>
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500 shrink-0">5h</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-slate-800/50">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-slate-500 mb-2 tracking-wider">commit activity · 7d</div>
                  <div className="relative rounded-md overflow-hidden h-14">
                    <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-white dark:from-slate-900/60 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-white dark:from-slate-900/60 to-transparent z-10 pointer-events-none" />
                    <RepoSparkline data={[3, 3.5, 3, 4, 3.5, 4, 4.5, 4, 5, 4.5, 5, 5.5, 5, 6]} color="#10b981" />
                  </div>
                  <div className="flex justify-end mt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-500">↑ 12%</div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN - Activity & System Panels */}
          <div className="hidden xl:flex flex-col gap-5 border-l border-zinc-200 dark:border-slate-800/80 bg-zinc-50/50 dark:bg-slate-900/40 backdrop-blur-xl p-5 z-20 w-[340px] shrink-0 pb-20">

            <div className="flex-1 flex flex-col gap-5">
              {/* ACTIVITY PANEL */}
              <div className="flex flex-col bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden shrink-0">
                <div className="p-4 pb-0 shrink-0">
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-[700] text-[15px] text-zinc-900 dark:text-white font-['JetBrains_Mono',_monospace]">Activity</div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-slate-400">5 new</span>
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
                  {[
                    { Agent: "SENTINEL", agentFg: 'text-indigo-600 dark:text-indigo-400', time: '12m ago', Text: "Flagged potential race condition · ", Repo: "InfraZero" },
                    { Agent: "FORTRESS", agentFg: 'text-sky-600 dark:text-sky-400', time: '29m ago', Text: "3 flaky tests auto-quarantined · ", Repo: "Immersa" },
                    { Agent: "CORTEX", agentFg: 'text-emerald-600 dark:text-emerald-400', time: '58s ago', Text: "Service map updated — 2 new nodes · ", Repo: "InfraZero" },
                    { Agent: "SENTINEL", agentFg: 'text-indigo-600 dark:text-indigo-400', time: '1h ago', Text: "PR #214 reviewed, 1 critical finding · ", Repo: "Nexlayer" },
                    { Agent: "FORTRESS", agentFg: 'text-sky-600 dark:text-sky-400', time: '2h ago', Text: "Full suite passed after hotfix · ", Repo: "Immersa" },
                  ].map((it, i) => (
                    <div key={i} className="p-3.5 border-b border-zinc-100 dark:border-slate-800/50 hover:bg-zinc-50 dark:hover:bg-slate-800/30 transition-colors cursor-default">
                      <div className="flex justify-between items-center mb-1">
                        <div className={`text-[10px] font-bold uppercase tracking-widest ${it.agentFg}`}>{it.Agent}</div>
                        <div className="text-[10px] font-medium text-zinc-400 dark:text-slate-500">{it.time}</div>
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-zinc-600 dark:text-slate-400">{it.Text}</span>
                        <span className="text-[13px] font-bold text-zinc-900 dark:text-slate-100">{it.Repo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SYSTEM PANEL */}
              <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 shrink-0">
                <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-slate-500 mb-4 font-['JetBrains_Mono',_monospace]">System</div>
                <div className="space-y-3">
                  {[
                    { label: 'API latency', val: '38ms', color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500' },
                    { label: 'Queue depth', val: '12', color: 'text-zinc-900 dark:text-white', border: 'border-zinc-300 dark:border-slate-600' },
                    { label: 'Agent uptime', val: '99.7%', color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500' },
                    { label: 'Storage', val: '61%', color: 'text-amber-600 dark:text-amber-500', border: 'border-amber-500' }
                  ].map((r, i) => (
                    <div key={i} className={`flex justify-between items-center pb-2 ${i !== 3 ? 'border-b border-zinc-100 dark:border-slate-800/60' : ''}`}>
                      <div className={`pl-2.5 border-l-2 ${r.border} text-[13px] font-medium text-zinc-500 dark:text-slate-400 transition-colors`}>{r.label}</div>
                      <div className={`text-[13px] font-bold ${r.color}`}>{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECENT DEPLOYMENTS PANEL */}
              <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 shrink-0">
                <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-slate-500 mb-4 font-['JetBrains_Mono',_monospace]">Recent Deployments</div>
                <div className="space-y-0.5">
                  {[
                    { dot: 'bg-rose-500', name: 'infrazero', desc: 'prod 14m ago', bTop: false },
                    { dot: 'bg-emerald-500', name: 'nexlayer', desc: 'prod 2h ago', bTop: true },
                    { dot: 'bg-emerald-500', name: 'immersa', desc: 'staging 3h ago', bTop: true }
                  ].map((d, i) => (
                    <div key={i} className={`flex justify-between items-center py-2.5 ${d.bTop ? 'border-t border-zinc-100 dark:border-slate-800/60' : ''}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${d.dot}`} />
                        <span className="text-[13px] font-bold text-zinc-900 dark:text-slate-100">{d.name}</span>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400 dark:text-slate-500">{d.desc}</span>
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

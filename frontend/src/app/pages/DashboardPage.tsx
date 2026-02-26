"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Search, Shield, TestTube2, Eye, GitBranch, ChevronRight,
  TrendingUp, Settings, Activity, Hexagon, LogOut, ChevronDown, ExternalLink, CheckCircle2, Clock,
  Filter, ArrowUpDown, LayoutGrid, List, RefreshCw, Copy, Check, Sun, Moon, Play, Terminal, Zap, X
} from 'lucide-react';
import { useNavigate } from 'react-router';

// --- STYLES FOR VERCEL/LINEAR DEVTOOLS PATTERN ---
const globalDevtoolsStyles = /* css */ `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&display=swap');
  
  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: 'cv02','cv03','cv04','cv11','ss01';
    text-rendering: optimizeLegibility;
  }
  
  :root {
    --bg-base: #F4F3F7;
    --bg-sidebar: #FFFFFF;
    --surface-1: #FFFFFF;
    --surface-2: #FAFAF9;
    --border-1: #E4E2EC;
    --border-2: #EEECF4;
    --border-focus: rgba(174,97,255,0.55);
    
    --accent-violet: #7B2FE0;
    --accent-lime: #6B8A00;
    --accent-teal: #0D9488;
    --accent-amber: #B45309;
    --accent-red: #DC2626;
    --accent-green: #15803D;
    --accent-blue: #2563EB;

    --text-high: #1A1523;
    --text-mid: #4A4560;
    --text-low: #7B7890;
    --text-xlow: #A8A4B8;
  }

  .dark {
    --bg-base: #09090B;
    --bg-sidebar: #0E0C18;
    --surface-1: #0A0910;
    --surface-2: #141120;
    --border-1: rgba(255,255,255,0.06);
    --border-2: rgba(255,255,255,0.03);
    
    --text-high: #EDEDED;
    --text-mid: #A19DAB;
    --text-low: #6F6C7D;
    --text-xlow: #4A4754;
  }

  body {
    background-color: var(--bg-base);
    color: var(--text-high);
    font-optical-sizing: auto;
    overflow-x: hidden;
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  }

  *, ::before, ::after {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  }

  /* Linear-style tabular numbers for ALL metrics */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum', 'cv02','cv03','cv04','cv11','ss01';
  }

  .font-mono-code {
    font-family: 'Inter', ui-monospace, SFMono-Regular, monospace;
    font-variant: all-small-caps;
    letter-spacing: 0.06em;
  }

  /* Layer 1: Restrained Vignette for Light Mode */
  .vignette-bg {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: radial-gradient(
      ellipse 80% 60% at 50% 50%,
      rgba(255,255,255,0.6) 0%,
      transparent 70%
    );
  }

  /* Layer 2: Warm Atmosphere Radial */
  .hero-radial {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: 
      radial-gradient(
        ellipse 55% 40% at 72% 10%,
        rgba(174,97,255,0.055) 0%,
        transparent 55%
      ),
      radial-gradient(
        ellipse 35% 30% at 15% 80%,
        rgba(45,212,191,0.04) 0%,
        transparent 50%
      );
  }

  /* Layer 3: Film Grain */
  .noise-bg {
    position: fixed; inset: 0; pointer-events: none; z-index: 1; opacity: 0.018;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px;
  }

  /* Linear active nav style */
  .nav-active {
    background: rgba(123,47,224,0.07);
    border-left: 2px solid var(--accent-lime);
    color: var(--text-high);
    font-weight: 600;
  }
  .nav-active svg {
    color: var(--accent-lime) !important;
  }
  .nav-inactive {
    border-left: 2px solid transparent;
    color: var(--text-mid);
    font-weight: 500;
  }

  /* Keyboard shortcut hint */
  .kbd-hint {
    background: #F0EEF7;
    border: 1px solid #E4E2EC;
    font-family: 'Inter', monospace;
    font-variant: all-small-caps;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text-low);
  }
  
  /* Navbar specific kbd */
  header .kbd-hint {
    background: #ECEAF4;
    border-color: #D8D5E8;
    color: #7B7890;
  }

  /* Status Pulses */
  @keyframes healthyPulse {
    0% { box-shadow: 0 0 0 0 rgba(21,128,61,0.4); }
    70% { box-shadow: 0 0 0 5px rgba(21,128,61,0); }
    100% { box-shadow: 0 0 0 0 rgba(21,128,61,0); }
  }
  .pulse-green {
    animation: healthyPulse 2.4s infinite;
  }
  
  @keyframes criticalPulse {
    0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
    70% { box-shadow: 0 0 0 5px rgba(220,38,38,0); }
    100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
  }
  .pulse-red {
    animation: criticalPulse 1.2s infinite;
  }
  
  .ring-amber {
    box-shadow: 0 0 0 2px rgba(245,166,35,0.25);
  }

  /* Shimmer for active scans */
  @keyframes shimmer {
    from { background-position: -200px 0; }
    to { background-position: 200px 0; }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite linear;
    background-size: 200px 100%;
  }

  /* Spin Animation for Refresh */
  @keyframes spin60s {
    0% { transform: rotate(0deg); }
    1% { transform: rotate(360deg); }
    100% { transform: rotate(360deg); }
  }
  .animate-spin-60s {
    animation: spin60s 60s linear infinite;
  }
`;

// --- HELPER COMPONENTS ---
const CountUp = ({ to, isPercentage = false, prefix = '' }: { to: number, isPercentage?: boolean, prefix?: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000; // 1s easeOutExpo
    const startTime = performance.now();

    const updateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);

      setCount(Math.floor(easeProgress * to));

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(to);
      }
    };

    requestAnimationFrame(updateCount);
  }, [to]);

  return <span>{prefix}{count}{isPercentage && '%'}</span>;
};

// Grafana-style single line Sparkline (no area fills)
const LineSparkline = ({ data, color, showGrid = false }: { data: number[], color: string, showGrid?: boolean }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pointsArray = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  });
  const points = pointsArray.join(' ');
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative w-full h-full">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 overflow-visible z-10">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.05} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
        {showGrid && [25, 50, 75].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2" strokeWidth="0.5" />
        ))}
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={showGrid ? "1.5" : "1"}
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
    </div>
  );
};

// Standardized SVG Area Chart for Analytics (Light Mode Vercel/Linear style)
const StandardAreaChart = ({ data, tension = 0.5 }: { data: number[], tension?: number }) => {
  const maxData = Math.max(...data);
  const max = Math.ceil(maxData);
  const min = 0; // Fixed baseline
  const range = max - min || 1;
  const mid = Math.round(max / 2);

  const drawHeight = 58;
  const width = 100; // SVG coordinate percentage
  const topPadding = 8;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = topPadding + drawHeight - ((val - min) / range) * drawHeight;
    return [x, y];
  });

  const p = points;
  let d = `M ${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p1 = p[i];
    const p2 = p[i + 1];
    const cx1 = p1[0] + (p2[0] - p1[0]) * tension;
    const cy1 = p1[1];
    const cx2 = p2[0] - (p2[0] - p1[0]) * tension;
    const cy2 = p2[1];
    d += ` C ${cx1},${cy1} ${cx2},${cy2} ${p2[0]},${p2[1]}`;
  }

  const baselineY = topPadding + drawHeight; // 66
  const areaD = `${d} L ${width},${baselineY} L 0,${baselineY} Z`;

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const lastY = p[p.length - 1][1];
  const dotTopPercent = (lastY / 88) * 100;

  const gradientId = React.useId();

  return (
    <div className="w-full relative flex flex-col">
      <div className="flex w-full h-[88px] relative">

        {/* Y Axis Labels (28px left padding) */}
        <div className="w-[28px] shrink-0 h-full relative">
          <span className="absolute left-0 w-[24px] text-right text-[#C4C0D4] font-mono-code text-[9px] font-[400] leading-none -translate-y-[5px]" style={{ top: `${topPadding}px` }}>{max}</span>
          <span className="absolute left-0 w-[24px] text-right text-[#C4C0D4] font-mono-code text-[9px] font-[400] leading-none -translate-y-[5px]" style={{ top: `${topPadding + drawHeight / 2}px` }}>{mid}</span>
          <span className="absolute left-0 w-[24px] text-right text-[#C4C0D4] font-mono-code text-[9px] font-[400] leading-none -translate-y-[5px]" style={{ top: `${baselineY}px` }}>0</span>
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative pr-[8px]">
          <svg width="100%" height="100%" viewBox="0 0 100 88" preserveAspectRatio="none" className="block overflow-visible absolute inset-0" style={{ maxWidth: '100%' }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(123,47,224,0.09)" />
                <stop offset="100%" stopColor="rgba(123,47,224,0.00)" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            <line x1="0" y1={topPadding} x2="100" y2={topPadding} stroke="rgba(0,0,0,0.055)" strokeWidth="1" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1={topPadding + drawHeight / 2} x2="100" y2={topPadding + drawHeight / 2} stroke="rgba(0,0,0,0.055)" strokeWidth="1" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1={baselineY} x2="100" y2={baselineY} stroke="rgba(0,0,0,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

            {/* Area Fill */}
            <motion.path
              d={areaD}
              fill={`url(#${gradientId})`}
              vectorEffect="non-scaling-stroke"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Main Line */}
            <motion.path
              d={d}
              fill="none"
              stroke="rgba(0,0,0,0.28)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={{ strokeDasharray: "0, 1000", strokeDashoffset: -100 }}
              animate={{ strokeDasharray: "1000, 1000", strokeDashoffset: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>

          {/* End Point Dot */}
          <motion.div
            className="absolute rounded-full flex items-center justify-center bg-[rgba(123,47,224,0.10)] border border-[rgba(123,47,224,0.40)] w-[8px] h-[8px] -translate-x-1/2 -translate-y-[4px]"
            style={{
              left: '100%',
              top: `${dotTopPercent}%`
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-[4px] h-[4px] rounded-full bg-[rgba(123,47,224,0.75)]" />
          </motion.div>

          {/* X Axis Labels */}
          <div className="absolute w-full h-[10px]" style={{ top: `${baselineY + 8}px` }}>
            {days.map((day, i) => (
              <span key={i} className="absolute text-[#C4C0D4] font-mono-code text-[9px] font-[400] leading-none text-center min-w-[30px] -translate-x-1/2" style={{ left: `${(i / 6) * 100}%` }}>
                {day}
              </span>
            ))}
          </div>

        </div>
      </div>

      {/* "Activity (7d)" Label */}
      <h4 className="text-[#C4C0D4] font-[400] text-[10px] ml-[28px] mt-[4px] block font-['Geist'] tracking-[0.01em]">
        Activity (7d)
      </h4>
    </div>
  )
}

// Copy to Clipboard wrapper
const CopyableHash = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div
      className="group/copy relative flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[4px] px-[6px] py-[2px] cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-colors"
      onClick={handleCopy}
    >
      <span className="font-mono-code text-[10px] font-[500] text-[var(--text-xlow)] opacity-100 group-hover/copy:opacity-0 transition-opacity uppercase tracking-[0.06em]">{value}</span>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/copy:opacity-100 transition-opacity">
        {copied ? <Check className="w-[10px] h-[10px] text-[var(--accent-green)]" /> : <Copy className="w-[10px] h-[10px] text-[var(--text-mid)]" />}
      </div>
      {/* Tooltip */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#1A1A28] border border-[rgba(255,255,255,0.1)] text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none"
          >
            Copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- MOCK DATA ---
const quickStats = [
  { title: 'Sentinel reviews', value: 24, subtext: 'vs. yesterday 21', trend: '↑', delta: '12%', deltaColor: '#15803D', icon: Shield },
  { title: 'Tests passing', value: 100, isPercentage: true, subtext: '100% for 48h', trend: '', delta: '0%', deltaColor: '#7B7890', icon: TestTube2 },
  { title: 'Services mapped', value: 142, subtext: '↑ 2 since last hour', trend: '↑', delta: '8.4%', deltaColor: '#15803D', icon: Eye },
  { title: 'Open risks', value: 3, subtext: 'was 5 · improved', trend: '↓', delta: '2%', deltaColor: '#DC2626', icon: TrendingUp }
];

const repositories = [
  {
    name: 'InfraZero', status: '#15803D', id: 'infrazero',
    activity: [2, 3, 2, 4, 3, 5, 4], tension: 0.5,
    agents: [
      { name: 'Sentinel', text: '2 PRs reviewed today' },
      { name: 'Fortress', text: '100% tests passing' },
      { name: 'Visual Cortex', text: 'Architecture up to date' }
    ]
  },
  {
    name: 'Immersa', status: '#15803D', id: 'immersa',
    activity: [3, 4, 3, 5, 4, 4, 5], tension: 0.5,
    agents: [
      { name: 'Sentinel', text: '1 PR reviewed today' },
      { name: 'Fortress', text: '98% tests passing' },
      { name: 'Visual Cortex', text: 'Architecture up to date' }
    ]
  },
  {
    name: 'velocis-core', status: '#B45309', id: 'velocis-core',
    activity: [5, 3, 6, 2, 5, 3, 4], tension: 0.1,
    agents: [
      { name: 'Sentinel', text: '3 PRs reviewed today' },
      { name: 'Fortress', text: '2 flaky tests detected' },
      { name: 'Visual Cortex', text: 'Architecture updated 2h ago' }
    ]
  },
  {
    name: 'ai-observatory', status: '#15803D', id: 'ai-observatory',
    activity: [4, 4, 5, 4, 5, 4, 4], tension: 0.6,
    agents: [
      { name: 'Sentinel', text: 'No activity today' },
      { name: 'Fortress', text: '100% tests passing' },
      { name: 'Visual Cortex', text: 'Architecture up to date' }
    ]
  },
  {
    name: 'distributed-lab', status: '#DC2626', id: 'distributed-lab',
    activity: [6, 5, 3, 4, 2, 3, 2], tension: 0.3,
    agents: [
      { name: 'Sentinel', text: '1 high-risk issue found' },
      { name: 'Fortress', text: '85% tests passing' },
      { name: 'Visual Cortex', text: 'Complexity spike detected' }
    ]
  },
  {
    name: 'test-sandbox', status: '#15803D', id: 'test-sandbox',
    activity: [3, 4, 5, 6, 5, 6, 7], tension: 0.4,
    agents: [
      { name: 'Sentinel', text: '4 PRs reviewed today' },
      { name: 'Fortress', text: '100% tests passing' },
      { name: 'Visual Cortex', text: 'Architecture up to date' }
    ]
  }
];

const activityFeed = [
  { icon: Shield, color: '#7B2FE0', agent: 'Sentinel', action: 'Flagged potential race condition', repo: 'InfraZero', time: '12m ago' },
  { icon: TestTube2, color: '#15803D', agent: 'Fortress', action: 'Auto-fixed failing test suite', repo: 'velocis-core', time: '1h ago' },
  { icon: Eye, color: '#0D9488', agent: 'Visual Cortex', action: 'Updated service dependency graph', repo: 'distributed-lab', time: '2h ago' },
  { icon: Shield, color: '#7B2FE0', agent: 'Sentinel', action: 'Completed architecture review PR #482', repo: 'InfraZero', time: '3h ago' },
  { icon: TestTube2, color: '#15803D', agent: 'Fortress', action: 'Ran 247 e2e integration tests', repo: 'velocis-core', time: '5h ago' }
];


// Live Timer Component
const LiveSecondsCounter = () => {
  const [seconds, setSeconds] = useState(43);
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s >= 999 ? 0 : s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="font-mono-code text-[12px] font-[500] text-[#7B2FE0] tabular-nums" style={{ fontVariant: 'all-small-caps' }}>
      {seconds} seconds ago
    </span>
  );
};

// Agent Health Card Component
const AgentHealthCard = ({ name, icon: Icon, color, score, stats, trend, ringSize = 40, flexWeight = 1, showGlow = false, highlightValue = false }: { name: string, icon: any, color: string, score: number, stats: any[], trend: number[], ringSize?: number, flexWeight?: number, showGlow?: boolean, highlightValue?: boolean }) => {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[10px] px-[18px] py-[16px] flex flex-col gap-[16px]" style={{ flex: flexWeight, boxShadow: showGlow ? `inset 3px 0 0 ${color}, 0 1px 3px rgba(0,0,0,0.06)` : '' }}>
      {/* Top Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
            <Icon className="w-[14px] h-[14px]" style={{ color }} />
          </div>
          <span className="text-[13px] font-[600] text-[var(--text-high)] tracking-[-0.01em]">{name}</span>
        </div>
        {/* Circular Progress Ring */}
        <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
            <motion.circle
              cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray="100.5"
              initial={{ strokeDashoffset: 100.5 }}
              animate={{ strokeDashoffset: 100.5 - (100.5 * score) / 100 }}
              transition={{ duration: 1.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[13px] font-[700] font-['Inter_Tight'] text-[var(--text-high)]">
            {score}
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="flex items-center justify-between pt-[4px]">
        {stats.map((s: any, i: number) => (
          <React.Fragment key={i}>
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10px] font-[500] text-[var(--text-xlow)] uppercase tracking-[0.05em]">{s.label}</span>
              <span className="text-[15px] font-[700] tabular-nums block font-['Inter_Tight']" style={{ color: (highlightValue && i === stats.length - 1) ? color : 'var(--text-high)' }}>{s.value}</span>
            </div>
            {i < stats.length - 1 && <div className="w-[1px] h-[20px] bg-[var(--border-2)]" />}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center justify-between pt-[12px] border-t border-[var(--border-2)] mt-[4px]">
        <span className="text-[10px] font-[500] text-[var(--text-xlow)]">Last 5 days</span>
        <div className="flex items-end gap-[3px] h-[16px]">
          {trend.map((h: number, i: number) => (
            <motion.div
              key={i}
              className="w-[4px] rounded-[1px]"
              style={{ backgroundColor: i === trend.length - 1 ? color : `${color}80` }}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Command Palette Component
const CommandPalette = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[560px] max-h-[400px] flex flex-col bg-[var(--surface-1)] border border-[rgba(123,47,224,0.25)] rounded-[14px] shadow-[0_24px_80px_rgba(0,0,0,0.25),0_0_0_1px_rgba(123,47,224,0.10)] backdrop-blur-[40px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-[16px]">
          <input
            autoFocus
            type="text"
            placeholder="Search repositories, agents, run commands..."
            className="w-full h-[52px] bg-transparent border-0 border-b border-[rgba(0,0,0,0.06)] text-[15px] font-[400] text-[var(--text-high)] placeholder:text-[var(--text-xlow)] focus:outline-none focus:ring-0"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-[4px] py-[8px] space-y-[4px]">
          <div className="px-[12px] pt-[10px] pb-[4px] text-[10px] font-[600] tracking-[0.06em] text-[var(--text-xlow)] uppercase">Repositories</div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <GitBranch className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">InfraZero</span>
            <span className="text-[12px] text-[var(--text-low)] ml-auto">Open repository</span>
          </div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <GitBranch className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">velocis-core</span>
            <span className="text-[12px] text-[#F5A623] ml-auto">Warning: flaky tests</span>
          </div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <GitBranch className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">distributed-lab</span>
            <span className="text-[12px] text-[#DC2626] ml-auto">Critical: high risk</span>
          </div>

          <div className="px-[12px] pt-[10px] pb-[4px] text-[10px] font-[600] tracking-[0.06em] text-[var(--text-xlow)] uppercase">Actions</div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <Shield className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">Run Sentinel scan on all repos</span>
          </div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <TestTube2 className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">Run Fortress test suite</span>
          </div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <Eye className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">Refresh Visual Cortex graph</span>
          </div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <Zap className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">View open risks (3)</span>
          </div>

          <div className="px-[12px] pt-[10px] pb-[4px] text-[10px] font-[600] tracking-[0.06em] text-[var(--text-xlow)] uppercase">Navigation</div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-high)] group">
            <LayoutGrid className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">Go to Overview</span>
            <span className="text-[12px] text-[var(--text-xlow)] ml-auto tabular-nums">⌘1</span>
          </div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <GitBranch className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">Go to Repositories</span>
            <span className="text-[12px] text-[var(--text-xlow)] ml-auto tabular-nums">⌘2</span>
          </div>
          <div className="px-[12px] h-[36px] flex items-center gap-[8px] rounded-[8px] hover:bg-[rgba(123,47,224,0.08)] cursor-pointer text-[var(--text-mid)] hover:text-[var(--text-high)] group">
            <Activity className="w-[14px] h-[14px]" />
            <span className="text-[13px] font-[500] text-[var(--text-high)]">Go to Activity</span>
            <span className="text-[12px] text-[var(--text-xlow)] ml-auto tabular-nums">⌘3</span>
          </div>
        </div>
        <div className="px-[12px] py-[8px] border-t border-[var(--border-2)] flex items-center gap-[12px] text-[11px] text-[var(--text-xlow)]">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </motion.div>
    </div>
  );
};

// Toast Notification System
const ToastSystem = () => {
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowToast(true), 2000);
    const hideTimer = setTimeout(() => setShowToast(false), 7000);
    return () => { clearTimeout(timer); clearTimeout(hideTimer); };
  }, []);

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, x: '120%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '120%', transition: { duration: 0.3, ease: 'easeIn' } }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-[24px] right-[24px] z-[9998] w-[320px] bg-[var(--surface-1)] border border-[rgba(123,47,224,0.20)] shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-[12px] pt-[14px] px-[16px] pb-[16px] overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <div className="w-[20px] h-[20px] rounded-full bg-[rgba(123,47,224,0.15)] flex items-center justify-center">
                <Shield className="w-[10px] h-[10px] text-[var(--accent-violet)]" strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-[600] text-[var(--text-high)] tracking-[-0.01em]">Sentinel detected an issue</span>
            </div>
            <button onClick={() => setShowToast(false)} className="text-[var(--text-xlow)] hover:text-[var(--text-high)] transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <p className="mt-[8px] text-[12px] font-[400] text-[var(--text-mid)] leading-[1.5]">Race condition in InfraZero &middot; PR #487</p>
          <div className="mt-[12px]">
            <button className="text-[11px] font-[600] text-[#7B2FE0] hover:text-[#6A25C7] transition-colors">View issue &rarr;</button>
          </div>
          <motion.div
            initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }}
            className="absolute bottom-0 left-0 h-[3px] bg-[#7B2FE0]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN PAGE ---
export function DashboardPage() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Overview');
  const [activeTab, setActiveTab] = useState('All');
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommands(true);
      }
      if (e.key === 'Escape') {
        setShowCommands(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pendingRisks = quickStats.find(s => s.title === 'Open risks')?.value || 0;

  // Staggered reveals mimicking Linear/Vercel (0.16, 1, 0.3, 1 spring curve)
  const fadeUpContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
  };
  const fadeUpItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
  };
  // Special stagger for repo cards
  const repoStagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.12 } }
  };
  const repoCardVariant = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
  };

  const barVariants = {
    hidden: { width: 0 },
    show: (custom: number) => ({
      width: '100%',
      transition: { duration: 0.7, delay: custom * 0.08, ease: [0.16, 1, 0.3, 1] }
    })
  };

  return (
    <div className="min-h-screen">
      <style>{globalDevtoolsStyles}</style>

      {/* Restrained Background Atmosphere */}
      <div className="vignette-bg" />
      <div className="hero-radial" />
      <div className="noise-bg" />

      <div className="flex relative z-10 selection:bg-[var(--accent-violet)] selection:text-[var(--text-high)]">
        <ToastSystem />

        {/* 1. SIDEBAR (LINEAR STYLE) */}
        <aside className="w-[220px] fixed inset-y-0 left-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-1)] flex flex-col z-40">

          {/* Top Logo Section */}
          <div className="h-[52px] px-4 flex items-center border-b border-[var(--border-2)] cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex items-center gap-3">
              <div className="w-[24px] h-[24px] rounded-md flex items-center justify-center bg-gradient-to-br from-[var(--accent-violet)] to-[#D4FF4E]">
                <span className="text-[var(--bg-base)] font-[800] text-[12px] leading-none mb-[1px]">V</span>
              </div>
              <span className="font-['Inter_Tight'] font-[700] text-[15px] text-[var(--text-high)] tracking-[-0.04em] leading-[1.2]">Velocis</span>
              <div className="ml-1 px-1.5 py-0.5 rounded-[4px] border text-center hidden md:block" style={{ backgroundColor: 'rgba(245,166,35,0.12)', borderColor: 'rgba(245,166,35,0.25)' }}>
                <span className="text-[9px] font-[600] tracking-[0.08em] text-[#F5A623] leading-[1.3] uppercase font-mono-code tabular-nums" style={{ fontVariant: 'all-small-caps' }}>Production</span>
              </div>
            </div>
          </div>

          {/* Workspace Switcher */}
          <div className="px-3 pt-3 pb-2">
            <button className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[var(--surface-2)] transition-colors group">
              <span className="text-[12px] font-[500] tracking-[-0.01em] text-[var(--text-mid)] group-hover:text-[var(--text-high)] transition-colors leading-[1.5]">Main workspace</span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-low)] group-hover:text-[var(--text-mid)]" />
            </button>
          </div>

          {/* Core Nav Group */}
          <nav className="px-3 py-1 space-y-0.5">
            {[
              { label: 'Overview', icon: LayoutGrid, short: '⌘1' },
              { label: 'Repositories', icon: GitBranch, short: '⌘2' },
              { label: 'Activity', icon: Activity, short: '⌘3' }
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={`w-full h-[32px] px-[10px] rounded-[7px] flex items-center gap-2 group transition-colors ${activeNav === item.label ? 'nav-active' : 'nav-inactive hover:bg-[rgba(255,255,255,0.045)] hover:text-[var(--text-high)]'}`}
              >
                <item.icon className="w-[14px] h-[14px]" strokeWidth={2} />
                <span className="text-[13px] tracking-[-0.01em] leading-[1.4]">{item.label}</span>
                <span className="kbd-hint ml-auto opacity-0 group-hover:opacity-100 transition-opacity">{item.short}</span>
              </button>
            ))}
          </nav>

          {/* Agents Group */}
          <div className="mt-4 mb-1 px-4 flex items-center justify-between group cursor-pointer" onClick={() => setAgentsExpanded(!agentsExpanded)}>
            <span className="text-[11px] font-[500] text-[var(--text-xlow)] tracking-[0.04em] leading-[1.4] group-hover:text-[var(--text-low)] transition-colors">Agents</span>
            <ChevronRight className={`w-3 h-3 text-[var(--text-xlow)] transition-transform ${agentsExpanded ? 'rotate-90' : ''}`} />
          </div>
          <AnimatePresence>
            {agentsExpanded && (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-3 space-y-0.5 overflow-hidden"
              >
                {[
                  { label: 'Sentinel', icon: Shield },
                  { label: 'Fortress', icon: TestTube2 },
                  { label: 'Visual Cortex', icon: Eye }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setActiveNav(item.label)}
                    className={`w-full h-[32px] px-[10px] rounded-[7px] flex items-center gap-2 transition-colors ${activeNav === item.label ? 'nav-active' : 'nav-inactive hover:bg-[rgba(255,255,255,0.045)] hover:text-[var(--text-high)]'}`}
                  >
                    <item.icon className="w-[14px] h-[14px]" strokeWidth={2} />
                    <span className="text-[13px] tracking-[-0.01em] leading-[1.4]">{item.label}</span>
                  </button>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>

          {/* System Group */}
          <div className="mt-4 mb-1 px-4">
            <span className="text-[11px] font-[500] text-[var(--text-xlow)] tracking-[0.04em] leading-[1.4]">System</span>
          </div>
          <nav className="px-3 space-y-0.5">
            <button className="w-full h-[32px] px-[10px] rounded-[7px] flex items-center gap-2 nav-inactive hover:bg-[var(--bg-base)] hover:text-[var(--text-high)] transition-colors">
              <Settings className="w-[14px] h-[14px]" strokeWidth={2} />
              <span className="text-[13px] font-[400] tracking-[-0.01em] leading-[1.4]">Settings</span>
            </button>
            <button className="w-full h-[32px] px-[10px] rounded-[7px] flex items-center gap-2 nav-inactive hover:bg-[var(--bg-base)] hover:text-[var(--text-high)] transition-colors">
              <ExternalLink className="w-[14px] h-[14px]" strokeWidth={2} />
              <span className="text-[13px] font-[400] tracking-[-0.01em] leading-[1.4]">Docs</span>
            </button>
          </nav>

          {/* Bottom Avatar Section */}
          <div className="mt-auto p-3 pt-0">
            <div className="h-[36px] px-[10px] rounded-[7px] flex items-center gap-2 hover:bg-[var(--bg-base)] transition-colors cursor-pointer group">
              <div className="w-[24px] h-[24px] rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-lime)] flex items-center justify-center">
                <span className="text-[var(--bg-base)] font-[800] text-[9px]">R</span>
              </div>
              <span className="text-[12px] font-[500] leading-[1.5] text-[var(--text-mid)] group-hover:text-[var(--text-high)]">Rishabh</span>
              <span className="kbd-hint ml-auto">⌘K</span>
            </div>
          </div>
        </aside>

        {/* 2. MAIN CONTENT AREA */}
        <div className="pl-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top Navbar (Vercel Style) */}
          <header className="h-[52px] sticky top-0 bg-[rgba(255,255,255,0.88)] backdrop-blur-[20px] border-b border-[var(--border-1)] shadow-[0_1px_0_var(--border-1)] px-6 flex items-center justify-between z-30 saturate-[1.8]">

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[var(--text-low)] font-[400] tracking-[0]">Velocis</span>
              <span className="text-[13px] text-[var(--text-xlow)] font-[300] mx-[4px]">/</span>
              <span className="text-[13px] text-[var(--text-high)] font-[600] tracking-[0]">Dashboard</span>
            </div>

            <div
              onClick={() => setShowCommands(true)}
              className="hidden md:flex relative w-[280px] h-[32px] bg-[var(--bg-base)] border border-[var(--border-1)] rounded-[8px] px-[12px] items-center text-[var(--text-high)] transition-all cursor-text group hover:border-[rgba(123,47,224,0.35)] hover:shadow-[0_0_0_2px_rgba(123,47,224,0.06)]"
            >
              <Search className="h-[14px] w-[14px] mr-2 text-[var(--text-low)]" />
              <span className="text-[13px] font-[400] tracking-[0] text-[var(--text-xlow)]">Search repos, agents, run commands...</span>
              <span className="kbd-hint absolute right-1.5 top-0.5" style={{ padding: '0 4px', fontSize: '11px', height: '20px', lineHeight: '20px', marginTop: '3px' }}>⌘K</span>
            </div>

            {/* Right Group */}
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <button className="h-[32px] px-3 bg-[#FFFFFF] border border-[var(--border-1)] rounded-[7px] text-[12px] font-[500] tracking-[-0.01em] leading-[1.3] text-[var(--text-mid)] hover:text-[var(--text-high)] hover:border-[#C4BBE8] transition-colors flex items-center gap-1.5">
                Last 24h <ChevronDown className="w-3.5 h-3.5 text-[var(--text-mid)]" />
              </button>

              <div className="w-[1px] h-4 bg-[var(--border-1)] mx-1 hidden sm:block"></div>

              {/* Status Pill */}
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-[rgba(21,128,61,0.08)] border border-[rgba(21,128,61,0.22)] rounded-full cursor-default">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] pulse-green"></div>
                <span className="text-[11px] font-[500] text-[var(--accent-green)] tracking-[0] tabular-nums leading-[1.3]">All systems operational</span>
              </div>

              {/* Notification Bell */}
              <button className="relative w-[32px] h-[32px] rounded-md bg-[var(--bg-base)] border border-[var(--border-1)] flex items-center justify-center text-[var(--text-mid)] hover:text-[var(--text-high)] transition-colors">
                <Bell className="w-[15px] h-[15px]" />
                {pendingRisks > 0 && (
                  <div className="absolute -top-[4px] -right-[4px] bg-[var(--accent-red)] text-white font-mono-code text-[9px] font-[700] px-[4px] rounded-full h-[14px] flex items-center justify-center border border-[var(--surface-1)]">
                    {pendingRisks}
                  </div>
                )}
              </button>
            </div>
          </header>

          {/* HERO STATUS BAR */}
          <div className="h-[48px] w-full flex items-center justify-between px-[32px] shrink-0 border-b border-[rgba(123,47,224,0.12)] transition-colors overflow-hidden" style={{ backgroundColor: isDarkMode ? 'rgba(123,47,224,0.02)' : 'rgba(123,47,224,0.06)' }}>
            {/* LEFT */}
            <div className="flex items-center gap-2 text-[12px] font-[400] text-[#8B879E]">
              <span>Velocis is monitoring 6 repositories across 3 AI agents — last scan</span>
              <LiveSecondsCounter />
            </div>

            {/* CENTER */}
            <div className="flex items-center gap-[6px] hidden xl:flex">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(123,47,224,0.04)] dark:bg-[rgba(255,255,255,0.04)] border border-[rgba(123,47,224,0.07)] dark:border-[rgba(255,255,255,0.07)] text-[11px] font-[500] text-[var(--text-high)] shadow-sm">
                <div className="w-[6px] h-[6px] rounded-full bg-[var(--accent-green)] animate-pulse" />
                ◎ Sentinel Active
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(123,47,224,0.04)] dark:bg-[rgba(255,255,255,0.04)] border border-[rgba(123,47,224,0.07)] dark:border-[rgba(255,255,255,0.07)] text-[11px] font-[500] text-[var(--text-high)] shadow-sm">
                <div className="w-[6px] h-[6px] rounded-full bg-[var(--accent-green)] animate-pulse" />
                ◈ Fortress Running
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(123,47,224,0.04)] dark:bg-[rgba(255,255,255,0.04)] border border-[rgba(123,47,224,0.07)] dark:border-[rgba(255,255,255,0.07)] text-[11px] font-[500] text-[var(--text-high)] shadow-sm">
                <div className="w-[6px] h-[6px] rounded-full bg-[var(--accent-amber)] animate-pulse" />
                ◉ Visual Cortex Scanning
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-[8px]">
              <Sun className={`w-3.5 h-3.5 transition-colors ${!isDarkMode ? 'text-[#D4FF4E]' : 'text-[var(--text-xlow)]'}`} />
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="relative w-[40px] h-[22px] rounded-[11px] transition-colors duration-300 focus:outline-none"
                style={{ backgroundColor: isDarkMode ? '#7B2FE0' : '#D4FF4E' }}
              >
                <div
                  className="absolute top-[2px] w-[18px] h-[18px] rounded-full shadow-sm transition-transform duration-250 ease-out"
                  style={{
                    left: '2px',
                    transform: isDarkMode ? 'translateX(18px)' : 'translateX(0)',
                    backgroundColor: isDarkMode ? '#FFFFFF' : '#2D3800'
                  }}
                />
              </button>
              <Moon className={`w-3.5 h-3.5 transition-colors ${isDarkMode ? 'text-[#7B2FE0]' : 'text-[var(--text-xlow)]'}`} />
            </div>
          </div>

          <main className="p-8 pb-16 max-w-[1440px] mx-auto w-full relative">
            <AnimatePresence>
              {showCommands && <CommandPalette isOpen={showCommands} onClose={() => setShowCommands(false)} />}
            </AnimatePresence>

            <motion.div variants={fadeUpContainer} initial="hidden" animate="show">

              {/* WELCOME HEADER SECTION */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-[24px] gap-4">
                <div>
                  <h1 className="text-[20px] font-[700] tracking-[-0.03em] text-[var(--text-high)] mb-[2px]">Good morning, Rishabh.</h1>
                  <p className="text-[13px] font-[400] text-[var(--text-mid)]">Velocis detected 1 new issue since your last session · 3h ago</p>
                </div>
                <div className="flex items-center gap-[8px]">
                  <button className="flex items-center gap-1.5 px-[14px] py-[7px] bg-transparent border border-[var(--border-1)] text-[var(--text-mid)] text-[12px] font-[600] rounded-[8px] hover:border-[rgba(123,47,224,0.30)] transition-colors">
                    View report
                  </button>
                  <button className="flex items-center gap-1.5 px-[14px] py-[7px] bg-[#7B2FE0] text-white text-[12px] font-[600] rounded-[8px] hover:bg-[#6B1FD0] hover:shadow-[0_4px_16px_rgba(123,47,224,0.35)] transition-all">
                    <Play className="w-[12px] h-[12px] fill-current" />
                    Run full scan
                  </button>
                </div>
              </div>

              {/* 3. KPI Cards Row (Vercel Style) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[20px] mb-[40px]">
                {quickStats.map((stat, i) => {
                  let accentSolid = '';
                  let sparkData: number[] = [];
                  if (i === 0) { accentSolid = '#7B2FE0'; sparkData = [18, 21, 19, 24, 22, 23, 24]; }
                  if (i === 1) { accentSolid = '#2563EB'; sparkData = [98, 99, 100, 100, 99, 100, 100]; }
                  if (i === 2) { accentSolid = '#0D9488'; sparkData = [134, 136, 138, 140, 141, 141, 142]; }
                  if (i === 3) { accentSolid = '#DC2626'; sparkData = [5, 4, 4, 3, 4, 3, 3]; }

                  return (
                    <motion.div
                      key={i}
                      variants={fadeUpItem}
                      className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[10px] relative transition-all duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] hover:border-[#C4BBE8] hover:shadow-[0_4px_12px_rgba(0,0,0,0.09),0_0_0_3px_rgba(123,47,224,0.06)] hover:bg-[var(--surface-2)] overflow-hidden flex flex-col"
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px] z-10" style={{ background: accentSolid }} />

                      <div className="px-[20px] pt-[18px] pb-[4px] flex-1">
                        <div className="flex items-center justify-between mb-[12px]">
                          <div className="flex items-center gap-[6px]">
                            <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center border" style={{ backgroundColor: `${accentSolid}1A`, borderColor: `${accentSolid}33` }}>
                               <stat.icon className="w-[16px] h-[16px]" style={{ color: accentSolid }} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-[11px] font-[400] text-[var(--text-high)] tracking-[0.01em] leading-[1.4] ml-[2px]">{stat.title}</h3>
                          </div>
                          {stat.delta !== '0%' && (
                            <div className="text-[11px] tabular-nums font-[600] leading-[1.3] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5"
                              style={{
                                color: stat.deltaColor,
                                backgroundColor: `${stat.deltaColor}14`,
                                borderColor: `${stat.deltaColor}2E`
                              }}>
                              {stat.trend} {stat.delta}
                            </div>
                          )}
                        </div>

                        <div className="flex items-end justify-between">
                          <div className="font-['Inter_Tight'] text-[28px] font-[700] text-[var(--text-high)] tracking-[-0.04em] leading-[1.1] tabular-nums">
                            <CountUp to={stat.value as number} isPercentage={stat.isPercentage} />
                          </div>
                        </div>

                        <div className="mt-[6px] text-[12px] font-[400] text-[var(--text-xlow)] italic leading-[1.5]">
                          {stat.subtext}
                        </div>
                      </div>

                      <div className="h-[32px] w-full mt-auto opacity-100">
                        <LineSparkline data={sparkData} color={accentSolid} showGrid={false} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* AGENT HEALTH SCORE SECTION */}
              <motion.div variants={fadeUpItem} className="mb-[32px]">
                <h2 className="text-[13px] font-[600] text-[var(--text-high)] mb-[16px] tracking-[-0.01em] leading-[1.3]">Agent health overview</h2>
                <div className="flex flex-col lg:flex-row gap-[20px]">
                  <AgentHealthCard
                    name="Sentinel" icon={Shield} color="#7B2FE0" score={94}
                    stats={[{ label: 'Scans', value: '247' }, { label: 'Flags', value: '3' }, { label: 'PRs', value: '24' }]}
                    trend={[40, 55, 65, 75, 90]}
                    flexWeight={1.1} ringSize={44} showGlow={true}
                  />
                  <AgentHealthCard
                    name="Fortress" icon={TestTube2} color="#2563EB" score={87}
                    stats={[{ label: 'Tests', value: '1,247' }, { label: 'Flaky', value: '8' }, { label: 'Pass', value: '98%' }]}
                    trend={[85, 88, 72, 85, 87]}
                    flexWeight={1.0} ringSize={40} showGlow={false}
                  />
                  <AgentHealthCard
                    name="Visual Cortex" icon={Eye} color="#0D9488" score={96}
                    stats={[{ label: 'Services', value: '142' }, { label: 'Stale', value: '4' }, { label: 'Fresh', value: '96%' }]}
                    trend={[90, 92, 91, 94, 96]}
                    flexWeight={0.9} ringSize={36} showGlow={false} highlightValue={true}
                  />
                </div>
              </motion.div>

              {/* Devtools Control Row */}
              <motion.div variants={fadeUpItem} className="flex items-center justify-between mb-[14px]">
                <div className="flex items-center gap-3">
                  <h2 className="text-[11px] font-[600] text-[var(--text-low)] tracking-[0.04em] leading-[1.3]">Repositories</h2>
                  <span className="text-[11px] font-[400] leading-[1.4] text-[var(--text-xlow)] tabular-nums">6 connected</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-[400] leading-[1.4] text-[var(--text-xlow)] tabular-nums mr-2 items-center hidden sm:flex">
                    Last updated 2 mins ago <RefreshCw className="w-3 h-3 ml-1.5 text-[var(--text-mid)] animate-spin-60s hover:text-[var(--text-high)] cursor-pointer" />
                  </div>
                  <button className="h-[28px] px-3 bg-[#FFFFFF] border border-[#E4E2EC] rounded-[7px] text-[12px] font-[500] tracking-[-0.01em] leading-[1.3] text-[var(--text-mid)] hover:text-[#1A1523] hover:border-[#C4BBE8] transition-colors flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> Filter <ChevronDown className="w-3 h-3 text-[var(--text-low)]" />
                  </button>
                  <button className="h-[28px] px-3 bg-[#FFFFFF] border border-[#E4E2EC] rounded-[7px] text-[12px] font-[500] tracking-[-0.01em] leading-[1.3] text-[var(--text-mid)] hover:text-[#1A1523] hover:border-[#C4BBE8] transition-colors flex items-center gap-1.5">
                    <ArrowUpDown className="w-3 h-3" /> Sort <ChevronDown className="w-3 h-3 text-[var(--text-low)]" />
                  </button>
                  <div className="flex bg-[#FFFFFF] border border-[#E4E2EC] rounded-[7px] p-[2px]">
                    <button className="w-[24px] h-[22px] px-1.5 bg-[#F0EEF7] rounded-[5px] text-[var(--accent-violet)] border border-[#E4E2EC]"><LayoutGrid className="w-3.5 h-3.5" /></button>
                    <button className="w-[24px] h-[22px] px-1.5 text-[var(--text-low)] hover:text-[var(--text-mid)]"><List className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </motion.div>

              {/* Status Legend (Datadog style) */}
              <motion.div variants={fadeUpItem} className="flex gap-4 mb-4 cursor-pointer">
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]"></div><span className="text-[11px] font-[600] leading-[1.3] tabular-nums text-[var(--text-low)]">Healthy <span className="text-[var(--text-mid)] border-none">4</span></span></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-amber)]"></div><span className="text-[11px] font-[600] leading-[1.3] tabular-nums text-[var(--text-low)]">Warning <span className="text-[var(--text-mid)] border-none">1</span></span></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]"></div><span className="text-[11px] font-[600] leading-[1.3] tabular-nums text-[var(--text-low)]">Critical <span className="text-[var(--text-mid)] border-none">1</span></span></div>
              </motion.div>

              {/* 4. Main 2-Column Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-[24px]">

                {/* LEFT COLUMN: Repositories (Clean edge style) */}
                <motion.div variants={repoStagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-[24px] content-start">
                  {repositories.map((repo, idx) => {
                    let pillBg, pillColor, pillBorder, pulseClass;
                    const score = [98, 95, 71, 100, 62, 99][idx];
                    if (score < 70) {
                      pillBg = 'rgba(220,38,38,0.10)'; pillColor = '#DC2626'; pillBorder = 'rgba(220,38,38,0.25)'; pulseClass = 'pulse-red';
                    } else if (score < 90) {
                      pillBg = 'rgba(245,166,35,0.08)'; pillColor = '#B45309'; pillBorder = 'rgba(245,166,35,0.20)'; pulseClass = 'ring-amber';
                    } else {
                      pillBg = 'rgba(21,128,61,0.08)'; pillColor = '#15803D'; pillBorder = 'rgba(21,128,61,0.20)'; pulseClass = 'pulse-green';
                    }
                    
                    return (
                    <motion.div
                      key={idx}
                      variants={repoCardVariant}
                      className="bg-[#FFFFFF] dark:bg-[var(--surface-1)] border border-[#E4E2EC] dark:border-[var(--border-1)] rounded-[10px] pt-[20px] px-[20px] pb-[16px] w-full flex flex-col h-full hover:border-[#C4BBE8] hover:-translate-y-[1px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-[180ms] ease-out relative overflow-hidden"
                      style={{ borderTop: `2px solid ${repo.status}66` }}
                    >
                      {/* RUNNING Indicator Top Bar */}
                      {idx === 2 && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[rgba(245,166,35,0.15)] overflow-hidden z-10">
                          <div className="w-full h-full bg-gradient-to-r from-transparent via-[#F5A623] to-transparent animate-shimmer" />
                        </div>
                      )}

                      {/* Repo Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-[4px]">
                          <div className="flex items-center">
                            <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center bg-[#F4F3F7] dark:bg-[var(--surface-2)] border border-[#E4E2EC] dark:border-[var(--border-1)] shrink-0">
                              <GitBranch className="w-[14px] h-[14px] text-[#7B7890] dark:text-[var(--text-low)]" strokeWidth={2} />
                            </div>
                            <h4 className="text-[13.5px] font-[600] leading-[1.3] text-[var(--text-high)] tracking-[-0.02em] ml-[12px] mb-[1px]">{repo.name}</h4>
                          </div>
                          <div className="text-[10px] font-[400] text-[#7B7890] dark:text-[var(--text-xlow)] font-mono-code lowercase ml-[40px] tracking-[0.06em]">
                            {['abc1234', 'f9a8d7c', 'e5c4b3a', 'b2a1f09', 'd8e7f6a', 'c3b2a1f'][idx]} · main · {['2h ago', '5h ago', '1d ago', '10m ago', '3d ago', '1h ago'][idx]}
                          </div>
                        </div>

                        <div className="flex items-center gap-[10px]">
                           {/* Health Pill */}
                           <div className={`px-[6px] py-[2px] rounded-[4px] font-mono-code text-[10px] ${score < 70 ? 'font-[700]' : 'font-[600]'} border`} style={{ 
                              backgroundColor: pillBg, color: pillColor, borderColor: pillBorder
                           }}>
                             {score}
                           </div>
                           <div className={`w-[10px] h-[10px] rounded-full inline-flex shrink-0 ${pulseClass}`} style={{ backgroundColor: repo.status }}></div>
                        </div>
                      </div>

                      {/* Agent Rows */}
                      <div className="w-full flex flex-col gap-[16px] mt-[20px]">
                        {repo.agents.map((agent, aIdx) => {
                          let icon, bg, border, color;
                          if (agent.name === 'Sentinel') {
                            icon = Shield; bg = '#F3EDFD'; border = '#E2D4FA'; color = '#7B2FE0';
                          } else if (agent.name === 'Fortress') {
                            icon = TestTube2; bg = '#EBF0FD'; border = '#D3E2FA'; color = '#2563EB';
                          } else {
                            icon = Eye; bg = '#E6FAF8'; border = '#C4F0EB'; color = '#0D9488';
                          }
                          const IconComp = icon;
                          return (
                            <div key={aIdx} className="flex items-center justify-between w-full h-[28px] group hover:bg-[#FAFAF9] rounded-[6px] transition-colors -mx-1 px-1">
                              <div className="flex items-center gap-[10px]">
                                <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center border shrink-0" style={{ backgroundColor: bg, borderColor: border }}>
                                  <IconComp className="w-[14px] h-[14px]" style={{ color }} strokeWidth={2} />
                                </div>
                                <span className="text-[13px] font-[600] leading-[1.4] text-[var(--text-high)] tracking-[-0.01em]">{agent.name}</span>
                              </div>
                              <span className="text-[13px] font-[400] leading-[1.4] tracking-[0] text-[#7B7890] text-right ml-4 truncate max-w-[160px]">{agent.text}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Divider */}
                      <div className="border-t border-[#EEECF4] mt-[16px] mb-[12px]" />

                      {/* Activity Chart */}
                      <div className="w-full">
                        <StandardAreaChart data={repo.activity} tension={repo.tension} />
                      </div>

                      {/* Card Footer */}
                      <div className="pt-[14px] flex items-center justify-end border-t border-[#EEECF4] mt-[16px]">
                        <a href="#" className="flex items-center text-[12px] font-[500] tracking-[-0.01em] leading-[1.3] text-[#7B7890] hover:text-[#1A1523] transition-colors focus:outline-none focus:ring-0 duration-150">
                          View details <ChevronRight className="w-[12px] h-[12px] ml-[4px]" strokeWidth={2} />
                        </a>
                      </div>
                    </motion.div>
                  );
                  })}
                  
                  {/* Ghost Card */}
                  <motion.div variants={repoCardVariant} className="flex flex-col items-center justify-center h-[280px] rounded-[10px] border border-dashed border-[var(--border-1)] hover:border-[rgba(123,47,224,0.30)] hover:bg-[rgba(123,47,224,0.02)] transition-colors cursor-pointer group">
                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[var(--surface-1)] border border-[var(--border-2)] group-hover:border-[rgba(123,47,224,0.30)] shadow-sm mb-3">
                      <span className="text-[var(--text-xlow)] group-hover:text-[#7B2FE0] text-[20px] transition-colors font-['Inter_Tight'] font-[300] leading-none mb-1">+</span>
                    </div>
                    <span className="text-[12px] font-[500] text-[var(--text-xlow)] group-hover:text-[var(--text-mid)] transition-colors">Connect repository</span>
                  </motion.div>
                </motion.div>

                {/* RIGHT COLUMN: Activity Feed (Linear Style) */}
                <div className="flex flex-col gap-[20px]">

                  <motion.div variants={fadeUpItem} className="bg-[rgba(255,255,255,0.022)] border border-[var(--border-1)] rounded-[10px] flex flex-col sticky top-[68px] overflow-hidden">

                    {/* Header */}
                    <div className="px-[16px] pt-[16px] pb-[14px] flex justify-between items-center">
                      <div className="flex items-center gap-[10px]">
                        <h2 className="text-[13px] font-[600] text-[var(--text-high)] tracking-[-0.01em] leading-[1.3]">Activity</h2>
                        <div className="px-[6px] py-[2px] rounded-full bg-[rgba(123,47,224,0.10)] text-[#7B2FE0] text-[10px] font-[600] tracking-[-0.01em]">5 new</div>
                        <div className="px-[6px] py-[2px] rounded-full bg-[rgba(220,38,38,0.10)] border border-[rgba(220,38,38,0.25)] text-[#DC2626] text-[10px] font-[600] flex items-center gap-1.5"><div className="w-[4px] h-[4px] bg-[#DC2626] rounded-full animate-pulse" />LIVE</div>
                      </div>
                      <button className="text-[11px] font-[600] leading-[1.3] tabular-nums text-[var(--accent-violet)] hover:text-[#7B2FE0] transition-colors mt-[2px]">
                        View all
                      </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="px-[16px] flex gap-[16px] border-b border-[var(--border-2)] text-[12px] font-[500]">
                      {['All', 'Sentinel', 'Fortress', 'Cortex'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`pb-2 border-b-[2px] transition-colors ${activeTab === tab ? 'text-[var(--text-high)] border-[var(--accent-lime)] font-[600]' : 'text-[var(--text-low)] border-transparent hover:text-[var(--text-mid)] font-[500]'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Event Rows */}
                    <div className="p-0 flex-1 flex flex-col mb-4">
                      {activityFeed.map((item, i) => {
                        let severityBorder = '';
                        let borderWidth = '2px';
                        let bgWash = 'transparent';
                        if (item.color === '#DC2626') { severityBorder = '#DC2626'; borderWidth = '3px'; bgWash = 'rgba(220,38,38,0.022)'; }
                        else if (item.color === '#F5A623') severityBorder = '#F5A623';
                        else if (item.color === '#15803D') severityBorder = '#15803D';
                        else severityBorder = '#2563EB';

                        return (
                          <div
                            key={i}
                            className="flex items-start gap-[14px] px-[16px] py-[14px] border-b border-[var(--border-2)] cursor-default hover:bg-[rgba(255,255,255,0.02)] transition-colors relative"
                            style={{ backgroundColor: bgWash }}
                          >
                            <div className="absolute left-0 top-[12px] bottom-[12px] rounded-r-[4px]" style={{ backgroundColor: severityBorder, width: borderWidth }} />
                            <div
                              className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center shrink-0 border ml-[2px]"
                              style={{ backgroundColor: `${item.color}26`, borderColor: `${item.color}33` }}
                            >
                              <item.icon className="w-[12px] h-[12px]" style={{ color: item.color }} strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-[500] text-[var(--text-high)] leading-[1.5] mb-[0px]">
                                {item.action}
                                <span className="font-[600] text-[#7B2FE0] ml-1 hover:underline cursor-pointer">{item.repo}</span>
                              </p>
                              <div className="text-[11px] font-[400] text-[var(--text-xlow)] tabular-nums mt-0.5 leading-[1.4]">
                                {item.time}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Mini Grafana-style Chart Card */}
                      <div className="mx-[16px] mt-4 mb-4 overflow-hidden">
                        <div className="bg-[#F8F7FC] border border-[#EEECF4] rounded-[8px] p-3">

                          {/* Chart Header */}
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-[500] tracking-[0.01em] leading-[1.4] text-[#7B7890]">Sentinel reviews</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-[600] leading-[1.3] text-[#15803D] tabular-nums px-1.5 py-0.5 rounded-[4px]" style={{ backgroundColor: 'rgba(21,128,61,0.08)' }}>↑ 12%</span>
                              <span className="font-['Inter_Tight'] text-[16px] font-[700] text-[var(--text-high)] tabular-nums leading-[1.1]">24</span>
                            </div>
                          </div>

                          <div className="h-[40px] w-full mb-[4px] opacity-80">
                            <LineSparkline data={[10, 20, 15, 35, 25, 45, 40]} color="var(--accent-violet)" showGrid={true} />
                          </div>
                          <div className="flex justify-between text-[9px] font-[400] text-[var(--text-xlow)] tabular-nums tracking-[0.02em] leading-[1.2]">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                </div>
              </div>

            </motion.div>
          </main>

          {/* Minimalist Footer */}
          <footer className="mt-auto border-t border-[var(--border-2)] px-8 py-[14px] flex items-center justify-between z-10">
            <span className="text-[11px] font-[400] text-[var(--text-xlow)]">© 2025 Velocis</span>
            <div className="flex items-center gap-6">
              <a href="#" className="text-[11px] font-[400] text-[var(--text-xlow)] hover:text-[var(--text-mid)] transition-colors">Docs</a>
              <a href="#" className="text-[11px] font-[400] text-[var(--text-xlow)] hover:text-[var(--text-mid)] transition-colors">Status</a>
              <a href="#" className="text-[11px] font-[400] text-[var(--text-xlow)] hover:text-[var(--text-mid)] transition-colors">Security</a>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
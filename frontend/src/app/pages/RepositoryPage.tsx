import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import {
  Bell, Search, CheckCircle, Shield, TestTube2, Eye, GitBranch,
  ChevronRight, Home, Activity, Settings, Webhook, Sliders,
  TrendingUp, AlertCircle, Cloud, Folder, FileText, Bot, Mail, Menu,
  Sun, Moon
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

const repositoryData: Record<string, any> = {
  "infrazero": {
    "name": "InfraZero",
    "status": "healthy",
    "statusColor": "#059669",
    "statusLabel": "System Healthy",
    "visibility": "Private",
    "language": "TypeScript",
    "lastScanned": "3 min ago",
    "size": "2.4M LOC",
    "metrics": {
      "riskScore": "Low",
      "testStability": "100%",
      "architectureDrift": "None detected",
      "lastAction": "2 minutes ago"
    },
    "sentinel": {
      "activePRs": 2,
      "lastUpdate": "5 minutes ago"
    },
    "fortress": {
      "status": "All pipelines passing",
      "lastRun": "10 minutes ago"
    },
    "cortex": {
      "lastUpdate": "2 minutes ago",
      "services": 42
    },
    "risks": {
      "critical": 0,
      "medium": 2,
      "low": 5
    }
  },
  "immersa": {
    "name": "Immersa",
    "status": "healthy",
    "statusColor": "#059669",
    "statusLabel": "System Healthy",
    "visibility": "Private",
    "language": "Python",
    "lastScanned": "5 min ago",
    "size": "1.8M LOC",
    "metrics": {
      "riskScore": "Low",
      "testStability": "98%",
      "architectureDrift": "None detected",
      "lastAction": "8 minutes ago"
    },
    "sentinel": {
      "activePRs": 1,
      "lastUpdate": "12 minutes ago"
    },
    "fortress": {
      "status": "All pipelines passing",
      "lastRun": "15 minutes ago"
    },
    "cortex": {
      "lastUpdate": "5 minutes ago",
      "services": 28
    },
    "risks": {
      "critical": 0,
      "medium": 1,
      "low": 3
    }
  },
  "nexlayer": {
    "name": "Nexlayer",
    "status": "healthy",
    "statusColor": "#22c55e",
    "statusLabel": "System Healthy",
    "visibility": "Private",
    "language": "Go",
    "lastScanned": "4 min ago",
    "size": "1.2M LOC",
    "metrics": {
      "riskScore": "Low",
      "testStability": "100%",
      "architectureDrift": "None detected",
      "lastAction": "4 minutes ago"
    },
    "sentinel": {
      "activePRs": 0,
      "lastUpdate": "8 minutes ago"
    },
    "fortress": {
      "status": "All pipelines passing",
      "lastRun": "12 minutes ago"
    },
    "cortex": {
      "lastUpdate": "4 minutes ago",
      "services": 34
    },
    "risks": {
      "critical": 0,
      "medium": 0,
      "low": 2
    }
  },
  "databridge": {
    "name": "DataBridge",
    "status": "healthy",
    "statusColor": "#22c55e",
    "statusLabel": "System Healthy",
    "visibility": "Private",
    "language": "TypeScript",
    "lastScanned": "6 min ago",
    "size": "890K LOC",
    "metrics": {
      "riskScore": "Low",
      "testStability": "97%",
      "architectureDrift": "Minor — 1 stale endpoint",
      "lastAction": "6 minutes ago"
    },
    "sentinel": {
      "activePRs": 1,
      "lastUpdate": "10 minutes ago"
    },
    "fortress": {
      "status": "All pipelines passing",
      "lastRun": "18 minutes ago"
    },
    "cortex": {
      "lastUpdate": "6 minutes ago",
      "services": 21
    },
    "risks": {
      "critical": 0,
      "medium": 1,
      "low": 3
    }
  },
  "velocis-core": {
    "name": "velocis-core",
    "status": "warning",
    "statusColor": "#D97706",
    "statusLabel": "Minor Risks",
    "visibility": "Private",
    "language": "TypeScript",
    "lastScanned": "1 min ago",
    "size": "3.2M LOC",
    "metrics": {
      "riskScore": "Medium",
      "testStability": "94%",
      "architectureDrift": "Minor changes detected",
      "lastAction": "1 minute ago"
    },
    "sentinel": {
      "activePRs": 3,
      "lastUpdate": "2 minutes ago"
    },
    "fortress": {
      "status": "2 flaky tests detected",
      "lastRun": "3 minutes ago"
    },
    "cortex": {
      "lastUpdate": "1 minute ago",
      "services": 58
    },
    "risks": {
      "critical": 0,
      "medium": 4,
      "low": 8
    }
  },
  "ai-observatory": {
    "name": "ai-observatory",
    "status": "healthy",
    "statusColor": "#059669",
    "statusLabel": "System Healthy",
    "visibility": "Public",
    "language": "JavaScript",
    "lastScanned": "10 min ago",
    "size": "980K LOC",
    "metrics": {
      "riskScore": "Low",
      "testStability": "100%",
      "architectureDrift": "None detected",
      "lastAction": "15 minutes ago"
    },
    "sentinel": {
      "activePRs": 0,
      "lastUpdate": "20 minutes ago"
    },
    "fortress": {
      "status": "All pipelines passing",
      "lastRun": "25 minutes ago"
    },
    "cortex": {
      "lastUpdate": "10 minutes ago",
      "services": 18
    },
    "risks": {
      "critical": 0,
      "medium": 0,
      "low": 2
    }
  }
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

const PreviewBadge = ({ text, color, label }: { text: string; color: string; label: string }) => (
  <div style={{ position: 'absolute', top: 12, right: 12, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 8px', borderRadius: '6px', background: `${color}15`, border: `1px solid ${color}25`, color: color, display: 'flex', alignItems: 'center', gap: '4px' }}>
    {text === 'LIVE' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }} />}
    {text}
  </div>
);

const Card1Preview = () => {
  const r = 45;
  const angles = [0, 60, 120, 180, 240, 300];
  const nodes = angles.map((a, i) => ({
    x: 140 + r * Math.cos(a * Math.PI / 180),
    y: 60 + r * Math.sin(a * Math.PI / 180),
    angle: a,
    index: i
  }));
  const outerNodes = [0, 120, 240].map((a, i) => {
    const parent = nodes.find(n => n.angle === a)!;
    return {
      x: parent.x + 22 * Math.cos(a * Math.PI / 180),
      y: parent.y + 22 * Math.sin(a * Math.PI / 180),
      parent,
      index: i + 6
    }
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>
      <PreviewBadge text="LIVE" label="LIVE" color="#34D399" />
      <svg viewBox="0 0 280 120" style={{ width: '100%', height: '100%' }}>
        <g stroke="rgba(52,211,153,0.25)" strokeWidth="1">
          {nodes.map((n, i) => <line key={`c-${i}`} x1={140} y1={60} x2={n.x} y2={n.y} />)}
          <line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[1].x} y2={nodes[1].y} />
          <line x1={nodes[2].x} y1={nodes[2].y} x2={nodes[3].x} y2={nodes[3].y} />
          <line x1={nodes[4].x} y1={nodes[4].y} x2={nodes[5].x} y2={nodes[5].y} />
          {outerNodes.map((n, i) => <line key={`o-${i}`} x1={n.x} y1={n.y} x2={n.parent.x} y2={n.parent.y} />)}
        </g>
        {nodes.map((n, i) => (
          <motion.circle key={`n-${i}`} cx={n.x} cy={n.y} r="6" fill="#34D399" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: n.index * 0.3 }} />
        ))}
        {outerNodes.map((n, i) => (
          <motion.circle key={`on-${i}`} cx={n.x} cy={n.y} r="4" fill="#34D399" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: n.index * 0.3 }} />
        ))}
        <motion.circle cx={140} cy={60} fill="#34D399" opacity="1" animate={{ r: [10, 13, 10] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      </svg>
    </div>
  );
};

const prData = [
  { label: "PR #478", risk: 15, color: "#34D399" },
  { label: "PR #479", risk: 62, color: "#EAB308" },
  { label: "PR #480", risk: 8, color: "#34D399" },
  { label: "PR #481", risk: 44, color: "#EAB308" },
  { label: "PR #482", risk: 91, color: "#EF4444" },
  { label: "PR #483", risk: 27, color: "#34D399" },
];

const Card2Preview = () => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>
      <PreviewBadge text="ACTIVE" label="ACTIVE" color="#60A5FA" />
      <svg viewBox="0 0 280 110" style={{ width: '100%', height: '100%' }}>
        {prData.map((d, i) => {
          const y = 12 + i * 16;
          const barWidth = (d.risk / 100) * 220;
          return (
            <g key={i}>
              <text x={30} y={y + 7.5} fontSize={8} fontFamily="'Inter', sans-serif" fontWeight={500} fill="rgba(255,255,255,0.40)" textAnchor="end">{d.label}</text>
              <rect x={35} y={y} width={220} height={10} rx={5} fill="rgba(255,255,255,0.06)" />
              <motion.rect x={35} y={y} height={10} rx={5} fill={d.color} initial={{ width: 0 }} animate={{ width: barWidth }} transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }} />
              <text x={35 + barWidth + 4} y={y + 7.5} fontSize={8} fontFamily="'Inter', sans-serif" fontWeight={500} fill={d.color} textAnchor="start">{d.risk}%</text>
            </g>
          )
        })}
      </svg>
    </div>
  );
};

const qaData = [94, 97, 95, 100, 98, 92, 96, 100, 99, 95, 98, 100, 97, 100];

const Card3Preview = () => {
  const getX = (i: number) => i * (240 / 13) + 20;
  const getY = (val: number) => 90 - ((val - 90) / 10) * 80;
  const [pathLen, setPathLen] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  const getSmoothLine = () => {
    let d = `M ${getX(0)} ${getY(qaData[0])}`;
    for (let i = 0; i < qaData.length - 1; i++) {
      const x0 = getX(i); const y0 = getY(qaData[i]);
      const x1 = getX(i + 1); const y1 = getY(qaData[i + 1]);
      const xMid = (x0 + x1) / 2;
      d += ` C ${xMid} ${y0}, ${xMid} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const lineStr = getSmoothLine();
  const areaD = lineStr + ` L ${getX(13)} 90 L ${getX(0)} 90 Z`;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>
      <PreviewBadge text="PASSING" label="PASSING" color="#2563EB" />
      <svg viewBox="0 0 280 110" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="qaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(37,99,235,0.15)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0)" />
          </linearGradient>
        </defs>
        {[90, 95, 100].map((val) => (
          <g key={val}>
            <line x1={20} y1={getY(val)} x2={260} y2={getY(val)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={15} y={getY(val) + 3} fontSize={8} fontFamily="'Inter', sans-serif" fontWeight={500} fill="rgba(255,255,255,0.30)" textAnchor="end">{val}%</text>
          </g>
        ))}
        {days.map((day, i) => (
          <text key={i} x={20 + i * (240 / 6)} y={105} fontSize={8} fontFamily="'Inter', sans-serif" fontWeight={500} fill="rgba(255,255,255,0.30)" textAnchor="middle">{day}</text>
        ))}
        <motion.path d={areaD} fill="url(#qaGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }} />
        <path ref={pathRef} d={lineStr} fill="none" stroke="none" />
        {pathLen > 0 && <motion.path d={lineStr} fill="none" stroke="#2563EB" strokeWidth={2} initial={{ strokeDasharray: pathLen, strokeDashoffset: pathLen }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.4, ease: "easeInOut" }} />}
        {qaData.map((d, i) => {
          const isCurrent = i === 13;
          return (
            <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
              <motion.circle cx={getX(i)} cy={getY(d)} r={isCurrent ? 5 : 3} fill="#2563EB" stroke="rgba(10,14,26,1)" strokeWidth={1.5} animate={isCurrent ? { scale: [1, 1.5, 1] } : undefined} transition={isCurrent ? { duration: 1.5, repeat: Infinity } : undefined} style={{ cursor: 'pointer' }} />
              {hoveredIndex === i && <text x={getX(i)} y={getY(d) - 8} fontSize={10} fontFamily="'Inter', sans-serif" fontWeight={500} fill="#FFFFFF" textAnchor="middle">{d}%</text>}
            </g>
          )
        })}
      </svg>
    </div>
  );
};

const costData = [
  { label: "Compute", value: 42, color: "#D97706" },
  { label: "Storage", value: 28, color: "#F59E0B" },
  { label: "Network", value: 18, color: "#FCD34D" },
  { label: "Other", value: 12, color: "#FEF3C7" },
];

const Card4Preview = () => {
  let startAngle = -Math.PI / 2;
  const gap = 2 * (Math.PI / 180);
  const arcs = costData.map((d, i) => {
    const angle = (d.value / 100) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const end = endAngle - gap;
    const outerR = 42; const innerR = 28;
    const cx = 70; const cy = 55;
    const largeArcFlag = end - startAngle > Math.PI ? 1 : 0;
    const x1 = cx + outerR * Math.cos(startAngle); const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(end); const y2 = cy + outerR * Math.sin(end);
    const x3 = cx + innerR * Math.cos(end); const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(startAngle); const y4 = cy + innerR * Math.sin(startAngle);
    const pathD = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
    const arcData = { pathD, color: d.color, label: d.label, value: d.value };
    startAngle = endAngle;
    return arcData;
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>
      <PreviewBadge text="ESTIMATED" label="ESTIMATED" color="#D97706" />
      <svg viewBox="0 0 280 110" style={{ width: '100%', height: '100%' }}>
        <defs>
          <clipPath id="donutClip">
            <motion.circle cx={70} cy={55} r={45} fill="none" stroke="black" strokeWidth={100} strokeDasharray={2 * Math.PI * 45} initial={{ strokeDashoffset: 2 * Math.PI * 45 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.5, ease: "easeOut" }} />
          </clipPath>
        </defs>
        <g clipPath="url(#donutClip)">
          {arcs.map((arc, i) => <motion.path key={i} d={arc.pathD} fill={arc.color} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15, duration: 0.4 }} />)}
        </g>
        <text x={70} y={58} fontSize={13} fontWeight={600} fontFamily="'Inter', sans-serif" fill="#FFFFFF" textAnchor="middle">$2.4k</text>
        <text x={70} y={72} fontSize={8} fontWeight={500} fontFamily="'Inter', sans-serif" fill="rgba(255,255,255,0.40)" textAnchor="middle">/ month</text>
        {costData.map((d, i) => {
          const y = 18 + i * 20;
          return (
            <g key={i}>
              <rect x={145} y={y} width={8} height={8} rx={2} fill={d.color} />
              <text x={160} y={y + 7.5} fontSize={9} fontFamily="'Inter', sans-serif" fontWeight={500} fill="#FFFFFF">{d.label}</text>
              <text x={240} y={y + 7.5} fontSize={9} fontFamily="'Inter', sans-serif" fontWeight={500} fill="rgba(255,255,255,0.60)" textAnchor="end">{d.value}%</text>
            </g>
          )
        })}
      </svg>
    </div>
  );
};

export function RepositoryPage() {
  const { id = 'infrazero' } = useParams();
  const navigate = useNavigate();
  const repo = repositoryData[id] || repositoryData['infrazero'];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const themeClass = isDarkMode ? 'dark' : '';

  const criticalPct = Math.round((repo.risks.critical / (repo.risks.critical + repo.risks.medium + repo.risks.low)) * 100) || 0;
  const mediumPct = Math.round((repo.risks.medium / (repo.risks.critical + repo.risks.medium + repo.risks.low)) * 100) || 0;
  const lowPct = Math.round((repo.risks.low / (repo.risks.critical + repo.risks.medium + repo.risks.low)) * 100) || 0;
  const totalRisks = repo.risks.critical + repo.risks.medium + repo.risks.low;

  const triAgentCards = [
    {
      title: "Launch Visual Cortex",
      description: "Spin up a full preview environment with live trace data attached.",
      icon: Eye,
      accentBg: "rgba(52, 211, 153, 0.1)",
      accentColor: "#34D399",
      action: () => navigate('/cortex'),
      cta: "Visual Cortex"
    },
    {
      title: "Enter Workspace",
      description: "Review current open risk items directly inside the code flow.",
      icon: FileText,
      accentBg: "rgba(124, 58, 237, 0.1)",
      accentColor: "#7C3AED",
      action: () => navigate('/workspace'),
      cta: "Workspace"
    },
    {
      title: "QA Pipeline Data",
      description: "View current build history, test suites, and performance metrics.",
      icon: TestTube2,
      accentBg: "rgba(37, 99, 235, 0.1)",
      accentColor: "#2563EB",
      action: () => navigate('/pipeline'),
      cta: "QA Pipeline"
    },
    {
      title: "Infrastructure View",
      description: "AWS status, resource load, and live cost tracking tools.",
      icon: Cloud,
      accentBg: "rgba(217, 119, 6, 0.1)",
      accentColor: "#D97706",
      action: () => navigate('/infrastructure'),
      cta: "Infrastructure"
    }
  ];

  const activityItems = [
    { agent: "SENTINEL", icon: Shield, time: "2 min ago", text: "Flagged potential race condition in worker/pool.go during PR scan.", color: "#7C3AED" },
    { agent: "FORTRESS", icon: Shield, time: "15 min ago", text: "Quarantined 3 flaky end-to-end tests affecting stability score.", color: "#2563EB" },
    { agent: "CORTEX", icon: Cloud, time: "1 hr ago", text: "Auto-scaled cluster capacity ahead of predicted traffic spike.", color: "#34D399" },
    { agent: "SENTINEL", icon: Bot, time: "3 hrs ago", text: "Created documentation PR for newly discovered endpoints.", color: "#7C3AED" },
    { agent: "FORTRESS", icon: Home, time: "Yesterday", text: "Successfully rolled back deployment v2.1.4 due to memory leak.", color: "#2563EB" }
  ];

  const getAgentBtnColor = (cta: string) => {
    if (cta === 'Visual Cortex') return { background: '#34D399', color: '#000000' };
    if (cta === 'Workspace') return { background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#FFFFFF' };
    if (cta === 'QA Pipeline') return { background: '#2563EB', color: '#FFFFFF' };
    return { background: 'linear-gradient(135deg, #D97706, #B45309)', color: '#FFFFFF' };
  };

  return (
    <div className={`${themeClass} w-full min-h-screen`}>
      <style>{`
            @keyframes custom-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
            @keyframes ping-slow { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.4); opacity: 0; } }
        `}</style>

      <div className="min-h-screen flex flex-col font-['Geist_Sans',_'Inter',_sans-serif] bg-zinc-50 dark:bg-[#010308] text-zinc-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">

        {/* Dark Mode Overlays matching Workspace/Dashboard */}
        {isDarkMode && (
          <>
            <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(30,41,59,1)_0%,_rgba(15,23,42,1)_100%)] opacity-80 mix-blend-multiply" />
            <div className="fixed z-0 pointer-events-none w-[70vw] h-[70vh] -top-[20vh] -left-[10vw] bg-[radial-gradient(ellipse,_rgba(29,78,216,0.12)_0%,_transparent_65%)] blur-[40px]" />
            <div className="fixed z-0 pointer-events-none w-[50vw] h-[50vh] -bottom-[10vh] -right-[10vw] bg-[radial-gradient(ellipse,_rgba(5,150,105,0.09)_0%,_transparent_65%)] blur-[40px]" />
            <div className="fixed z-0 pointer-events-none w-[40vw] h-[40vh] top-[30vh] left-[35vw] bg-[radial-gradient(ellipse,_rgba(109,40,217,0.06)_0%,_transparent_65%)] blur-[60px]" />
            <div className="fixed inset-0 pointer-events-none z-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
            <div
              className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                mixBlendMode: 'overlay'
              }}
            />
          </>
        )}

        {/* NAVBAR */}
        <div className="flex-none z-50 border-b border-zinc-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl transition-colors duration-300 sticky top-0 px-6 h-[60px] flex items-center justify-between">
          {/* L */}
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 dark:bg-slate-800 shadow-sm border border-zinc-700 dark:border-slate-700 text-white font-bold text-sm">V</div>
            <div className="flex items-center gap-2 text-sm ml-2">
              <span className="text-zinc-500 dark:text-slate-400 cursor-pointer hover:text-zinc-800 dark:hover:text-slate-200 transition-colors" onClick={() => navigate('/dashboard')}>Dashboard</span>
              <span className="text-zinc-300 dark:text-slate-700">/</span>
              <span className="font-semibold text-zinc-900 dark:text-slate-100">{repo.name}</span>
            </div>
          </div>

          {/* R */}
          <div className="flex items-center gap-3 ml-auto">
            <button className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800/50 border border-zinc-200 dark:border-slate-700/50 shadow-sm flex items-center justify-center relative cursor-pointer hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors">
              <Bell size={16} className="text-zinc-400 dark:text-slate-500" />
              <div className="absolute -top-1 -right-1 w-[8px] h-[8px] bg-red-500 rounded-full border-2 border-white dark:border-[#010308]" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
              <div className="w-[7px] h-[7px] rounded-full bg-emerald-500 animate-[custom-pulse_2s_infinite]" />
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">GitHub Sync</div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 ml-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-100"
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <div className="relative ml-1">
              <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full" />
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 relative shadow-sm cursor-pointer hover:scale-105 transition-transform text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                R
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="w-full flex-1 flex flex-col min-h-0">
          <div className="p-6 md:p-8 lg:p-10 relative z-10 max-w-[1200px] mx-auto w-full flex-1">

            {/* REPO HEADER */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <h1 className="text-4xl md:text-5xl font-['JetBrains_Mono',_monospace] font-bold text-zinc-900 dark:text-white tracking-tight">{repo.name}</h1>
                <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30 flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[custom-pulse_2s_infinite]" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{repo.statusLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-8 text-xs font-medium text-zinc-500 dark:text-slate-400 flex-wrap">
                {[repo.visibility, repo.language, repo.size].map((txt, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-zinc-300 dark:text-slate-600 text-[10px]">•</span>}
                    <div className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-slate-800/50 border border-zinc-200 dark:border-slate-700/50 text-zinc-600 dark:text-slate-300">{txt}</div>
                  </React.Fragment>
                ))}
                <span className="text-zinc-300 dark:text-slate-600 text-[10px]">•</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>Scanned {repo.lastScanned}</span>
              </div>
            </div>

            {/* KPI STRIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {[
                { val: repo.metrics.riskScore, lbl: 'PR RISK SCORE', acc: 'from-amber-400 to-amber-600', txt: 'text-amber-500 dark:text-amber-400', icn: TrendingUp },
                { val: repo.metrics.testStability, lbl: 'TEST STABILITY', acc: 'from-emerald-400 to-emerald-600', txt: 'text-emerald-500 dark:text-emerald-400', icn: TestTube2 },
                { val: repo.metrics.architectureDrift, lbl: 'ARCH DRIFT', acc: 'from-blue-400 to-blue-600', txt: 'text-blue-500 dark:text-blue-400', icn: Activity },
                { val: repo.metrics.lastAction, lbl: 'LAST AUTO ACTION', acc: 'from-purple-400 to-purple-600', txt: 'text-purple-500 dark:text-purple-400', icn: CheckCircle }
              ].map((kpi, i) => (
                <div key={i} className="group relative bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 backdrop-blur-2xl rounded-2xl p-6 overflow-hidden flex flex-col justify-between shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 dark:hover:border-slate-700/80 hover:bg-white/90 dark:hover:bg-slate-800/80">
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${kpi.acc} opacity-80`} />
                  <kpi.icn className={`w-5 h-5 mb-2 ${kpi.txt}`} />
                  <div>
                    <div className="text-2xl font-['JetBrains_Mono',_monospace] font-bold text-zinc-900 dark:text-white mb-1 tracking-tight truncate">{kpi.val}</div>
                    <div className="text-[10px] font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-widest">{kpi.lbl}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* AGENT COMMAND CENTER */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                <h2 className="text-xs font-['JetBrains_Mono',_monospace] font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-widest">AGENT COMMAND CENTER</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {triAgentCards.map((card, idx) => (
                  <div key={idx} onClick={card.action} className="group cursor-pointer bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 backdrop-blur-2xl shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 dark:hover:border-slate-700/80 hover:bg-white/90 dark:hover:bg-slate-800/80 hover:shadow-md grid grid-cols-1 sm:grid-cols-2">

                    <div className="p-6 flex flex-col">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${card.accentColor}15`, border: `1px solid ${card.accentColor}30` }}>
                        <card.icon className="w-[18px] h-[18px]" style={{ color: card.accentColor }} />
                      </div>
                      <div className="text-lg font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">{card.title}</div>
                      <div className="text-[13px] leading-relaxed text-zinc-500 dark:text-slate-400 mb-6 flex-1">{card.description}</div>
                      <button
                        className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center gap-2 w-fit border border-transparent hover:gap-3"
                        style={getAgentBtnColor(card.cta)}
                      >
                        {card.cta} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="bg-zinc-50/50 dark:bg-slate-800/20 border-t sm:border-t-0 sm:border-l border-zinc-200/50 dark:border-slate-700/30 p-4 flex flex-col relative min-h-[160px]">
                      {idx === 0 && <Card1Preview />}
                      {idx === 1 && <Card2Preview />}
                      {idx === 2 && <Card3Preview />}
                      {idx === 3 && <Card4Preview />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REPOSITORY ACTIVITY / RISK OVERVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mb-8">

              <div className="bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 rounded-2xl p-6 backdrop-blur-2xl shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-5">
                  <div className="text-[15px] font-bold text-zinc-900 dark:text-white tracking-tight">Repository Activity</div>
                  <div className="text-[11px] font-medium text-zinc-400 dark:text-slate-500">30 Days</div>
                </div>
                <div className="flex-1 relative">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-[140px] overflow-visible">
                    <defs>
                      <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(96,165,250,0.15)" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,40 L 0,35 Q 10,25 20,30 T 40,10 T 60,20 T 80,5 T 100,15 L 100,40 Z" fill="url(#blueGlow)" />
                    <motion.path
                      d="M 0,35 Q 10,25 20,30 T 40,10 T 60,20 T 80,5 T 100,15" fill="none" stroke="#60A5FA" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 2.5, ease: "easeOut" }}
                    />
                    {[{ x: 0, y: 35 }, { x: 20, y: 30 }, { x: 40, y: 10 }, { x: 60, y: 20 }, { x: 80, y: 5 }, { x: 100, y: 15 }].map((pt, i) => (
                      <motion.circle
                        key={i} cx={pt.x} cy={pt.y} r="2" className="fill-blue-400 stroke-white dark:stroke-slate-900 stroke-[0.8px]"
                        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 + i * 0.2 }}
                      />
                    ))}
                  </svg>
                  <div className="absolute -bottom-2.5 left-0 right-0 flex justify-between text-[10px] font-semibold text-zinc-400 dark:text-slate-500">
                    <span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 rounded-2xl p-6 backdrop-blur-2xl shadow-sm">
                <div className="text-[15px] font-bold text-zinc-900 dark:text-white tracking-tight mb-5">Risk Overview</div>
                <div className="flex items-center gap-6 py-2">
                  <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(#EF4444 0% ${criticalPct}%, #EAB308 ${criticalPct}% ${criticalPct + mediumPct}%, rgba(156, 163, 175, 0.2) ${criticalPct + mediumPct}% 100%)` }}>
                    <div className="absolute inset-2 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-sm">
                      <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none"><AnimatedCounter value={totalRisks} /></div>
                      <div className="text-[10px] font-bold text-zinc-400 dark:text-slate-500 mt-0.5">TOTAL</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3.5 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="text-[11px] text-zinc-500 dark:text-slate-400 font-medium">Critical</div>
                      </div>
                      <div className="text-[22px] font-black text-zinc-900 dark:text-white leading-none"><AnimatedCounter value={repo.risks.critical} /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <div className="text-[11px] text-zinc-500 dark:text-slate-400 font-medium">Medium</div>
                      </div>
                      <div className="text-[22px] font-black text-zinc-900 dark:text-white leading-none"><AnimatedCounter value={repo.risks.medium} /></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-slate-700" />
                        <div className="text-[11px] text-zinc-500 dark:text-slate-400 font-medium">Low</div>
                      </div>
                      <div className="text-[22px] font-black text-zinc-900 dark:text-white leading-none"><AnimatedCounter value={repo.risks.low} /></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RECENT AUTONOMOUS ACTIVITY */}
            <div className="bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden mb-8 backdrop-blur-2xl shadow-sm">
              <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-white/5 text-[15px] font-bold text-zinc-900 dark:text-white tracking-tight">Recent Autonomous Activity</div>
              {activityItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3.5 px-5 py-3.5 transition-colors duration-150 hover:bg-zinc-50/80 dark:hover:bg-white/5 ${i === activityItems.length - 1 ? '' : 'border-b border-zinc-200/40 dark:border-white/5'}`}
                >
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                    <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  </div>
                  <div className="flex flex-col flex-1 gap-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: item.color }}>{item.agent}</div>
                    <div className="text-[13px] leading-relaxed text-zinc-600 dark:text-slate-300 font-medium">{item.text}</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-zinc-100/80 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 text-[11px] font-medium text-zinc-500 dark:text-slate-400 self-center shrink-0">
                    {item.time}
                  </div>
                </div>
              ))}
            </div>

            {/* BOTTOM TOOL CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {[
                { icon: Settings, label: 'Repository Settings', sub: 'Manage integrations & tokens' },
                { icon: Webhook, label: 'Webhook Status', sub: '3 active endpoints' },
                { icon: Sliders, label: 'Agent Configuration', sub: 'Rules & thresholds' }
              ].map((tool, i) => (
                <div
                  key={i}
                  className="bg-white/70 dark:bg-slate-900/60 border border-zinc-200/60 dark:border-slate-800/80 rounded-[14px] p-[18px_20px] flex items-center gap-3.5 cursor-pointer backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-slate-800/80 hover:border-zinc-300 dark:hover:border-slate-700/80 hover:shadow-sm group"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700/50 flex flex-shrink-0 items-center justify-center transition-colors group-hover:bg-indigo-100/50 dark:group-hover:bg-slate-700">
                    <tool.icon className="w-4 h-4 text-indigo-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">{tool.label}</div>
                    <div className="text-xs text-zinc-500 dark:text-slate-400 mt-0.5">{tool.sub}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-slate-500 transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>

            {/* FOOTER */}
            <div className="py-5 border-t border-zinc-200 dark:border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs text-zinc-400 dark:text-slate-500">© 2026 Velocis Technologies</div>
              <div className="flex gap-5">
                {['Docs', 'Security', 'System Status'].map(link => (
                  <span
                    key={link}
                    className="text-xs text-zinc-500 dark:text-slate-400 cursor-pointer transition-colors hover:text-zinc-800 dark:hover:text-white"
                  >
                    {link}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

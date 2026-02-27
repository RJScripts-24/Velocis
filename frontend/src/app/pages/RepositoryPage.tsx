import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import {
  Bell, Search, CheckCircle, Shield, TestTube2, Eye, GitBranch,
  ChevronRight, Home, Activity, Settings, Webhook, Sliders,
  TrendingUp, AlertCircle, Cloud, Folder, FileText, Bot, Mail, Menu
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
      action: () => navigate(`/repo/${id}/cortex`),
      cta: "Visual Cortex"
    },
    {
      title: "Enter Workspace",
      description: "Review current open risk items directly inside the code flow.",
      icon: FileText,
      accentBg: "rgba(124, 58, 237, 0.1)",
      accentColor: "#7C3AED",
      action: () => navigate(`/repo/${id}/workspace`),
      cta: "Workspace"
    },
    {
      title: "QA Pipeline Data",
      description: "View current build history, test suites, and performance metrics.",
      icon: TestTube2,
      accentBg: "rgba(37, 99, 235, 0.1)",
      accentColor: "#2563EB",
      action: () => navigate(`/repo/${id}/pipeline`),
      cta: "QA Pipeline"
    },
    {
      title: "Infrastructure View",
      description: "AWS status, resource load, and live cost tracking tools.",
      icon: Cloud,
      accentBg: "rgba(217, 119, 6, 0.1)",
      accentColor: "#D97706",
      action: () => navigate(`/repo/${id}/infrastructure`),
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
    if (cta === 'Visual Cortex') return { bg: '#34D399', text: '#000000' };
    if (cta === 'Workspace') return { bg: 'linear-gradient(135deg, #7C3AED, #4F46E5)', text: '#FFFFFF' };
    if (cta === 'QA Pipeline') return { bg: '#2563EB', text: '#FFFFFF' };
    return { bg: 'linear-gradient(135deg, #D97706, #B45309)', text: '#FFFFFF' };
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #060914 0%, #0a0e1a 50%, #06080f 100%)', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", color: '#FFFFFF', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            *, *::before, *::after { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
            @keyframes ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.4); opacity: 0; } }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>

      {/* FIXED AMBIENT GLOW LAYERS */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 60% at 10% 15%, rgba(29,78,216,0.13) 0%, transparent 65%)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 50% at 90% 85%, rgba(5,150,105,0.09) 0%, transparent 65%)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 40% 40% at 50% 40%, rgba(109,40,217,0.06) 0%, transparent 65%)' }} />

      {/* NAVBAR */}
      <div style={{ height: '56px', background: 'rgba(6,9,20,0.82)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(99,155,255,0.08)', boxShadow: '0 1px 0 rgba(255,255,255,0.03)', position: 'sticky', top: 0, zIndex: 100, padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* L */}
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #3B82F6, #6D28D9)', color: '#FFFFFF', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>V</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
          <span style={{ color: 'rgba(255,255,255,0.20)' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{repo.name}</span>
        </div>

        {/* R */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <button style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}>
            <Bell size={16} color="rgba(255,255,255,0.50)" />
            <div style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, background: '#EF4444', borderRadius: '50%', border: '2px solid rgba(6,9,20,0.82)' }} />
          </button>
          <div style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.22)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', animation: 'pulse 2s infinite' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#34D399' }}>GitHub Sync</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6D28D9, #4F46E5)', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', marginLeft: 4 }}>
            R
          </div>
        </div>
      </div>

      {/* LEFT SIDEBAR */}
      <div style={{ width: '48px', position: 'fixed', left: 0, top: '56px', bottom: 0, zIndex: 90, background: 'rgba(6,9,20,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRight: '1px solid rgba(99,155,255,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 4 }}>
        {[Search, FileText, CheckCircle, Shield, Bot, Mail].map((Icon, i) => (
          <button key={i} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: i === 1 ? 'rgba(99,155,255,0.15)' : 'transparent', border: i === 1 ? '1px solid rgba(99,155,255,0.20)' : 'none', transition: 'all 0.2s ease' }} onMouseEnter={e => { if (i !== 1) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }} onMouseLeave={e => { if (i !== 1) e.currentTarget.style.background = 'transparent' }}>
            <Icon size={18} color={i === 1 ? '#60A5FA' : 'rgba(255,255,255,0.30)'} />
          </button>
        ))}
        <button style={{ marginTop: 'auto', marginBottom: 16, width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Settings size={18} color="rgba(255,255,255,0.30)" />
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ marginLeft: '48px', padding: '32px 32px 48px 32px', position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto 0 48px' }}>

        {/* REPO HEADER */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-2px', lineHeight: 1.05, margin: '0 0 12px 0' }}>{repo.name}</h1>
            <div style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.22)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{repo.statusLabel}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            {[repo.visibility, repo.language, repo.size].map((txt, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.20)', fontSize: 10 }}>•</span>}
                <div style={{ padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.50)' }}>{txt}</div>
              </React.Fragment>
            ))}
            <span style={{ color: 'rgba(255,255,255,0.20)', fontSize: 10 }}>•</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>Scanned {repo.lastScanned}</span>
          </div>
        </div>

        {/* KPI STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 40 }}>
          {[
            { val: repo.metrics.riskScore, lbl: 'PR RISK SCORE', acc: '#EAB308', icn: TrendingUp },
            { val: repo.metrics.testStability, lbl: 'TEST STABILITY', acc: '#34D399', icn: TestTube2 },
            { val: repo.metrics.architectureDrift, lbl: 'ARCH DRIFT', acc: '#60A5FA', icn: Activity },
            { val: repo.metrics.lastAction, lbl: 'LAST AUTO ACTION', acc: '#7C3AED', icn: CheckCircle }
          ].map((kpi, i) => (
            <div key={i} style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: 14, padding: '20px 22px', backdropFilter: 'blur(20px) saturate(150%)', WebkitBackdropFilter: 'blur(20px) saturate(150%)', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)', transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,20,40,0.85)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.22)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,14,26,0.70)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.10)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '14px 14px 0 0', background: `linear-gradient(90deg, ${kpi.acc}, ${kpi.acc}60, transparent)` }} />
              <kpi.icn size={16} color={kpi.acc} />
              <div style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px', marginTop: 8, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.val}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.30)' }}>{kpi.lbl}</div>
            </div>
          ))}
        </div>

        {/* AGENT COMMAND CENTER */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg, #60A5FA, #7C3AED)' }} />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)' }}>AGENT COMMAND CENTER</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {triAgentCards.map((card, idx) => (
              <div key={idx} onClick={card.action} style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', transition: 'all 0.25s ease', display: 'grid', gridTemplateColumns: '1fr 1fr', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,20,40,0.85)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.22)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,14,26,0.70)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.10)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'; }}>

                <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${card.accentColor}15`, border: `1px solid ${card.accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <card.icon size={18} color={card.accentColor} />
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px', marginTop: 14, marginBottom: 8 }}>{card.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.50)', marginBottom: 20, flex: 1 }}>{card.description}</div>
                  <button style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 6, ...getAgentBtnColor(card.cta) }}>
                    {card.cta} <ChevronRight size={14} />
                  </button>
                </div>

                <div style={{ background: `${card.accentColor}08`, borderLeft: '1px solid rgba(99,155,255,0.07)', padding: 16, display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 32 }}>

          <div style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>Repository Activity</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.30)' }}>30 Days</div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '140px', overflow: 'visible' }}>
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
                    key={i} cx={pt.x} cy={pt.y} r="2" fill="#60A5FA" stroke="rgba(6,9,20,0.82)" strokeWidth="0.8"
                    initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 + i * 0.2 }}
                  />
                ))}
              </svg>
              <div style={{ position: 'absolute', bottom: -10, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)' }}>
                <span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px', marginBottom: 20 }}>Risk Overview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 0' }}>
              <div style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', background: `conic-gradient(#EF4444 0% ${criticalPct}%, #EAB308 ${criticalPct}% ${criticalPct + mediumPct}%, rgba(255,255,255,0.15) ${criticalPct + mediumPct}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 8, background: 'rgba(10,14,26,0.95)', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}><AnimatedCounter value={totalRisks} /></div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>TOTAL</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Critical</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}><AnimatedCounter value={repo.risks.critical} /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EAB308' }} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Medium</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}><AnimatedCounter value={repo.risks.medium} /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.50)' }} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Low</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}><AnimatedCounter value={repo.risks.low} /></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RECENT AUTONOMOUS ACTIVITY */}
        <div style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: 16, overflow: 'hidden', marginBottom: 32, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>Recent Autonomous Activity</div>
          {activityItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 22px', borderBottom: i === activityItems.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${item.color}15`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <item.icon size={14} color={item.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: item.color }}>{item.agent}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.65)' }}>{item.text}</div>
              </div>
              <div style={{ padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.30)', alignSelf: 'center', flexShrink: 0 }}>{item.time}</div>
            </div>
          ))}
        </div>

        {/* BOTTOM TOOL CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { icon: Settings, label: 'Repository Settings', sub: 'Manage integrations & tokens' },
            { icon: Webhook, label: 'Webhook Status', sub: '3 active endpoints' },
            { icon: Sliders, label: 'Agent Configuration', sub: 'Rules & thresholds' }
          ].map((tool, i) => (
            <div key={i} style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.2s ease', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,20,40,0.85)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.22)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,14,26,0.70)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.10)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,155,255,0.08)', border: '1px solid rgba(99,155,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <tool.icon size={16} color="rgba(255,255,255,0.50)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{tool.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{tool.sub}</div>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.20)" />
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.20)' }}>© 2026 Velocis Technologies</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Docs', 'Security', 'System Status'].map(link => (
              <span key={link} style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.60)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>{link}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

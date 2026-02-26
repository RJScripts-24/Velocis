"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Bell, Search, CheckCircle, Shield, TestTube2, Eye, GitBranch,
  ChevronRight, Home, Activity, Settings, Webhook, Sliders,
  TrendingUp, AlertCircle, Cloud, Folder, FileText, Bot, Mail, Menu
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

// Mock repository data
const repositoryData: Record<string, any> = {
  'infrazero': {
    name: 'InfraZero',
    status: 'healthy',
    statusColor: '#059669',
    statusLabel: 'System Healthy',
    visibility: 'Private',
    language: 'TypeScript',
    lastScanned: '3 min ago',
    size: '2.4M LOC',
    metrics: { riskScore: 'Low', testStability: '100%', architectureDrift: 'None detected', lastAction: '2 minutes ago' },
    sentinel: { activePRs: 2, lastUpdate: '5 minutes ago' },
    fortress: { status: 'All pipelines passing', lastRun: '10 minutes ago' },
    cortex: { lastUpdate: '2 minutes ago', services: 42 },
    risks: { critical: 0, medium: 2, low: 5 }
  },
  'immersa': {
    name: 'Immersa',
    status: 'healthy',
    statusColor: '#059669',
    statusLabel: 'System Healthy',
    visibility: 'Private',
    language: 'Python',
    lastScanned: '5 min ago',
    size: '1.8M LOC',
    metrics: { riskScore: 'Low', testStability: '98%', architectureDrift: 'None detected', lastAction: '8 minutes ago' },
    sentinel: { activePRs: 1, lastUpdate: '12 minutes ago' },
    fortress: { status: 'All pipelines passing', lastRun: '15 minutes ago' },
    cortex: { lastUpdate: '5 minutes ago', services: 28 },
    risks: { critical: 0, medium: 1, low: 3 }
  },
  'nexlayer': {
    name: 'Nexlayer',
    status: 'healthy',
    statusColor: '#22c55e',
    statusLabel: 'System Healthy',
    visibility: 'Private',
    language: 'Go',
    lastScanned: '4 min ago',
    size: '1.2M LOC',
    metrics: {
      riskScore: 'Low',
      testStability: '100%',
      architectureDrift: 'None detected',
      lastAction: '4 minutes ago'
    },
    sentinel: {
      activePRs: 0,
      lastUpdate: '8 minutes ago'
    },
    fortress: {
      status: 'All pipelines passing',
      lastRun: '12 minutes ago'
    },
    cortex: {
      lastUpdate: '4 minutes ago',
      services: 34
    },
    risks: {
      critical: 0,
      medium: 0,
      low: 2
    }
  },
  'databridge': {
    name: 'DataBridge',
    status: 'healthy',
    statusColor: '#22c55e',
    statusLabel: 'System Healthy',
    visibility: 'Private',
    language: 'TypeScript',
    lastScanned: '6 min ago',
    size: '890K LOC',
    metrics: {
      riskScore: 'Low',
      testStability: '97%',
      architectureDrift: 'Minor — 1 stale endpoint',
      lastAction: '6 minutes ago'
    },
    sentinel: {
      activePRs: 1,
      lastUpdate: '10 minutes ago'
    },
    fortress: {
      status: 'All pipelines passing',
      lastRun: '18 minutes ago'
    },
    cortex: {
      lastUpdate: '6 minutes ago',
      services: 21
    },
    risks: {
      critical: 0,
      medium: 1,
      low: 3
    }
  },
  'velocis-core': {
    name: 'velocis-core',
    status: 'warning',
    statusColor: '#D97706',
    statusLabel: 'Minor Risks',
    visibility: 'Private',
    language: 'TypeScript',
    lastScanned: '1 min ago',
    size: '3.2M LOC',
    metrics: { riskScore: 'Medium', testStability: '94%', architectureDrift: 'Minor changes detected', lastAction: '1 minute ago' },
    sentinel: { activePRs: 3, lastUpdate: '2 minutes ago' },
    fortress: { status: '2 flaky tests detected', lastRun: '3 minutes ago' },
    cortex: { lastUpdate: '1 minute ago', services: 58 },
    risks: { critical: 0, medium: 4, low: 8 }
  },
  'ai-observatory': {
    name: 'ai-observatory',
    status: 'healthy',
    statusColor: '#059669',
    statusLabel: 'System Healthy',
    visibility: 'Public',
    language: 'JavaScript',
    lastScanned: '10 min ago',
    size: '980K LOC',
    metrics: { riskScore: 'Low', testStability: '100%', architectureDrift: 'None detected', lastAction: '15 minutes ago' },
    sentinel: { activePRs: 0, lastUpdate: '20 minutes ago' },
    fortress: { status: 'All pipelines passing', lastRun: '25 minutes ago' },
    cortex: { lastUpdate: '10 minutes ago', services: 18 },
    risks: { critical: 0, medium: 0, low: 2 }
  },
  'distributed-lab': {
    name: 'distributed-lab',
    status: 'attention',
    statusColor: '#EF4444',
    statusLabel: 'Attention Required',
    visibility: 'Private',
    language: 'Go',
    lastScanned: '2 min ago',
    size: '1.5M LOC',
    metrics: { riskScore: 'High', testStability: '85%', architectureDrift: 'Significant drift', lastAction: '30 seconds ago' },
    sentinel: { activePRs: 5, lastUpdate: '1 minute ago' },
    fortress: { status: '5 failing tests', lastRun: '2 minutes ago' },
    cortex: { lastUpdate: '3 minutes ago', services: 35 },
    risks: { critical: 2, medium: 6, low: 10 }
  },
  'test-sandbox': {
    name: 'test-sandbox',
    status: 'healthy',
    statusColor: '#059669',
    statusLabel: 'System Healthy',
    visibility: 'Public',
    language: 'Python',
    lastScanned: '4 min ago',
    size: '450K LOC',
    metrics: { riskScore: 'Low', testStability: '100%', architectureDrift: 'None detected', lastAction: '5 minutes ago' },
    sentinel: { activePRs: 4, lastUpdate: '3 minutes ago' },
    fortress: { status: 'All pipelines passing', lastRun: '8 minutes ago' },
    cortex: { lastUpdate: '4 minutes ago', services: 12 },
    risks: { critical: 0, medium: 1, low: 4 }
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
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

function AnimatedCounter({ value }: { value: number }) {
  const count = useCounter(value, 2000);
  return <>{count}</>;
}

const PreviewBadge = ({ text, color }: { text: string; color: string }) => (
  <div className="absolute top-[8px] right-[10px] flex items-center gap-[4px] z-20" style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif", fontWeight: 500, color }}>
    <motion.div style={{ width: '5px', height: '5px', borderRadius: '99px', background: color }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
    {text}
  </div>
);

const Card1Preview = ({ isDark }: { isDark: boolean }) => {
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
    <div className="w-full h-full relative" style={{ background: 'transparent' }}>
      <PreviewBadge text="LIVE" color="#059669" />
      <svg viewBox="0 0 280 120" style={{ width: '100%', height: '100%' }}>
        <g stroke={isDark ? "rgba(5,150,105,0.25)" : "rgba(5,150,105,0.15)"} strokeWidth="1">
          {nodes.map((n, i) => <line key={`c-${i}`} x1={140} y1={60} x2={n.x} y2={n.y} />)}
          <line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[1].x} y2={nodes[1].y} />
          <line x1={nodes[2].x} y1={nodes[2].y} x2={nodes[3].x} y2={nodes[3].y} />
          <line x1={nodes[4].x} y1={nodes[4].y} x2={nodes[5].x} y2={nodes[5].y} />
          {outerNodes.map((n, i) => <line key={`o-${i}`} x1={n.x} y1={n.y} x2={n.parent.x} y2={n.parent.y} />)}
        </g>
        {nodes.map((n, i) => (
          <motion.circle key={`n-${i}`} cx={n.x} cy={n.y} r="6" fill="#059669"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: n.index * 0.3 }}
          />
        ))}
        {outerNodes.map((n, i) => (
          <motion.circle key={`on-${i}`} cx={n.x} cy={n.y} r="4" fill="#059669"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: n.index * 0.3 }}
          />
        ))}
        <motion.circle cx={140} cy={60} fill="#059669" opacity="1"
          animate={{ r: [10, 13, 10] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
};

const prData = [
  { label: "PR #478", risk: 15, color: "#22c55e" },
  { label: "PR #479", risk: 62, color: "#eab308" },
  { label: "PR #480", risk: 8, color: "#22c55e" },
  { label: "PR #481", risk: 44, color: "#eab308" },
  { label: "PR #482", risk: 91, color: "#dc2626" },
  { label: "PR #483", risk: 27, color: "#22c55e" },
];

const Card2Preview = ({ isDark }: { isDark: boolean }) => {
  return (
    <div className="w-full h-full relative" style={{ background: 'transparent' }}>
      <PreviewBadge text="ACTIVE" color="#7C3AED" />
      <svg viewBox="0 0 280 110" style={{ width: '100%', height: '100%' }}>
        {prData.map((d, i) => {
          const y = 12 + i * 16;
          const barWidth = (d.risk / 100) * 220;
          return (
            <g key={i}>
              <text x={30} y={y + 7.5} fontSize={8} fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500} fill={isDark ? "#484F58" : "rgba(0,0,0,0.4)"} textAnchor="end">
                {d.label}
              </text>
              <rect x={35} y={y} width={220} height={10} rx={5} fill={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
              <motion.rect
                x={35} y={y} height={10} rx={5} fill={d.color}
                initial={{ width: 0 }}
                animate={{ width: barWidth }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
              />
              <text x={35 + barWidth + 4} y={y + 7.5} fontSize={8} fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500} fill={d.color} textAnchor="start">
                {d.risk}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  );
};

const qaData = [94, 97, 95, 100, 98, 92, 96, 100, 99, 95, 98, 100, 97, 100];

const Card3Preview = ({ isDark }: { isDark: boolean }) => {
  const getX = (i: number) => i * (240 / 13) + 20;
  const getY = (val: number) => 90 - ((val - 90) / 10) * 80;

  const [pathLen, setPathLen] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (pathRef.current) {
      setPathLen(pathRef.current.getTotalLength());
    }
  }, []);

  const getSmoothLine = () => {
    let d = `M ${getX(0)} ${getY(qaData[0])}`;
    for (let i = 0; i < qaData.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(qaData[i]);
      const x1 = getX(i + 1);
      const y1 = getY(qaData[i + 1]);
      const xMid = (x0 + x1) / 2;
      d += ` C ${xMid} ${y0}, ${xMid} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const lineStr = getSmoothLine();
  const areaD = lineStr + ` L ${getX(13)} 90 L ${getX(0)} 90 Z`;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="w-full h-full relative" style={{ background: 'transparent' }}>
      <PreviewBadge text="PASSING" color="#2563EB" />
      <svg viewBox="0 0 280 110" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="qaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(37,99,235,0.15)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0)" />
          </linearGradient>
        </defs>

        {[90, 95, 100].map((val) => (
          <g key={val}>
            <line x1={20} y1={getY(val)} x2={260} y2={getY(val)} stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} strokeWidth={1} strokeDasharray="4 4" />
            <text x={15} y={getY(val) + 3} fontSize={8} fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500} fill={isDark ? "#484F58" : "rgba(0,0,0,0.3)"} textAnchor="end">
              {val}%
            </text>
          </g>
        ))}

        {days.map((day, i) => (
          <text key={i} x={20 + i * (240 / 6)} y={105} fontSize={8} fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500} fill={isDark ? "#484F58" : "rgba(0,0,0,0.3)"} textAnchor="middle">
            {day}
          </text>
        ))}

        <motion.path d={areaD} fill="url(#qaGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }} />
        <path ref={pathRef} d={lineStr} fill="none" stroke="none" />

        {pathLen > 0 && (
          <motion.path
            d={lineStr} fill="none" stroke="#2563EB" strokeWidth={2}
            initial={{ strokeDasharray: pathLen, strokeDashoffset: pathLen }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
        )}

        {qaData.map((d, i) => {
          const isCurrent = i === 13;
          return (
            <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
              <motion.circle
                cx={getX(i)} cy={getY(d)} r={isCurrent ? 5 : 3} fill="#2563EB" stroke="white" strokeWidth={1.5}
                animate={isCurrent ? { scale: [1, 1.5, 1] } : undefined}
                transition={isCurrent ? { duration: 1.5, repeat: Infinity } : undefined}
                style={{ cursor: 'pointer' }}
              />
              {hoveredIndex === i && (
                <text x={getX(i)} y={getY(d) - 8} fontSize={10} fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500} fill={isDark ? "#F0F6FC" : "#141210"} textAnchor="middle">
                  {d}%
                </text>
              )}
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

const Card4Preview = ({ isDark }: { isDark: boolean }) => {
  let startAngle = -Math.PI / 2;
  const gap = 2 * (Math.PI / 180);

  const arcs = costData.map((d, i) => {
    const angle = (d.value / 100) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const end = endAngle - gap;
    const outerR = 42;
    const innerR = 28;
    const cx = 70;
    const cy = 55;

    const largeArcFlag = end - startAngle > Math.PI ? 1 : 0;
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(end);
    const y2 = cy + outerR * Math.sin(end);

    const x3 = cx + innerR * Math.cos(end);
    const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    const pathD = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

    const arcData = { pathD, color: d.color, label: d.label, value: d.value };
    startAngle = endAngle;
    return arcData;
  });

  return (
    <div className="w-full h-full relative" style={{ background: 'transparent' }}>
      <PreviewBadge text="ESTIMATED" color="#D97706" />
      <svg viewBox="0 0 280 110" style={{ width: '100%', height: '100%' }}>
        <defs>
          <clipPath id="donutClip">
            <motion.circle
              cx={70} cy={55} r={45} fill="none" stroke="black" strokeWidth={100}
              strokeDasharray={2 * Math.PI * 45}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </clipPath>
        </defs>

        <g clipPath="url(#donutClip)">
          {arcs.map((arc, i) => (
            <motion.path
              key={i} d={arc.pathD} fill={arc.color}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
            />
          ))}
        </g>

        <text x={70} y={58} fontSize={13} fontWeight={600} fontFamily="'Inter', sans-serif" fontStyle="normal" fill={isDark ? "#F0F6FC" : "#141210"} textAnchor="middle">$2.4k</text>
        <text x={70} y={72} fontSize={8} fontWeight={500} fontStyle="normal" fontFamily="'Inter', sans-serif" fill={isDark ? "#484F58" : "rgba(0,0,0,0.4)"} textAnchor="middle">/ month</text>

        {costData.map((d, i) => {
          const y = 18 + i * 20;
          return (
            <g key={i}>
              <rect x={145} y={y} width={8} height={8} rx={2} fill={d.color} />
              <text x={160} y={y + 7.5} fontSize={9} fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500} fill={isDark ? "#F0F6FC" : "#141210"}>{d.label}</text>
              <text x={240} y={y + 7.5} fontSize={9} fontFamily="'Inter', sans-serif" fontStyle="normal" fontWeight={500} fill="rgba(0,0,0,0.6)" textAnchor="end">{d.value}%</text>
            </g>
          )
        })}
      </svg>
    </div>
  );
};


const lightTheme = {
  // Backgrounds
  pageBg: "#F5F5F4",
  surface: "#FFFFFF",
  surfaceRaised: "#FAFAF9",
  surfaceHover: "#F5F5F4",

  // Borders
  border: "#E7E5E4",
  borderSubtle: "#F0EFED",
  borderHover: "#D6D3D1",

  // Text
  text1: "#1C1917",
  text2: "#78716C",
  text3: "#A8A29E",
  textPlaceholder: "#D6D3D1",

  // Navbar
  navBg: "rgba(245,245,244,0.78)",
  navBorder: "#E7E5E4",
  navBlur: "blur(12px) saturate(140%)",

  // Sidebar
  sidebarBg: "rgba(255,255,255,0.80)",
  sidebarBorder: "#E7E5E4",
  sidebarIcon: "#A8A29E",
  sidebarActive: "#F5F3FF",

  // KPI strip
  kpiBg: "rgba(255,255,255,0.78)",
  kpiBorder: "#E7E5E4",
  kpiDivider: "#E7E5E4",

  // Cards
  cardBg: "rgba(255,255,255,0.82)",
  cardBorder: "#E7E5E4",
  cardShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  cardShadowHover: "0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",

  // Timeline
  timelineRowHover: "#FAFAF9",

  // Tool cards
  toolBg: "#FFFFFF",
  toolBorder: "#E7E5E4",
  toolBgHover: "#FAFAF9",

  // Toggle button
  toggleBg: "#1C1917",
  toggleText: "#FFFFFF",
  toggleBorder: "transparent",

  // Footer
  footerBg: "#F5F5F4",
  footerBorder: "#E7E5E4",

  // Risk bar track
  riskTrack: "#F0EFED",

  // Logo
  logoBg: "#1C1917",
  logoText: "#FFFFFF",
};

const darkTheme = {
  // Backgrounds
  pageBg: "#010308",
  surface: "#0D1117",
  surfaceRaised: "#0D1117",
  surfaceHover: "#161B22",

  // Borders
  border: "#21262D",
  borderSubtle: "#161B22",
  borderHover: "#30363D",

  // Text
  text1: "#F0F6FC",
  text2: "#8B949E",
  text3: "#484F58",
  textPlaceholder: "#21262D",

  // Navbar
  navBg: "rgba(1,3,8,0.82)",
  navBorder: "#21262D",
  navBlur: "blur(12px) saturate(140%)",

  // Sidebar
  sidebarBg: "rgba(12,15,24,0.80)",
  sidebarBorder: "#21262D",
  sidebarIcon: "#484F58",
  sidebarActive: "#1A1F2E",

  // KPI strip
  kpiBg: "rgba(12,15,24,0.70)",
  kpiBorder: "#21262D",
  kpiDivider: "#21262D",

  // Cards
  cardBg: "rgba(12,15,24,0.75)",
  cardBorder: "#21262D",
  cardShadow: "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
  cardShadowHover: "0 4px 24px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",

  // Timeline
  timelineRowHover: "#161B22",

  // Tool cards
  toolBg: "#0D1117",
  toolBorder: "#21262D",
  toolBgHover: "#161B22",

  // Toggle button
  toggleBg: "#21262D",
  toggleText: "#F0F6FC",
  toggleBorder: "#30363D",

  // Footer
  footerBg: "#010308",
  footerBorder: "#21262D",

  // Risk bar track
  riskTrack: "#21262D",

  // Logo
  logoBg: "#F0F6FC",
  logoText: "#010308",
};

interface Star {
    x: number;
    y: number;
    z: number;
    radius: number;
    opacity: number;
    twinkleSpeed: number;
    twinkleOffset: number;
    color: string;
}

interface Nebula {
    x: number;
    y: number;
    radius: number;
    color: string;
    opacity: number;
}

function GalaxyBackground({ isDark }: { isDark: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const starsRef = useRef<Star[]>([]);
    const nebulaeRef = useRef<Nebula[]>([]);
    const timeRef = useRef<number>(0);

    const STAR_COLORS = [
        '#FFFFFF', '#EEF0FF', '#D4DBFF', '#C8D8FF',
        '#B3C8FF', '#A8D0FF', '#9ECEFF', '#FFE8D0',
    ];

    const NEBULA_COLORS_DARK = [
        'rgba(109,40,217,X)',
        'rgba(29,78,216,X)',
        'rgba(5,150,105,X)',
        'rgba(180,83,9,X)',
        'rgba(88,28,135,X)',
    ];

    const NEBULA_COLORS_LIGHT = [
        'rgba(109,40,217,X)',
        'rgba(29,78,216,X)',
        'rgba(5,150,105,X)',
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const initCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const generateStars = () => {
            const count = Math.floor((window.innerWidth * window.innerHeight) / 3000);
            starsRef.current = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random(),
                radius: Math.random() * 1.4 + 0.2,
                opacity: Math.random() * 0.7 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinkleOffset: Math.random() * Math.PI * 2,
                color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
            }));
        };

        const generateNebulae = () => {
            const colors = isDark ? NEBULA_COLORS_DARK : NEBULA_COLORS_LIGHT;
            nebulaeRef.current = Array.from({ length: isDark ? 6 : 3 }, (_, i) => ({
                x: (Math.random() * 0.8 + 0.1) * canvas.width,
                y: (Math.random() * 0.8 + 0.1) * canvas.height,
                radius: Math.random() * 280 + 120,
                color: colors[i % colors.length],
                opacity: isDark
                    ? Math.random() * 0.055 + 0.02
                    : Math.random() * 0.025 + 0.008,
            }));
        };

        const drawNebula = (nebula: Nebula) => {
            const grad = ctx.createRadialGradient(
                nebula.x, nebula.y, 0,
                nebula.x, nebula.y, nebula.radius
            );
            const c = nebula.color.replace('X', String(nebula.opacity));
            const cFade = nebula.color.replace('X', '0');
            grad.addColorStop(0, c);
            grad.addColorStop(0.5, nebula.color.replace('X', String(nebula.opacity * 0.4)));
            grad.addColorStop(1, cFade);
            ctx.beginPath();
            ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        };

        const drawStar = (star: Star, time: number) => {
            const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset);
            const currentOpacity = star.opacity + twinkle * 0.25;
            const clampedOpacity = Math.max(0.05, Math.min(1, currentOpacity));
            const dynamicRadius = star.radius * (0.85 + twinkle * 0.15);

            if (star.radius > 0.9) {
                const glow = ctx.createRadialGradient(
                    star.x, star.y, 0,
                    star.x, star.y, dynamicRadius * 3
                );
                glow.addColorStop(0, star.color.replace(')', `, ${clampedOpacity * 0.4})`).replace('rgb', 'rgba'));
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(star.x, star.y, dynamicRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, dynamicRadius, 0, Math.PI * 2);
      ctx.globalAlpha = clampedOpacity;
      ctx.fillStyle = star.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const render = (time: number) => {
      timeRef.current = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = isDark ? '#010308' : 'rgba(245,245,244,0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nebulaeRef.current.forEach(drawNebula);

      if (isDark) {
        starsRef.current.forEach(s => drawStar(s, time * 0.001));
      } else {
        starsRef.current.slice(0, 40).forEach(s => {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 0.6, 0, Math.PI * 2);
          ctx.globalAlpha = 0.06;
          ctx.fillStyle = '#6D28D9';
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    initCanvas();
    generateStars();
    generateNebulae();
    animFrameRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      initCanvas();
      generateStars();
      generateNebulae();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}

export function RepositoryPage() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('velocis-theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      localStorage.setItem('velocis-theme', !prev ? 'dark' : 'light');
      return !prev;
    });
  };

  const t = isDark ? darkTheme : lightTheme;

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const repo = repositoryData[id || 'infrazero'] || repositoryData['infrazero'];

  const activityItems = [
    { icon: Shield, agent: "SENTINEL", color: '#7C3AED', text: `Sentinel reviewed PR #482 in ${repo.name}`, time: '5 min ago' },
    { icon: TestTube2, agent: "FORTRESS", color: '#2563EB', text: 'Fortress executed full test suite', time: '12 min ago' },
    { icon: Eye, agent: "CORTEX", color: '#059669', text: 'Visual Cortex refreshed service map', time: '18 min ago' },
    { icon: Shield, agent: "SENTINEL", color: '#7C3AED', text: 'Sentinel flagged potential memory leak', time: '1 hr ago' },
    { icon: TestTube2, agent: "FORTRESS", color: '#2563EB', text: 'Fortress detected flaky test pattern', time: '2 hr ago' }
  ];

  const triAgentCards = [
    {
      title: 'Launch Visual Cortex',
      description: 'Explore the live architecture graph, service dependencies, and real-time topology insights.',
      accentColor: '#059669',
      accentBg: '#05966914',
      icon: Eye,
      previewLabel: 'Architecture Graph Preview',
      status: `Graph last updated ${repo.cortex.lastUpdate}`,
      cta: 'Open Graph',
      action: () => navigate(`/repo/${id}/cortex`)
    },
    {
      title: 'Enter Workspace',
      description: "Dive into Sentinel's intelligent PR reviews, risk detection, and autonomous code analysis.",
      accentColor: '#7C3AED',
      accentBg: '#7C3AED14',
      icon: Shield,
      previewLabel: 'PR Intelligence Preview',
      status: `${repo.sentinel.activePRs} active PR reviews`,
      cta: 'Open Workspace',
      action: () => navigate(`/repo/${id}/workspace`)
    },
    {
      title: 'View QA Pipeline',
      description: 'Monitor Fortress continuous testing, failure detection, and automated QA loops.',
      accentColor: '#2563EB',
      accentBg: '#2563EB14',
      icon: TestTube2,
      previewLabel: 'QA Pipeline Preview',
      status: repo.fortress.status,
      cta: 'View Pipeline',
      action: () => navigate(`/repo/${id}/pipeline`)
    },
    {
      title: 'IaC Prediction',
      description: 'Preview auto-generated infrastructure code, analyze AWS cost impact, and validate serverless efficiency.',
      accentColor: '#D97706',
      accentBg: '#D9770614',
      icon: Cloud,
      previewLabel: 'Infrastructure Cost Preview',
      status: 'Last generated 2 minutes ago',
      cta: 'View Infrastructure',
      action: () => navigate(`/repo/${id}/infrastructure`)
    }
  ];

  const totalRisks = repo.risks.critical + repo.risks.medium + repo.risks.low;
  const criticalPct = totalRisks ? (repo.risks.critical / totalRisks) * 100 : 0;
  const mediumPct = totalRisks ? (repo.risks.medium / totalRisks) * 100 : 0;
  const lowPct = totalRisks ? (repo.risks.low / totalRisks) * 100 : 100;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 20 }
    }
  };

  const fontStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *, *::before, *::after {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
      font-style: normal !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    @keyframes shimmer {
      0%   { background-position: 200% center }
      100% { background-position: -200% center }
    }
    
    @keyframes ping {
      0%   { transform: scale(1); opacity: 0.7 }
      100% { transform: scale(2.4); opacity: 0 }
    }

    @keyframes singlePulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
  `;

  const premiumCardStyle = {
    background: t.cardBg,
    backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)', 
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: "20px",
    boxShadow: `
      0 1px 2px rgba(0,0,0,0.04),
      0 4px 8px rgba(0,0,0,0.03),
      0 12px 32px rgba(0,0,0,0.04),
      inset 0 1px 0 rgba(255,255,255,1)
    `,
    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
  };

  const premiumCardHoverStyle = {
    y: -5,
    boxShadow: `
      0 2px 4px rgba(0,0,0,0.04),
      0 8px 24px rgba(0,0,0,0.08),
      0 24px 56px rgba(0,0,0,0.10)
    `
  };

  const codeFont = "'Inter', sans-serif";
  const sectionTitleStyle = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: "17px",
    fontStyle: "normal",
    letterSpacing: "-0.3px",
    lineHeight: 1.3,
    color: t.text1,
    transition: "color 0.25s ease"
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fontStyle }} />
      <GalaxyBackground isDark={isDark} />
      {!isDark && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'rgba(245,245,244,0.88)',
          pointerEvents: 'none',
        }} />
      )}

      {/* 1. NOISE TEXTURE */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 9997, pointerEvents: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'repeat', backgroundSize: '180px', mixBlendMode: 'multiply', opacity: 1
      }} />

      {/* 2. VIGNETTE */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 9998, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.25) 100%)'
      }} />

      {/* PAGE BACKGROUND */}
      <div className="min-h-screen relative flex" style={{ position: 'relative', zIndex: 10, backgroundColor: isDark ? 'transparent' : t.pageBg, transition: "background-color 0.3s ease, color 0.3s ease" }}>

        <aside className="fixed top-0 left-0 h-screen w-[64px] z-50 flex flex-col items-center py-6 hidden md:flex" style={{ background: t.sidebarBg, backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)',  borderColor: t.sidebarBorder, borderRightWidth: "1px", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
          <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm mb-8 cursor-pointer" style={{ background: t.logoBg, color: t.logoText, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} onClick={() => navigate('/')}>
            V
          </div>
          <div className="flex flex-col gap-6 flex-1 w-full relative">
            <div className="absolute left-0 top-[108px] w-1 h-8 rounded-r-full" style={{ background: "#6D28D9", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />
            <button className="relative w-full flex justify-center group" onClick={() => navigate('/')}>
              <Home className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />
            </button>
            <button className="relative w-full flex justify-center group" onClick={() => navigate('/dashboard')}>
              <Activity className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />
            </button>
            <button className="relative w-full flex justify-center group">
              <Folder className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: "#6D28D9" }} />
            </button>
            <button className="relative w-full flex justify-center group">
              <FileText className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />
            </button>
            <button className="relative w-full flex justify-center group">
              <Bot className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />
            </button>
            <button className="relative w-full flex justify-center group">
              <Mail className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />
            </button>
          </div>
          <button className="mt-auto group">
            <Settings className="w-5 h-5 transition-transform duration-200 group-hover:scale-[1.15]" style={{ color: t.sidebarIcon, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }} />
          </button>
        </aside>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-64 h-full bg-white border-r border-gray-200 p-6 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="mb-8 text-black" style={{ fontSize: "15px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.3px" }}>Velocis</div>
              <div className="flex flex-col gap-4 text-gray-700">
                <button className="text-left py-2" onClick={() => navigate('/')}>Home</button>
                <button className="text-left py-2 font-medium text-black">Repositories</button>
                <button className="text-left py-2">Agents</button>
                <button className="text-left py-2">Settings</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 md:ml-[64px] relative z-10 w-full">

          <nav className="sticky top-0 z-40 h-[56px] px-4 md:px-8 flex items-center justify-between"
            style={{
              background: t.navBg,
              backdropFilter: t.navBlur,
              WebkitBackdropFilter: t.navBlur,
              borderBottom: `1px solid ${t.navBorder}`,
              transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease",
            }}>
            <div className="flex items-center gap-3">
              <button className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2" style={{ color: t.text2, transition: "color 0.25s ease", fontSize: "13px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0px" }}>
                <span className="cursor-pointer hover:text-black transition-colors" onClick={() => navigate('/dashboard')}>Dashboard</span>
                <span style={{ color: t.text3, transition: "color 0.25s ease" }}>/</span>
                <span className="font-medium" style={{ color: t.text1, transition: "color 0.25s ease" }}>{repo.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative text-[#737373] hover:text-black transition-colors">
                <Bell className="w-4 h-4" style={{ color: t.text2 }} />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#DC2626] rounded-full" />
              </button>

              <div className="flex items-center gap-2">
                <div className="h-7 px-3 rounded-full flex items-center gap-1.5 border hidden sm:flex" style={{ fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em", background: isDark ? "#0D2818" : "#05966914", borderColor: isDark ? "#1A4731" : "#05966914", color: isDark ? "#3FB950" : "#059669", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                  <CheckCircle className="w-3 h-3" />
                  GitHub Sync
                </div>
                <div className="w-7 h-7 rounded-full text-[#7C3AED] flex items-center justify-center text-xs font-semibold" style={{ background: '#7C3AED14' }}>
                  R
                </div>
              </div>
            </div>
          </nav>

          {/* 3. HERO GLOW */}
          <div style={{
            background: 'radial-gradient(ellipse 900px 600px at 20% -5%, rgba(109, 40, 217, 0.07) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 70%)',
            pointerEvents: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '700px', zIndex: 2 }} />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 py-12 relative"
          >

            {/* Repo Header */}
            <motion.div variants={itemVariants} className="mb-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <h1 style={{
                  fontFamily: "'Inter', sans-serif",
                  fontStyle: "normal",
                  fontSize: "42px",
                  fontWeight: 700,
                  letterSpacing: "-1.5px",
                  lineHeight: 1.1,
                  color: t.text1,
                  marginBottom: "16px", transition: "color 0.25s ease"
                }}>
                  {repo.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2" style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em", color: t.text2, transition: "color 0.25s ease" }}>
                  <div className="px-3 py-1 rounded-full border" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderColor: t.border, color: t.text2, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease", fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em" }}>{repo.visibility}</div>
                  <span className="w-1 h-1 rounded-full" style={{ background: t.text3, transition: "background-color 0.25s ease" }} />
                  <div className="px-3 py-1 rounded-full border" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderColor: t.border, color: t.text2, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease", fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em" }}>{repo.language}</div>
                  <span className="w-1 h-1 rounded-full" style={{ background: t.text3, transition: "background-color 0.25s ease" }} />
                  <div className="px-3 py-1 rounded-full border" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderColor: t.border, color: t.text2, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease", fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.02em" }}>{repo.size}</div>
                  <span className="w-1 h-1 rounded-full" style={{ background: t.text3, transition: "background-color 0.25s ease" }} />
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: "13px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px" }}>Scanned {repo.lastScanned}</span>
                </div>
              </div>

              {/* Health Badge Pulse Ring */}
              <div className="flex-shrink-0 mt-2">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-[1.5px] cursor-default"
                  style={{ background: repo.statusColor + (isDark ? "18" : "10"), borderColor: repo.statusColor + (isDark ? "35" : "30"), color: repo.statusColor, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                  <div className="relative flex items-center justify-center w-2 h-2">
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: repo.statusColor,
                      animation: repo.status === 'healthy' ? "ping 2s ease-out infinite" : "none"
                    }} />
                    <div className="w-1.5 h-1.5 rounded-full relative z-10" style={{ backgroundColor: repo.statusColor }} />
                  </div>
                  <span className="uppercase" style={{ fontFamily: codeFont, fontSize: "12px", fontWeight: 600, fontStyle: "normal", letterSpacing: "0.01em" }}>
                    {repo.statusLabel}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* KPI HEALTH STRIP UPGRADE */}
            <motion.div variants={itemVariants} className="flex flex-wrap lg:flex-nowrap mb-14 overflow-hidden relative"
              style={{
                background: t.kpiBg, backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)', 
                border: `1px solid ${t.kpiBorder}`,
                borderRadius: "18px",
                transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease"
              }}>
              <div className="w-full sm:w-1/2 lg:w-1/4 px-6 pb-4 border-r last:border-r-0"
                style={{ borderTop: "2px solid #D97706", paddingTop: "16px", borderColor: t.kpiDivider, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                <TrendingUp className="w-4 h-4 text-[#D97706] mb-3" />
                <div className="mb-1" style={{ fontSize: "22px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.5px", color: t.text1, transition: "color 0.25s ease" }}>
                  {repo.metrics.riskScore}
                </div>
                <div style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.05em", color: "#737373", textTransform: "uppercase" }}>
                  PR Risk Score
                </div>
              </div>

              <div className="w-full sm:w-1/2 lg:w-1/4 px-6 pb-4 border-r last:border-r-0"
                style={{ borderTop: "2px solid #2563EB", paddingTop: "16px", borderColor: t.kpiDivider, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                <TestTube2 className="w-4 h-4 text-[#2563EB] mb-3" />
                <div className="mb-1" style={{ fontSize: "22px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.5px", color: t.text1, transition: "color 0.25s ease" }}>
                  {repo.metrics.testStability}
                </div>
                <div style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.05em", color: "#737373", textTransform: "uppercase" }}>
                  Test Stability
                </div>
              </div>

              <div className="w-full sm:w-1/2 lg:w-1/4 px-6 pb-4 border-r last:border-r-0"
                style={{ borderTop: "2px solid #7C3AED", paddingTop: "16px", borderColor: t.kpiDivider, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                <Activity className="w-4 h-4 text-[#7C3AED] mb-3" />
                <div className="mb-1 text-ellipsis overflow-hidden whitespace-nowrap" style={{ fontSize: "22px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.5px", color: t.text1, transition: "color 0.25s ease" }}>
                  {repo.metrics.architectureDrift}
                </div>
                <div style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.05em", color: "#737373", textTransform: "uppercase" }}>
                  Arch Drift
                </div>
              </div>

              <div className="w-full sm:w-1/2 lg:w-1/4 px-6 pb-4 border-r last:border-r-0"
                style={{ borderTop: "2px solid #059669", paddingTop: "16px", borderColor: t.kpiDivider, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                <CheckCircle className="w-4 h-4 text-[#059669] mb-3" />
                <div className="mb-1 text-ellipsis overflow-hidden whitespace-nowrap" style={{ fontSize: "22px", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.5px", color: t.text1, transition: "color 0.25s ease" }}>
                  {repo.metrics.lastAction}
                </div>
                <div style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.05em", color: "#737373", textTransform: "uppercase" }}>
                  Last Auto Action
                </div>
              </div>
            </motion.div>

            {/* Agent Command Center */}
            <motion.div variants={itemVariants} className="mb-14">
              <h2 style={{
                fontSize: "11px", fontWeight: 600, fontStyle: "normal", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.10em",
                color: t.text3, transition: "color 0.25s ease", borderLeft: "3px solid #6D28D9", paddingLeft: "10px", marginBottom: "24px"
              }}>
                Agent Command Center
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {triAgentCards.map((card, idx) => {
                  return (
                    <motion.div
                      key={idx}
                      style={{ background: t.cardBg, backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)',  border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow, borderRadius: "20px", transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", borderTopWidth: "4px", borderTopColor: card.accentColor, overflow: "hidden" }}
                      className="group relative flex flex-col sm:flex-row cursor-pointer h-full"
                      whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }}
                      onClick={card.action}
                    >
                      {/* Left 40% Text Area */}
                      <div className="w-full sm:w-[45%] p-7 flex flex-col justify-between z-10" style={{ background: t.cardBg, backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)',  transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                        <div>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 border" style={{ backgroundColor: isDark ? card.accentColor + '1F' : card.accentBg, borderColor: card.accentColor + (isDark ? '20' : '20') }}>
                            <card.icon className="w-5 h-5" style={{ color: card.accentColor }} strokeWidth={2} />
                          </div>
                          <h3 className="mb-2" style={sectionTitleStyle}>
                            {card.title}
                          </h3>
                          <p className="mb-6" style={{ color: t.text2, transition: "color 0.25s ease", fontSize: "13px", fontWeight: 400, fontStyle: "normal", lineHeight: 1.65, letterSpacing: "0px" }}>
                            {card.description}
                          </p>
                        </div>

                        {/* Pill CTA Button Upgrade */}
                        <div
                          className="hover:brightness-110 hover:-translate-y-[1px] transition-all"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px",
                            borderRadius: "99px", background: card.accentColor, color: "white",
                            fontSize: "13px", fontWeight: 600, fontStyle: "normal", letterSpacing: "0.01em", boxShadow: `0 4px 12px ${card.accentColor}40`, alignSelf: "flex-start"
                          }}
                        >
                          {card.cta}
                          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* Right 60% Preview Area */}
                      <div className="w-full sm:w-[55%] relative overflow-hidden border-l" style={{ background: t.surfaceHover, borderColor: t.cardBorder, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                        <div className="absolute inset-0 p-6 flex items-center justify-center">
                          <div className="w-full h-full rounded-xl relative overflow-hidden" style={{ background: isDark ? card.accentColor + '1F' : card.accentBg, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                            {idx === 0 && <Card1Preview isDark={isDark} />}
                            {idx === 1 && <Card2Preview isDark={isDark} />}
                            {idx === 2 && <Card3Preview isDark={isDark} />}
                            {idx === 3 && <Card4Preview isDark={isDark} />}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-14">

              <motion.div variants={itemVariants} style={premiumCardStyle} whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }} className="p-7 flex flex-col h-full">
                <div className="flex justify-between items-end mb-8">
                  <h3 className="text-[#171717]" style={sectionTitleStyle}>Repository Activity</h3>
                  <span style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0px" }} className="text-[#737373] bg-gray-100 px-2 py-1 rounded">30 Days</span>
                </div>

                <div className="flex-1 w-full relative min-h-[160px] flex items-end pb-6">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-[120px] overflow-visible">
                    <motion.path
                      d="M 0,35 Q 10,25 20,30 T 40,10 T 60,20 T 80,5 T 100,15" fill="none" stroke="#2563EB" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 2.5, ease: "easeOut" }}
                    />
                    {[
                      { x: 0, y: 35 }, { x: 20, y: 30 }, { x: 40, y: 10 }, { x: 60, y: 20 }, { x: 80, y: 5 }, { x: 100, y: 15 }
                    ].map((pt, i) => (
                      <motion.circle
                        key={i} cx={pt.x} cy={pt.y} r="1.5" fill="white" stroke="#2563EB" strokeWidth="0.8"
                        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 + i * 0.2 }}
                      />
                    ))}
                  </svg>
                  <div className="absolute bottom-0 left-0 w-full flex justify-between font-bold text-[#A3A3A3] tracking-widest px-1" style={{ fontFamily: codeFont, fontSize: "11px", textTransform: "uppercase" }}>
                    <span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} style={premiumCardStyle} whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }} className="p-7 flex flex-col h-full">
                <h3 className="text-[#171717] mb-8" style={sectionTitleStyle}>Risk Overview</h3>

                <div className="flex items-center gap-8 flex-1">
                  <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(#DC2626 0% ${criticalPct}%, #D97706 ${criticalPct}% ${criticalPct + mediumPct}%, #E5E5E5 ${criticalPct + mediumPct}% 100%)` }}>
                    <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-inner" style={{ background: t.cardBg, backdropFilter: 'blur(12px) saturate(140%)', WebkitBackdropFilter: 'blur(12px) saturate(140%)',  transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                      <span className="text-xl font-bold leading-none" style={{ color: t.text1, transition: "color 0.25s ease" }}><AnimatedCounter value={totalRisks} /></span>
                      <span className="uppercase mt-1" style={{ color: t.text2, transition: "color 0.25s ease", fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.05em" }}>Total</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 w-full">
                    <div className="w-full h-1.5 rounded-full overflow-hidden flex mb-2" style={{ background: t.riskTrack, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${criticalPct}%` }} transition={{ duration: 1 }} className="h-full bg-[#DC2626]" />
                      <motion.div initial={{ width: 0 }} animate={{ width: `${mediumPct}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-[#D97706]" />
                      <motion.div initial={{ width: 0 }} animate={{ width: `${lowPct}%` }} transition={{ duration: 1, delay: 0.4 }} className="h-full bg-[#E5E5E5]" />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 rounded bg-[#DC2626]" />
                          <span style={{ color: t.text2, transition: "color 0.25s ease", fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0px" }}>Critical</span>
                        </div>
                        <div className="text-[18px] font-semibold" style={{ color: t.text1, transition: "color 0.25s ease" }}><AnimatedCounter value={repo.risks.critical} /></div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 rounded bg-[#D97706]" />
                          <span style={{ color: t.text2, transition: "color 0.25s ease", fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0px" }}>Medium</span>
                        </div>
                        <div className="text-[18px] font-semibold" style={{ color: t.text1, transition: "color 0.25s ease" }}><AnimatedCounter value={repo.risks.medium} /></div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 rounded bg-[#9CA3AF]" />
                          <span style={{ color: t.text2, transition: "color 0.25s ease", fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0px" }}>Low</span>
                        </div>
                        <div className="text-[18px] font-semibold" style={{ color: t.text1, transition: "color 0.25s ease" }}><AnimatedCounter value={repo.risks.low} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Timeline Upgrade */}
            <motion.div variants={itemVariants} style={premiumCardStyle} whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }} className="p-8 mb-14">
              <h3 className="mb-10" style={sectionTitleStyle}>Recent Autonomous Activity</h3>

              <div className="relative">
                <div className="absolute left-[17px] top-4 bottom-4 w-px bg-[#E8E8E4] z-0" />

                <div className="space-y-6 relative z-10">
                  {activityItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                      className="group flex gap-5 items-start"
                    >
                      <div className="relative pt-1">
                        <div className="w-9 h-9 rounded-full border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform relative z-10" style={{ background: isDark ? item.color + '1F' : t.cardBg, borderColor: t.border, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                          <item.icon className="w-4 h-4" style={{ color: item.color }} />
                        </div>
                        <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-100 scale-150 transition-all blur-md -z-10" style={{ backgroundColor: item.color, opacity: 0.15 }} />
                      </div>

                      <div className="flex-1 flex flex-col justify-center"
                        style={{ transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                          e.currentTarget.style.borderRadius = "12px";
                          e.currentTarget.style.padding = "12px";
                          e.currentTarget.style.margin = "-12px";
                          e.currentTarget.style.borderLeft = `3px solid ${item.color}`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.padding = "0px";
                          e.currentTarget.style.margin = "0px";
                          e.currentTarget.style.borderLeft = `0px solid ${item.color}`;
                        }}>

                        <div className="flex justify-between items-start mb-0.5" style={{ marginLeft: "4px" }}>
                          <div style={{ fontFamily: codeFont, fontSize: "10px", fontWeight: 700, fontStyle: "normal", textTransform: "uppercase", letterSpacing: "0.12em", color: item.color, marginBottom: "3px" }}>
                            {item.agent}
                          </div>
                          <span style={{ fontFamily: codeFont, fontSize: "11px", fontWeight: 500, fontStyle: "normal", letterSpacing: "0.01em", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.border}`, borderRadius: "99px", padding: "2px 10px", color: t.text3, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease" }}>
                            {item.time}
                          </span>
                        </div>
                        <p className="pl-1" style={{ fontSize: "13px", fontWeight: 400, fontStyle: "normal", lineHeight: 1.5, color: t.text1, transition: "color 0.25s ease" }}>
                          {item.text}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Secondary Tool Cards Upgrade */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Settings, label: 'Repository Settings', sub: 'Manage integrations & tokens', color: '#171717' },
                { icon: Webhook, label: 'Webhook Status', sub: '3 active endpoints', color: '#171717' },
                { icon: Sliders, label: 'Agent Configuration', sub: 'Rules & thresholds', color: '#171717' }
              ].map((tool, index) => (
                <motion.div key={index} style={premiumCardStyle} whileHover={{ y: -5, boxShadow: t.cardShadowHover, borderColor: t.borderHover }} className="p-5 flex items-center justify-between group cursor-pointer overflow-hidden relative">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors" style={{ background: isDark ? "#161B22" : "#F5F5F4", borderColor: t.border }}>
                      <tool.icon className="w-5 h-5 transition-colors" style={{ color: t.text2 }} />
                    </div>
                    <div>
                      <div className="mb-0.5" style={{ fontSize: "14px", fontWeight: 600, fontStyle: "normal", letterSpacing: "-0.2px", color: t.text1, transition: "color 0.25s ease" }}>{tool.label}</div>
                      <div style={{ fontSize: "11px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px", fontFamily: "'Inter', sans-serif", color: t.text3, transition: "color 0.25s ease" }}>{tool.sub}</div>
                    </div>
                  </div>
                  <div className="group-hover:translate-x-[4px] transition-transform duration-300">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors" />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <footer className="mt-20 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ background: t.footerBg, borderColor: t.footerBorder, color: t.text3, transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease", fontSize: "12px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px" }}>
              <div style={{ fontFamily: codeFont, fontSize: "12px", fontWeight: 400, fontStyle: "normal" }}>© 2026 Velocis Technologies</div>
              <div className="flex items-center gap-6 font-medium">
                <a href="#" className="hover:text-black transition-colors" style={{ fontFamily: codeFont, fontSize: "12px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px" }}>Docs</a>
                <a href="#" className="hover:text-black transition-colors" style={{ fontFamily: codeFont, fontSize: "12px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px" }}>Security</a>
                <a href="#" className="hover:text-black transition-colors" style={{ fontFamily: codeFont, fontSize: "12px", fontWeight: 400, fontStyle: "normal", letterSpacing: "0px" }}>System Status</a>
              </div>
            </footer>

          </motion.div>
        </div>
      </div>
    </>
  );
}
const fs = require('fs');

const path = "c:\\Users\\ADMIN\\Desktop\\velocis\\frontend\\src\\app\\pages\\DashboardPage.tsx";

const part1 = `import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from 'motion/react';

// ── Area sparkline (gradient fill beneath the line) ───────────────────────────
function Sparkline({
  data,
  color = "#4a9e8e",
  width = "100%",
  height = 48,
  showDots = false,
  yLabels = false,
}: {
  data: number[];
  color?: string;
  width?: number | string;
  height?: number;
  showDots?: boolean;
  yLabels?: boolean;
}) {
  if (data.length < 2) return null;
  const iw = typeof width === "number" ? width : 100;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * iw,
    y: height! - ((v - min) / range) * (height! - 4) - 2,
  }));
  const linePts = points.map((p) => \`\${p.x},\${p.y}\`).join(" ");
  const areaD =
    \`M \${points[0].x},\${points[0].y} \` +
    points.slice(1).map((p) => \`L \${p.x},\${p.y}\`).join(" ") +
    \` L \${points[points.length - 1].x},\${height} L \${points[0].x},\${height} Z\`;
  const gradId = \`sg-\${color.replace(/#/g, "")}\`;
  const isFluid = typeof width === "string";
  // show dots at index 1, midpoint, last
  const dotIdxs = [1, Math.floor(data.length / 2), data.length - 1];
  const MF = "'Inter', sans-serif";
  return (
    <div style={{ position: 'relative', width: isFluid ? '100%' : width, height }}>
      {/* Subtle fade on left and right edges */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '20px',
        background: 'linear-gradient(to right, rgba(33, 37, 45, 1) 0%, transparent 100%)',
        zIndex: 2, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '20px',
        background: 'linear-gradient(to left, rgba(33, 37, 45, 1) 0%, transparent 100%)',
        zIndex: 2, pointerEvents: 'none'
      }} />
      <svg
        width="100%"
        height={height}
        viewBox={isFluid ? \`0 0 \${iw} \${height}\` : undefined}
        preserveAspectRatio={isFluid ? "none" : undefined}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={\`url(#\${gradId})\`} />
        <polyline
          points={linePts}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {showDots && dotIdxs.map((di) => (
          <circle key={di} cx={points[di].x} cy={points[di].y} r={2} fill={color} />
        ))}
        {yLabels && (
          <>
            <text x={1} y={8} fontSize={6} fill={color} opacity={0.5} fontFamily={MF}>{max}</text>
            <text x={1} y={height! - 3} fontSize={6} fill={color} opacity={0.35} fontFamily={MF}>{min}</text>
          </>
        )}
      </svg>
    </div>
  );
}

// ── Score badge — plain bold number, no rings ────────────────────────────────
function ScoreBadge({ score, color, trackColor: _t, textColor = "#e8eaf0" }: { score: number; color: string; trackColor?: string; textColor?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1 }}>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
        {score}
      </span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: textColor, opacity: 0.38, marginTop: 2 }}>
        /100
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activityTab, setActivityTab] = useState("all");
  const [isDark, setIsDark] = useState(true);
  const navigate = useNavigate();

  // ── palette (dark) ────────────────────────────────────────────────────────
  const BG = "#1a1d23";
  const TEAL = "#4a9e8e";
  const GREEN = "#22c55e";
  const AMBER = "#eab308";
  const RED = "#dc2626";
  const TEXT = "#FFFFFF";
  const MUTED = "rgba(255,255,255,0.65)";
  const DIM = "rgba(255,255,255,0.45)";
  
  const MONO = "'Inter', sans-serif";
  const SANS = "'Inter', sans-serif";

  // ── sparkline / bar data ───────────────────────────────────────────────────
  const sentinelSpark = [18, 21, 19, 24, 22, 23, 24];
  const testsSpark = [98, 99, 100, 98, 100, 100, 100];
  const servicesSpark = [135, 138, 139, 140, 141, 141, 142];
  const risksSpark = [7, 6, 5, 6, 4, 3, 3];

  const sentinelBars = [82, 91, 77, 95, 88];
  const fortressBars = [85, 79, 92, 88, 95];
  const cortexBars = [90, 94, 91, 97, 96];

  // ── activity feed ─────────────────────────────────────────────────────────
  const allActivity = [
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "Flagged potential race condition", repo: "InfraZero", time: "12m ago" },
    { agent: "fortress", color: "#60a5fa", label: "Fortress", msg: "3 flaky tests auto-quarantined", repo: "Immersa", time: "29m ago" },
    { agent: "cortex", color: TEAL, label: "Cortex", msg: "Service map updated — 2 new nodes", repo: "InfraZero", time: "58s ago" },
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "PR #214 reviewed, 1 critical finding", repo: "Nexlayer", time: "1h ago" },
    { agent: "fortress", color: "#60a5fa", label: "Fortress", msg: "Full suite passed after hotfix", repo: "Immersa", time: "2h ago" },
    { agent: "cortex", color: TEAL, label: "Cortex", msg: "Detected 1 stale service endpoint", repo: "DataBridge", time: "3h ago" },
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "Dependency audit: 0 new CVEs", repo: "Immersa", time: "4h ago" },
  ];

  const filteredActivity =
    activityTab === "all"
      ? allActivity
      : allActivity.filter((a) => a.agent === activityTab);
`;

const part2 = `
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        background: BG,
        color: TEXT,
        fontFamily: SANS,
        fontSize: 13,
        overflow: "hidden",
      }}
    >
      {/* ── Custom scrollbar and Ping Animation ───────────────────────── */}
      <style>{\`
        * { scrollbar-width: none; }
        ::-webkit-scrollbar { display: none; }
        
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      \`}</style>

      {/* ────────────────────────── MAIN AREA ─────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── TOP BAR (PART 5 — NAVBAR POLISH) ──────────────────────────── */}
        <header
          style={{
            height: 56, flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: "flex", alignItems: "center", padding: "0 20px", gap: 0,
            position: "relative", zIndex: 40,
          }}
        >
          {/* Left — logo + breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            {/* Logo block */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#1e293b",
                border: \`1px solid #334155\`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: MONO }}>V</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 17, color: TEXT, fontFamily: SANS }}>
                Velocis
              </span>
            </div>

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: SANS }}>
              <span
                onClick={() => navigate("/")}
                style={{
                  display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
                  color: 'rgba(255,255,255,0.35)', transition: "color 0.1s"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#818cf8")}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span style={{ fontSize: 13 }}>Home</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>/</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 13 }}>Dashboard</span>
            </div>
          </div>

          {/* Center — search */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: "5px 12px", width: 220,
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>⌕</span>
              <input
                placeholder="Search..."
                style={{ background: "none", border: "none", outline: "none", color: 'rgba(255,255,255,0.6)', fontSize: 13, width: "100%", fontFamily: SANS }}
              />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', borderRadius: 3, padding: "1px 4px", fontFamily: MONO }}>
                ⌘K
              </span>
            </div>
          </div>

          {/* Right — status + time filter + theme toggle + avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Status pills */}
            <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', padding: "5px 12px", borderRadius: 8, fontFamily: SANS, fontWeight: 600, fontSize: 12 }}>
              ● sys ok
            </span>
            <span style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#eab308', padding: "5px 12px", borderRadius: 8, fontFamily: SANS, fontWeight: 600, fontSize: 12 }}>
              ● 1 warn
            </span>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: "0 4px" }} />

            {/* Time filter */}
            <div style={{ display: "flex", gap: 1 }}>
              {["1h", "24h", "7d", "30d"].map((t) => (
                <button key={t} style={{
                  background: t === "24h" ? 'rgba(255,255,255,0.10)' : "none", border: "none",
                  color: t === "24h" ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                  fontSize: 12, fontWeight: t === "24h" ? 700 : 500,
                  padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontFamily: SANS,
                }}>
                  {t}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: "0 4px" }} />

            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#1e293b",
              border: \`1.5px solid rgba(255,255,255,0.15)\`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", fontFamily: MONO }}>R</span>
            </div>
          </div>
        </header>

        {/* ── SCROLLABLE CONTENT (PART 6 — OVERALL LAYOUT SPACING) ──────── */}
        <div
          style={{
            flex: 1, overflowY: "auto",
            display: "grid", gridTemplateColumns: "1fr 320px",
            gap: "24px", padding: "0 32px 40px 32px",
          }}
        >
          {/* ── LEFT / MAIN COLUMN ──────────────────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

            {/* PART 1 — ADD WELCOME HERO SECTION */}
            <div style={{
              padding: '40px 40px 32px 40px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '32px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Background glow behind the welcome text */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                left: '-20px',
                width: '500px',
                height: '200px',
                background: 'radial-gradient(ellipse at 20% 50%, rgba(109,40,217,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Greeting line */}
              <p style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '8px',
                fontFamily: 'Inter, sans-serif',
              }}>
                {new Date().getHours() < 12
                  ? 'Good morning'
                  : new Date().getHours() < 17
                  ? 'Good afternoon'
                  : 'Good evening'}, Rishi
              </p>

              {/* Main headline */}
              <h1 style={{
                fontSize: '36px',
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-1px',
                lineHeight: 1.15,
                marginBottom: '12px',
                fontFamily: 'Inter, sans-serif',
                marginTop: 0,
              }}>
                Your systems are{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #22c55e, #059669)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  running well
                </span>
              </h1>

              {/* Subtitle status row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap',
              }}>
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric'
                  })}
                </span>

                <div style={{
                  width: '4px', height: '4px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '7px', height: '7px',
                    borderRadius: '50%', background: '#22c55e', position: 'relative'
                  }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: '#22c55e', opacity: 0.5,
                      animation: 'ping 2s ease-out infinite',
                      position: 'absolute',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '13px', fontWeight: 500,
                    color: '#22c55e', fontFamily: 'Inter, sans-serif',
                  }}>
                    3 agents running
                  </span>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <div style={{
                    width: '7px', height: '7px',
                    borderRadius: '50%', background: '#eab308',
                  }} />
                  <span style={{
                    fontSize: '13px', fontWeight: 500,
                    color: '#eab308', fontFamily: 'Inter, sans-serif',
                  }}>
                    1 warning active
                  </span>
                </div>
              </div>

              {/* Quick stat pills row */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '24px',
                flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Healthy Repos', value: '4', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)' },
                  { label: 'Warnings', value: '1', color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.15)' },
                  { label: 'Critical', value: '1', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.15)' },
                  { label: 'Open Risks', value: '3', color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
                ].map((pill, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 16px', borderRadius: '10px',
                    background: pill.bg, border: \`1px solid \${pill.border}\`,
                    backdropFilter: 'blur(8px)',
                  }}>
                    <span style={{
                      fontSize: '18px', fontWeight: 700,
                      color: pill.color, fontFamily: 'Inter, sans-serif',
                      lineHeight: 1,
                    }}>
                      {pill.value}
                    </span>
                    <span style={{
                      fontSize: '12px', fontWeight: 500,
                      color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif',
                    }}>
                      {pill.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PART 2 — REDESIGN REPOSITORIES SECTION */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: '0 0px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.5px', fontFamily: 'Inter, sans-serif' }}>Repositories</span>

              <div style={{ display: "flex", gap: "16px", marginLeft: 4, alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }}/> Healthy 4
                </span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: AMBER }}/> Warning 1
                </span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: RED }}/> Critical 1
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: '0 0 0 0' }}>

              {/* Repo Cards Data Array to DRY the logic */}
              {[
                { name: "infrazero", status: "critical", color: RED, nav: "/repo/infrazero", spark: [18, 22, 19, 28, 12, 7, 4], pct: "↓ 38%", agents: [
                  { name: "Sentinel", aColor: "#a78bfa", desc: "race condition flagged in writer.go", dColor: RED, time: "12m" },
                  { name: "Fortress", aColor: "#60a5fa", desc: "247/247 tests passing", dColor: GREEN, time: "1h" },
                ]},
                { name: "immersa", status: "warning", color: AMBER, nav: "/repo/immersa", spark: [9, 14, 22, 11, 18, 25, 16], pct: "~ volatile", ptCol: AMBER, agents: [
                  { name: "Sentinel", aColor: "#a78bfa", desc: "PR #214 clean, merged", dColor: GREEN, time: "2h" },
                  { name: "Fortress", aColor: "#60a5fa", desc: "8 flaky tests quarantined", dColor: AMBER, time: "29m" },
                ]},
                { name: "nexlayer", status: "healthy", color: GREEN, nav: "/repo/nexlayer", spark: [8, 11, 13, 14, 17, 21, 24], pct: "↑ 24%", ptCol: GREEN, agents: [
                  { name: "Sentinel", aColor: "#a78bfa", desc: "0 issues in last scan", dColor: GREEN, time: "4h" },
                  { name: "Fortress", aColor: "#60a5fa", desc: "suite stable, 312 passing", dColor: GREEN, time: "3h" },
                ]},
                { name: "databridge", status: "healthy", color: GREEN, nav: "/repo/databridge", spark: [12, 15, 13, 16, 14, 17, 18], pct: "↑ 12%", ptCol: GREEN, agents: [
                  { name: "Cortex", aColor: TEAL, desc: "1 stale endpoint detected", dColor: AMBER, time: "3h" },
                  { name: "Sentinel", aColor: "#a78bfa", desc: "no new findings", dColor: GREEN, time: "5h" },
                ]},
              ].map((repo, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    backdropFilter: 'blur(12px)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: "pointer"
                  }} 
                  onClick={() => navigate(repo.nav)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.055)';
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Subtle top accent line */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                    background: repo.color, borderRadius: '16px 16px 0 0'
                  }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '17px', color: '#FFFFFF', letterSpacing: '-0.3px', fontFamily: 'Inter, sans-serif' }}>
                      {repo.name}
                    </span>
                    <span style={{ 
                      marginLeft: "auto", color: repo.color, 
                      fontSize: '11px', fontWeight: 600, padding: "4px 12px", borderRadius: '8px', 
                      background: repo.color + '18', border: \`1px solid \${repo.color}35\`,
                      textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' 
                    }}>
                      ● {repo.status}
                    </span>
                  </div>

                  {repo.agents.map((ag, aIdx) => (
                    <div key={aIdx} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ag.aColor, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: ag.aColor, flexShrink: 0, letterSpacing: '0.01em', fontFamily: 'Inter, sans-serif' }}>
                        {ag.name} →
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'Inter, sans-serif' }}>
                        <span style={{ color: ag.dColor, fontWeight: 500 }}>{ag.desc}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>
                        {ag.time}
                      </span>
                    </div>
                  ))}

                  <div style={{ marginTop: 12, position: 'relative' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginBottom: '6px', letterSpacing: '0.03em', fontFamily: 'Inter, sans-serif' }}>
                      commit activity · 7d
                    </div>
                    <Sparkline data={repo.spark} color={repo.color} width="100%" height={48} />
                    <span style={{ 
                      position: 'absolute', bottom: 0, right: 0,
                      fontSize: '14px', color: repo.name === 'immersa' ? AMBER : (repo.name === 'infrazero' ? RED : GREEN), fontFamily: 'Inter, sans-serif', fontWeight: 700 
                    }}>{repo.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN — ACTIVITY FEED & SYSTEM ────────────────────── */}
          <div style={{ 
            display: "flex", flexDirection: "column", gap: "0px",
            position: 'sticky', top: '56px', maxHeight: 'calc(100vh - 56px)',
            overflowY: 'auto', scrollbarWidth: 'none'
          }}>

            {/* PART 3 — REDESIGN ACTIVITY PANEL */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '0',
              overflow: 'hidden'
            }}>

              {/* Activity header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: '20px 20px 0 20px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px', fontFamily: 'Inter, sans-serif' }}>Activity</span>
                <span style={{ 
                  display: "flex", alignItems: "center", gap: 6, fontSize: '11px', fontWeight: 600, 
                  background: 'rgba(255,255,255,0.06)', border: \`1px solid rgba(255,255,255,0.10)\`, 
                  padding: "3px 10px", borderRadius: '8px', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' 
                }}>
                  5 new • 
                  <div style={{ position: 'relative', width: 6, height: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: '#22c55e', position: 'absolute' }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: '#22c55e', position: 'absolute', animation: 'ping 2s ease-out infinite' }} />
                  </div>
                  <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE</span>
                </span>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: '4px', padding: '16px 20px 0 20px', marginBottom: 12 }}>
                {[
                  { id: "all", label: "All" },
                  { id: "sentinel", label: "Sentinel" },
                  { id: "fortress", label: "Fortress" },
                  { id: "cortex", label: "Cortex" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivityTab(tab.id)}
                    style={{
                      background: activityTab === tab.id ? 'rgba(255,255,255,0.08)' : "none", border: "none",
                      color: activityTab === tab.id ? '#FFFFFF' : "rgba(255,255,255,0.35)",
                      fontSize: '12px', padding: "5px 12px", cursor: "pointer", borderRadius: '8px',
                      fontFamily: 'Inter, sans-serif', fontWeight: activityTab === tab.id ? 600 : 500,
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => { if (activityTab !== tab.id) e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
                    onMouseLeave={e => { if (activityTab !== tab.id) e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Feed items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {filteredActivity.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "14px 20px",
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: item.color, fontFamily: 'Inter, sans-serif' }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginLeft: "auto", fontFamily: 'Inter, sans-serif' }}>{item.time}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.60)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                      {item.msg}{" "}
                      <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{item.repo}</span>
                    </div>
                  </div>
                ))}

                {filteredActivity.length === 0 && (
                  <div style={{ padding: "24px 10px", textAlign: "center", color: DIM, fontSize: 12, fontFamily: SANS }}>
                    No activity
                  </div>
                )}
              </div>
            </div>

            {/* PART 4 — REDESIGN SYSTEM PANEL */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '20px',
              marginTop: '16px'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>SYSTEM</div>
              {[
                { label: "API latency", val: "38ms", color: '#22c55e' },
                { label: "Queue depth", val: "12", color: '#FFFFFF' },
                { label: "Agent uptime", val: "99.7%", color: '#22c55e' },
                { label: "Storage", val: "61%", color: '#eab308' },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: \`1px solid rgba(255,255,255,0.04)\` }}>
                  <span style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif' }}>{row.label}</span>
                  <span style={{ fontSize: '14px', color: row.color, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>{row.val}</span>
                </div>
              ))}
            </div>

            {/* Recent deployments */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '20px',
              marginTop: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>RECENT DEPLOYMENTS</div>
              {[
                { repo: "infrazero", env: "prod", sc: RED, time: "14m ago" },
                { repo: "nexlayer", env: "prod", sc: GREEN, time: "2h ago" },
                { repo: "immersa", env: "staging", sc: GREEN, time: "3h ago" },
              ].map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: 'space-between', padding: "8px 0" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.sc, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>{d.repo}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>{d.env} {d.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path, part1 + part2);

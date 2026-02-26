import React, { useState } from "react";
import { useNavigate } from "react-router";

// ── Area sparkline (gradient fill beneath the line) ───────────────────────────
function Sparkline({
  data,
  color = "#4a9e8e",
  width = 80,
  height = 28,
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
  const linePts = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaD =
    `M ${points[0].x},${points[0].y} ` +
    points.slice(1).map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;
  const gradId = `sg-${color.replace(/#/g, "")}`;
  const isFluid = typeof width === "string";
  // show dots at index 1, midpoint, last — avoids the too-tidy first/last pattern
  const dotIdxs = [1, Math.floor(data.length / 2), data.length - 1];
  const MF = "'JetBrains Mono','Fira Mono',monospace";
  return (
    <svg
      width={width}
      height={height}
      viewBox={isFluid ? `0 0 ${iw} ${height}` : undefined}
      preserveAspectRatio={isFluid ? "none" : undefined}
      style={{ display: "block", overflow: "visible", ...(isFluid ? { width: "100%" } : {}) }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
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
  );
}

// ── Mini bar chart — baseline + rounded-top bars ────────────────────────────
function MiniBarChart({
  data,
  color = "#4a9e8e",
  width = 120,
  height = 36,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data) || 1;
  const gap = 3;
  const barW = Math.floor((width - gap * (data.length - 1)) / data.length);
  const baseline = height - 1;
  const r = 2; // top-corner radius
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {/* X-axis baseline */}
      <line x1={0} y1={baseline} x2={width} y2={baseline} stroke="#2a2f3a" strokeWidth={1} />
      {(() => {
        // per-bar width jitter and opacity — intentionally uneven
        const wJitter = [-1, 0, -2, 0, -1];
        const barOp   = [0.75, 1.0, 0.85, 0.9, 0.7];
        return data.map((v, i) => {
          const barH = Math.max(3, (v / max) * (baseline - 4));
          const x = i * (barW + gap);
          const y = baseline - barH;
          const w = Math.max(2, barW + (wJitter[i % wJitter.length] ?? 0));
          const h = barH;
          const d = `M ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h} L ${x},${y + h} Z`;
          return (
            <path
              key={i}
              d={d}
              fill={color}
              opacity={barOp[i % barOp.length] ?? 0.7}
            />
          );
        });
      })()}
    </svg>
  );
}

// ── Score badge — plain bold number, no rings ────────────────────────────────
function ScoreBadge({ score, color, trackColor: _t, textColor = "#e8eaf0" }: { score: number; color: string; trackColor?: string; textColor?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1 }}>
      <span style={{ fontFamily: "'JetBrains Mono','Fira Mono',monospace", fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
        {score}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono','Fira Mono',monospace", fontSize: 9, color: textColor, opacity: 0.38, marginTop: 2 }}>
        /100
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState("overview");
  const [activityTab, setActivityTab] = useState("all");
  const [isDark, setIsDark] = useState(true);
  const navigate = useNavigate();

  // ── palette (dark / light) ────────────────────────────────────────────────
  const BG         = isDark ? "#1a1d23"  : "#f4f6f9";
  const TOPBAR     = isDark ? "#181b21"  : "#ffffff";
  const CARD       = isDark ? "#21252d"  : "#ffffff";
  const BORDER     = isDark ? "#2a2f3a"  : "#e2e6ed";
  const ELEVATED   = isDark ? "#1e2228"  : "#f0f2f5";
  const TEAL       = isDark ? "#4a9e8e"  : "#3a8a7a";
  const GREEN      = isDark ? "#4caf72"  : "#2a7a43";
  const AMBER      = isDark ? "#c9934a"  : "#9a6830";
  const RED        = isDark ? "#e05c5c"  : "#c04040";
  const TEXT       = isDark ? "#e8eaf0"  : "#111318";
  const MUTED      = isDark ? "#7a7f8e"  : "#6b7280";
  const DIM        = isDark ? "#4a4f5e"  : "#9ca3af";
  const BADGE_BG   = isDark ? "#2a2f3a"  : "#e8eaef";
  const AVATAR_BG  = isDark ? "#2d3650"  : "#e8f0fe";
  const AVATAR_TC  = isDark ? "#8ab4f8"  : "#4a7fd4";
  const WS_DOT     = isDark ? "#2d3240"  : "#d0d5e0";
  const PILL_GR_BG = isDark ? "#1c2b20"  : "#e8f5ee";
  const PILL_GR_BD = isDark ? "#2a4030"  : "#b8d9c4";
  const PILL_AM_BG = isDark ? "#2a2118"  : "#fef3e8";
  const PILL_AM_BD = isDark ? "#3d2e14"  : "#e8d0a8";
  const RED_BG     = isDark ? "#2d1818"  : "#fce8e8";
  const RED_BD     = isDark ? "#4a2020"  : "#e8b0b0";
  const AMB_BG     = isDark ? "#2a1e0e"  : "#fef3e8";
  const AMB_BD     = isDark ? "#4a3414"  : "#e8d0a8";
  const GRN_BG     = isDark ? "#1a2b1e"  : "#e8f5ee";
  const GRN_BD     = isDark ? "#2a4030"  : "#b8d9c4";
  const ACT_HL     = isDark ? "#232830"  : "#eef0f5";
  const SCORE_TRACK= isDark ? "#2a2f3a"  : "#e2e6ed";
  const MONO = "'JetBrains Mono', 'Fira Mono', 'Cascadia Code', ui-monospace, monospace";
  const SANS = "'Inter', system-ui, sans-serif";

  // ── sparkline / bar data ───────────────────────────────────────────────────
  const sentinelSpark = [18, 21, 19, 24, 22, 23, 24];
  const testsSpark    = [98, 99, 100, 98, 100, 100, 100];
  const servicesSpark = [135, 138, 139, 140, 141, 141, 142];
  const risksSpark    = [7, 6, 5, 6, 4, 3, 3];

  const sentinelBars = [82, 91, 77, 95, 88];
  const fortressBars = [85, 79, 92, 88, 95];
  const cortexBars   = [90, 94, 91, 97, 96];

  // ── activity feed ─────────────────────────────────────────────────────────
  const allActivity = [
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "Flagged potential race condition",        repo: "InfraZero", time: "12m ago" },
    { agent: "fortress", color: "#60a5fa", label: "Fortress", msg: "3 flaky tests auto-quarantined",          repo: "Immersa",   time: "29m ago" },
    { agent: "cortex",   color: TEAL,      label: "Cortex",   msg: "Service map updated — 2 new nodes",       repo: "InfraZero", time: "58s ago" },
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "PR #214 reviewed, 1 critical finding",   repo: "Nexlayer",  time: "1h ago"  },
    { agent: "fortress", color: "#60a5fa", label: "Fortress", msg: "Full suite passed after hotfix",          repo: "Immersa",   time: "2h ago"  },
    { agent: "cortex",   color: TEAL,      label: "Cortex",   msg: "Detected 1 stale service endpoint",       repo: "DataBridge",time: "3h ago"  },
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "Dependency audit: 0 new CVEs",            repo: "Immersa",   time: "4h ago"  },
  ];

  const filteredActivity =
    activityTab === "all"
      ? allActivity
      : allActivity.filter((a) => a.agent === activityTab);

  // ── sidebar nav items ──────────────────────────────────────────────────────
  const navItems = [
    { id: "overview",      label: "Overview",      icon: "▦" },
    { id: "repositories",  label: "Repositories",  icon: "⎇" },
    { id: "activity",      label: "Activity",      icon: "⚡" },
  ];
  const agentNavItems = [
    { id: "sentinel", label: "Sentinel",      dot: "#a78bfa" },
    { id: "fortress", label: "Fortress",      dot: "#60a5fa" },
    { id: "cortex",   label: "Visual Cortex", dot: TEAL      },
  ];
  const bottomNavItems = [
    { id: "settings", label: "Settings", icon: "⚙" },
    { id: "docs",     label: "Docs",     icon: "⬜" },
  ];

  // ── inline-style helpers ───────────────────────────────────────────────────
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    ...extra,
  });

  const mono = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: MONO,
    ...extra,
  });

  const navItemStyle = (id: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px 6px 14px",
    borderLeft: activeNav === id ? `3px solid ${TEAL}` : "3px solid transparent",
    color: activeNav === id ? TEXT : MUTED,
    fontWeight: activeNav === id ? 500 : 400,
    fontSize: 13,
    cursor: "pointer",
    borderRadius: "0 4px 4px 0",
    userSelect: "none" as const,
    transition: "color 0.1s",
    fontFamily: SANS,
  });

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
      {/* ── Custom scrollbar (adapts to theme) ───────────────────────── */}
      <style>{`
        * { scrollbar-width: thin; scrollbar-color: ${isDark ? "#3a3f4a" : "#c4cad4"} transparent; }
        *::-webkit-scrollbar { width: 6px; height: 6px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: ${isDark ? "#3a3f4a" : "#c4cad4"}; border-radius: 3px; }
        *::-webkit-scrollbar-thumb:hover { background: ${isDark ? "#52586a" : "#a0a8b4"}; }
        *::-webkit-scrollbar-corner { background: transparent; }
      `}</style>
      {/* ──────────────────────────── SIDEBAR ─────────────────────────────── */}
      <aside
        style={{
          width: 200,
          minWidth: 200,
          background: TOPBAR,
          borderRight: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          padding: "0 0 12px 0",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "14px 16px 12px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 22, height: 22, background: TEAL, borderRadius: 5,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: MONO,
            }}
          >
            V
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: TEXT, fontFamily: SANS }}>Velocis</span>
          <span
            style={{
              marginLeft: "auto", fontSize: 9, color: MUTED,
              background: BADGE_BG, padding: "1px 5px", borderRadius: 3, fontFamily: MONO,
            }}
          >
            v0.7
          </span>
        </div>

        {/* Workspace selector */}
        <div
          style={{
            padding: "8px 12px", margin: "8px 8px 4px",
            border: `1px solid ${BORDER}`, borderRadius: 5, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <div style={{ width: 16, height: 16, background: WS_DOT, borderRadius: 3, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: TEXT, fontWeight: 500, flex: 1, fontFamily: SANS }}>infra-team</span>
          <span style={{ color: DIM, fontSize: 10 }}>▾</span>
        </div>

        {/* Main nav */}
        <nav style={{ padding: "6px 0", flex: 1 }}>
          <div style={{ padding: "4px 16px 4px", fontSize: 10, color: DIM, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: SANS }}>
            General
          </div>
          {navItems.map((item) => (
            <div key={item.id} style={navItemStyle(item.id)} onClick={() => setActiveNav(item.id)}>
              <span style={{ fontSize: 12, opacity: 0.7, fontFamily: MONO }}>{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div style={{ padding: "12px 16px 4px", fontSize: 10, color: DIM, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: SANS }}>
            Agents
          </div>
          {agentNavItems.map((item) => (
            <div key={item.id} style={navItemStyle(item.id)} onClick={() => setActiveNav(item.id)}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: item.dot, display: "inline-block", flexShrink: 0 }} />
              {item.label}
            </div>
          ))}

          <div style={{ margin: "12px 8px 0", borderTop: `1px solid ${BORDER}` }} />
          {bottomNavItems.map((item) => (
            <div key={item.id} style={{ ...navItemStyle(item.id), marginTop: 2 }} onClick={() => setActiveNav(item.id)}>
              <span style={{ fontSize: 12, opacity: 0.7, fontFamily: MONO }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        {/* User row */}
        <div
          style={{
            padding: "8px 12px", margin: "0 8px",
            border: `1px solid ${BORDER}`, borderRadius: 5,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <div
            style={{
              width: 24, height: 24, borderRadius: "50%", background: AVATAR_BG,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: AVATAR_TC, fontWeight: 600, fontFamily: MONO,
            }}
          >
            RK
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: TEXT, fontWeight: 500, fontFamily: SANS }}>rishi</div>
            <div style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>admin</div>
          </div>
        </div>
      </aside>

      {/* ────────────────────────── MAIN AREA ─────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── TOP BAR ───────────────────────────────────────────────────── */}
        <header
          style={{
            height: 60, flexShrink: 0,
            borderBottom: `1px solid ${isDark ? "rgba(51,65,85,0.8)" : "#e4e4e7"}`,
            background: isDark ? "rgba(15,23,42,0.75)" : "rgba(255,255,255,0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
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
                background: isDark ? "#1e293b" : "#18181b",
                border: `1px solid ${isDark ? "#334155" : "#3f3f46"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: MONO }}>V</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 14, color: TEXT, fontFamily: SANS, letterSpacing: "-0.01em" }}>
                Velocis
              </span>
            </div>

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: MUTED, fontFamily: SANS }}>
              <span
                onClick={() => navigate("/")}
                style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
                  color: MUTED, transition: "color 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.color = isDark ? "#818cf8" : "#4f46e5")}
                onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span style={{ fontSize: 13 }}>Home</span>
              </span>
              <span style={{ color: DIM, fontSize: 12 }}>/</span>
              <span style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>Dashboard</span>
            </div>
          </div>

          {/* Center — search */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: isDark ? "rgba(15,23,42,0.6)" : "#fff",
              border: `1px solid ${isDark ? "#334155" : "#e4e4e7"}`,
              borderRadius: 8, padding: "5px 12px", width: 220,
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}>
              <span style={{ color: DIM, fontSize: 13 }}>⌕</span>
              <input
                placeholder="Search..."
                style={{ background: "none", border: "none", outline: "none", color: MUTED, fontSize: 12, width: "100%", fontFamily: SANS }}
              />
              <span style={{ fontSize: 9, color: DIM, border: `1px solid ${BORDER}`, borderRadius: 3, padding: "1px 4px", fontFamily: MONO }}>
                ⌘K
              </span>
            </div>
          </div>

          {/* Right — status + time filter + theme toggle + avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Status pills */}
            <span style={{ background: PILL_GR_BG, border: `1px solid ${PILL_GR_BD}`, color: GREEN, fontSize: 11, padding: "2px 8px", borderRadius: 10, fontFamily: MONO }}>
              ● sys ok
            </span>
            <span style={{ background: PILL_AM_BG, border: `1px solid ${PILL_AM_BD}`, color: AMBER, fontSize: 11, padding: "2px 8px", borderRadius: 10, fontFamily: MONO }}>
              ● 1 warn
            </span>

            <div style={{ width: 1, height: 20, background: BORDER, margin: "0 4px" }} />

            {/* Time filter */}
            <div style={{ display: "flex", gap: 1 }}>
              {["1h", "24h", "7d", "30d"].map((t) => (
                <button key={t} style={{
                  background: t === "24h" ? BADGE_BG : "none", border: "none",
                  color: t === "24h" ? TEXT : MUTED, fontSize: 11,
                  padding: "3px 7px", borderRadius: 4, cursor: "pointer", fontFamily: MONO,
                }}>
                  {t}
                </button>
              ))}
            </div>

            <span style={{ fontSize: 11, color: DIM, fontFamily: SANS, whiteSpace: "nowrap" }}>
              2m ago ↻
            </span>

            <div style={{ width: 1, height: 20, background: BORDER, margin: "0 4px" }} />

            {/* Theme toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "none", border: "none", padding: 6, borderRadius: 8,
                cursor: "pointer", color: MUTED, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isDark ? "#1e293b" : "#f4f4f5")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              {isDark ? "☀" : "☾"}
            </button>

            {/* Avatar with glow */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(99,102,241,0.2)", borderRadius: "50%", filter: "blur(6px)",
              }} />
              <div style={{
                width: 32, height: 32, borderRadius: "50%", position: "relative",
                background: isDark ? "#1e293b" : "#fff",
                border: `1px solid ${isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)"}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#818cf8" : "#4f46e5", fontFamily: MONO }}>R</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── SCROLLABLE CONTENT ────────────────────────────────────────── */}
        <div
          style={{
            flex: 1, overflowY: "auto", padding: "18px 20px 24px",
            display: "flex", gap: 16,
          }}
        >
          {/* ── LEFT / MAIN COLUMN ──────────────────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>

            {/* Greeting */}
            <div style={{ marginBottom: -4 }}>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: TEXT, margin: 0, fontFamily: SANS }}>
                Good morning, Rishi
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: MUTED, fontFamily: SANS }}>
                Thursday, Feb 26 — 3 agents running, 1 warning active
              </p>
            </div>

            {/* ── STAT CARDS ──────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>

              {/* Card 1 — Sentinel Reviews */}
              <div style={card({ padding: "14px 18px 10px" })}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, color: MUTED, fontFamily: SANS }}>Sentinel Reviews</div>
                  <span style={{ fontSize: 14, color: "#a78bfa" }}>◈</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={mono({ fontSize: 26, fontWeight: 700, color: TEXT, lineHeight: 1 })}>24</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: MUTED, fontFamily: SANS }}>
                  <span style={{ color: GREEN }}>+12%</span> vs yesterday{" "}
                  <span style={mono({ color: DIM, fontSize: 10 })}>21</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Sparkline data={sentinelSpark} color="#a78bfa" />
                </div>
              </div>

              {/* Card 2 — Tests Passing (slightly more padded) */}
              <div style={card({ padding: "14px 14px 16px" })}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, color: MUTED, fontFamily: SANS }}>Tests Passing</div>
                  <span style={{ fontSize: 14, color: "#60a5fa" }}>◉</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={mono({ fontSize: 26, fontWeight: 700, color: TEXT, lineHeight: 1 })}>100%</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: MUTED, fontFamily: SANS }}>
                  <span style={mono({ color: GREEN, fontSize: 11 })}>100%</span> for{" "}
                  <span style={mono({ color: TEXT, fontSize: 11 })}>49h</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Sparkline data={testsSpark} color="#60a5fa" />
                </div>
              </div>

              {/* Card 3 — Services Mapped */}
              <div style={card({ padding: "14px 14px 10px" })}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, color: MUTED, fontFamily: SANS }}>Services Mapped</div>
                  <span style={{ fontSize: 14, color: TEAL }}>⬡</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={mono({ fontSize: 26, fontWeight: 700, color: TEXT, lineHeight: 1 })}>142</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: MUTED, fontFamily: SANS }}>
                  <span style={{ color: GREEN }}>+2</span> since last hour{" "}
                  <span style={mono({ color: DIM, fontSize: 10 })}>8.4%</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Sparkline data={servicesSpark} color={TEAL} />
                </div>
              </div>

              {/* Card 4 — Open Risks */}
              <div style={card({ padding: "14px 14px 10px" })}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, color: MUTED, fontFamily: SANS }}>Open Risks</div>
                  <span style={{ fontSize: 14, color: RED }}>⚠</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={mono({ fontSize: 26, fontWeight: 700, color: TEXT, lineHeight: 1 })}>3</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: MUTED, fontFamily: SANS }}>
                  was <span style={mono({ color: DIM, fontSize: 11 })}>5</span>{" "}
                  <span style={{ color: GREEN }}>↓ improved −2</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Sparkline data={risksSpark} color={RED} />
                </div>
              </div>
            </div>

            {/* ── AGENT HEALTH ─────────────────────────────────────────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS }}>Agent Health</span>
                <span style={{ fontSize: 11, color: DIM, fontFamily: SANS }}>Last 5 days</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>

                {/* Sentinel */}
                <div style={card({ padding: "14px" })}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", display: "inline-block" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS }}>Sentinel</span>
                      </div>
                      <div style={{ fontSize: 10, color: DIM, marginTop: 2, fontFamily: SANS }}>Code review agent</div>
                    </div>
                    <ScoreBadge score={94} color="#a78bfa" trackColor={SCORE_TRACK} textColor={TEXT} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 12 }}>
                    {[{ label: "Scans", val: "247" }, { label: "Flags", val: "3" }, { label: "PRs", val: "24" }].map((m) => (
                      <div key={m.label} style={{ background: ELEVATED, borderRadius: 4, padding: "6px 8px" }}>
                        <div style={mono({ fontSize: 14, fontWeight: 700, color: TEXT })}>{m.val}</div>
                        <div style={{ fontSize: 10, color: DIM, fontFamily: SANS, letterSpacing: "0.02em" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <MiniBarChart data={sentinelBars} color="#a78bfa" />
                  </div>
                </div>

                {/* Fortress */}
                <div style={card({ padding: "14px" })}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS }}>Fortress</span>
                      </div>
                      <div style={{ fontSize: 10, color: DIM, marginTop: 2, fontFamily: SANS }}>Test suite agent</div>
                    </div>
                    <ScoreBadge score={87} color="#60a5fa" trackColor={SCORE_TRACK} textColor={TEXT} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 12 }}>
                    {[{ label: "Tests", val: "1,247" }, { label: "Flaky", val: "8" }, { label: "Pass", val: "98%" }].map((m) => (
                      <div key={m.label} style={{ background: ELEVATED, borderRadius: 4, padding: "6px 8px" }}>
                        <div style={mono({ fontSize: 14, fontWeight: 700, color: TEXT })}>{m.val}</div>
                        <div style={{ fontSize: 10, color: DIM, fontFamily: SANS, letterSpacing: "0.02em" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <MiniBarChart data={fortressBars} color="#60a5fa" />
                  </div>
                </div>

                {/* Visual Cortex */}
                <div style={card({ padding: "14px" })}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: TEAL, display: "inline-block" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS }}>Visual Cortex</span>
                      </div>
                      <div style={{ fontSize: 10, color: DIM, marginTop: 2, fontFamily: SANS }}>Service map agent</div>
                    </div>
                    <ScoreBadge score={96} color={TEAL} trackColor={SCORE_TRACK} textColor={TEXT} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 12 }}>
                    {[{ label: "Services", val: "142" }, { label: "Stale", val: "4" }, { label: "Fresh", val: "96%" }].map((m) => (
                      <div key={m.label} style={{ background: ELEVATED, borderRadius: 4, padding: "6px 8px" }}>
                        <div style={mono({ fontSize: 14, fontWeight: 700, color: TEXT })}>{m.val}</div>
                        <div style={{ fontSize: 10, color: DIM, fontFamily: SANS, letterSpacing: "0.02em" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <MiniBarChart data={cortexBars} color={TEAL} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── REPOSITORIES ─────────────────────────────────────────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS }}>Repositories</span>
                <span style={{ fontSize: 11, color: DIM, background: "#2a2f3a", padding: "1px 7px", borderRadius: 9, fontFamily: MONO }}>
                  6 connected
                </span>
                <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
                  <span style={{ fontSize: 11, color: GREEN, fontFamily: SANS }}>● Healthy 4</span>
                  <span style={{ fontSize: 11, color: AMBER, fontFamily: SANS }}>● Warning 1</span>
                  <span style={{ fontSize: 11, color: RED, fontFamily: SANS }}>● Critical 1</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

                {/* InfraZero — Critical */}
                <div style={card({ padding: "13px 14px", cursor: "pointer" })} onClick={() => navigate("/repo/infrazero")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: RED, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: TEXT, fontFamily: SANS }}>infrazero</span>
                    <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>main ·</span>
                    <span style={mono({ fontSize: 10, color: DIM })}>a3f2c1b</span>
                    <span style={{ marginLeft: "auto", color: RED, fontSize: 10, fontFamily: MONO }}>● critical</span>
                  </div>
                  <div style={{ padding: "7px 9px", background: ELEVATED, borderRadius: 4, marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS }}>
                      Sentinel <span style={{ color: RED }}>→ race condition flagged in writer.go</span>
                    </span>
                    <span style={mono({ fontSize: 10, color: DIM })}>12m</span>
                  </div>
                  <div style={{ padding: "7px 9px", background: ELEVATED, borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS }}>
                      Fortress <span style={{ color: GREEN }}>→ 247/247 tests passing</span>
                    </span>
                    <span style={mono({ fontSize: 10, color: DIM })}>1h</span>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>commit activity · 7d</span>
                      <span style={{ fontSize: 10, color: RED, fontFamily: MONO, fontWeight: 600 }}>↓ 38%</span>
                    </div>
                    <Sparkline data={[18, 22, 19, 28, 12, 7, 4]} color={RED} width="100%" height={36} showDots yLabels />
                  </div>
                </div>

                {/* Immersa — Warning */}
                <div style={card({ padding: "13px 14px", cursor: "pointer" })} onClick={() => navigate("/repo/immersa")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: AMBER, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: TEXT, fontFamily: SANS }}>immersa</span>
                    <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>main ·</span>
                    <span style={mono({ fontSize: 10, color: DIM })}>7d9a4e2</span>
                    <span style={{ marginLeft: "auto", color: AMBER, fontSize: 10, fontFamily: MONO }}>● warning</span>
                  </div>
                  <div style={{ padding: "7px 9px", background: ELEVATED, borderRadius: 4, marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS }}>
                      Sentinel <span style={{ color: GREEN }}>→ PR #214 clean, merged</span>
                    </span>
                    <span style={mono({ fontSize: 10, color: DIM })}>2h</span>
                  </div>
                  <div style={{ padding: "7px 9px", background: ELEVATED, borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS }}>
                      Fortress <span style={{ color: AMBER }}>→ 8 flaky tests quarantined</span>
                    </span>
                    <span style={mono({ fontSize: 10, color: DIM })}>29m</span>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>commit activity · 7d</span>
                      <span style={{ fontSize: 10, color: AMBER, fontFamily: MONO, fontWeight: 600 }}>~ volatile</span>
                    </div>
                    <Sparkline data={[9, 14, 22, 11, 18, 25, 16]} color={AMBER} width="100%" height={36} showDots yLabels />
                  </div>
                </div>

                {/* Nexlayer — Healthy */}
                <div style={card({ padding: "13px 14px", cursor: "pointer" })} onClick={() => navigate("/repo/nexlayer")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: GREEN, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: TEXT, fontFamily: SANS }}>nexlayer</span>
                    <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>main ·</span>
                    <span style={mono({ fontSize: 10, color: DIM })}>c19f3a7</span>
                    <span style={{ marginLeft: "auto", color: GREEN, fontSize: 10, fontFamily: MONO }}>● healthy</span>
                  </div>
                  <div style={{ padding: "7px 9px", background: ELEVATED, borderRadius: 4, marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS }}>
                      Sentinel <span style={{ color: GREEN }}>→ 0 issues in last scan</span>
                    </span>
                    <span style={mono({ fontSize: 10, color: DIM })}>4h</span>
                  </div>
                  <div style={{ padding: "7px 9px", background: ELEVATED, borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS }}>
                      Fortress <span style={{ color: GREEN }}>→ suite stable, 312 passing</span>
                    </span>
                    <span style={mono({ fontSize: 10, color: DIM })}>3h</span>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>commit activity · 7d</span>
                      <span style={{ fontSize: 10, color: GREEN, fontFamily: MONO, fontWeight: 600 }}>↑ 24%</span>
                    </div>
                    <Sparkline data={[8, 11, 13, 14, 17, 21, 24]} color={GREEN} width="100%" height={36} showDots yLabels />
                  </div>
                </div>

                {/* DataBridge — Healthy */}
                <div style={card({ padding: "13px 14px", cursor: "pointer" })} onClick={() => navigate("/repo/databridge")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: GREEN, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: TEXT, fontFamily: SANS }}>databridge</span>
                    <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>main ·</span>
                    <span style={mono({ fontSize: 10, color: DIM })}>e2b7d1f</span>
                    <span style={{ marginLeft: "auto", color: GREEN, fontSize: 10, fontFamily: MONO }}>● healthy</span>
                  </div>
                  <div style={{ padding: "7px 9px", background: ELEVATED, borderRadius: 4, marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS }}>
                      Cortex <span style={{ color: AMBER }}>→ 1 stale endpoint detected</span>
                    </span>
                    <span style={mono({ fontSize: 10, color: DIM })}>3h</span>
                  </div>
                  <div style={{ padding: "7px 9px", background: ELEVATED, borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, fontFamily: SANS }}>
                      Sentinel <span style={{ color: GREEN }}>→ no new findings</span>
                    </span>
                    <span style={mono({ fontSize: 10, color: DIM })}>5h</span>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>commit activity · 7d</span>
                      <span style={{ fontSize: 10, color: TEAL, fontFamily: MONO, fontWeight: 600 }}>↑ 12%</span>
                    </div>
                    <Sparkline data={[12, 15, 13, 16, 14, 17, 18]} color={TEAL} width="100%" height={36} showDots yLabels />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN — ACTIVITY FEED ────────────────────────────── */}
          <div style={{ width: 280, minWidth: 280, flexShrink: 0, display: "flex", flexDirection: "column" }}>

            {/* Activity header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS }}>Activity</span>
              <span style={{ fontSize: 10, color: GREEN, background: GRN_BG, border: `1px solid ${GRN_BD}`, padding: "2px 8px", borderRadius: 9, fontFamily: MONO }}>
                5 new • LIVE
              </span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }}>
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
                    background: "none", border: "none",
                    borderBottom: activityTab === tab.id ? `2px solid ${TEAL}` : "2px solid transparent",
                    color: activityTab === tab.id ? TEXT : MUTED,
                    fontSize: 11, padding: "5px 10px", cursor: "pointer",
                    fontFamily: SANS, fontWeight: activityTab === tab.id ? 500 : 400, marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Feed items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {filteredActivity.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "9px 10px",
                    background: idx === 0 ? ACT_HL : "transparent",
                    borderRadius: 5,
                    borderLeft: idx < 5 ? `4px solid ${item.color}` : "4px solid transparent",
                    marginBottom: 2,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: item.color, fontFamily: MONO, opacity: 0.85 }}>
                      {item.label.toLowerCase()} ·
                    </span>
                    <span style={{ fontSize: 10, color: DIM, marginLeft: "auto", fontFamily: MONO }}>{item.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, fontFamily: SANS, lineHeight: 1.4 }}>
                    {item.msg}{" "}
                    <span style={{ color: TEXT, fontWeight: 500 }}>·</span>{" "}
                    <span style={mono({ fontSize: 11, color: TEAL })}>{item.repo}</span>
                  </div>
                </div>
              ))}

              {filteredActivity.length === 0 && (
                <div style={{ padding: "24px 10px", textAlign: "center", color: DIM, fontSize: 12, fontFamily: SANS }}>
                  No activity
                </div>
              )}
            </div>

            {/* System status mini-panel */}
            <div style={{ ...card({ padding: "12px" }), marginTop: 16 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, fontFamily: SANS, fontWeight: 500 }}>System</div>
              {[
                { label: "API latency", val: "38ms",  color: GREEN },
                { label: "Queue depth", val: "12",    color: TEXT  },
                { label: "Agent uptime", val: "99.7%", color: GREEN },
                { label: "Storage",     val: "61%",   color: AMBER },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 11, color: MUTED, fontFamily: SANS }}>{row.label}</span>
                  <span style={mono({ fontSize: 11, color: row.color, fontWeight: 600 })}>{row.val}</span>
                </div>
              ))}
            </div>

            {/* Recent deployments */}
            <div style={{ ...card({ padding: "12px" }), marginTop: 10 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, fontFamily: SANS, fontWeight: 500 }}>Recent Deployments</div>
              {[
                { repo: "infrazero",  env: "prod",    sc: RED,   time: "14m ago" },
                { repo: "nexlayer",   env: "prod",    sc: GREEN, time: "2h ago"  },
                { repo: "immersa",    env: "staging", sc: GREEN, time: "3h ago"  },
              ].map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: i < 2 ? `1px solid ${BORDER}` : "none" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.sc, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: TEXT, fontFamily: SANS, flex: 1 }}>{d.repo}</span>
                  <span style={{ fontSize: 10, color: DIM, fontFamily: SANS }}>{d.env}</span>
                  <span style={mono({ fontSize: 10, color: DIM })}>{d.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DashboardPage };

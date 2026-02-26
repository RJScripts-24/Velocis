const fs = require('fs');
const path = "c:\\Users\\ADMIN\\Desktop\\velocis\\frontend\\src\\app\\pages\\DashboardPage.tsx";

const code = `import React, { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from 'motion/react';
import { LayoutDashboard, GitBranch, Shield, TestTube2, Eye, Activity, Settings, LogOut, CheckCircle, Zap, Home } from 'lucide-react';

const RepoSparkline = ({ 
  data, 
  color, 
  height = 56 
}: { 
  data: number[], 
  color: string, 
  height?: number 
}) => {
  const width = 400;
  const padding = { top: 8, bottom: 4, left: 2, right: 2 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((v - min) / range) * chartH,
  }));
  
  let linePath = \`M \${points[0].x} \${points[0].y}\`;
  for (let i = 1; i < points.length; i++) {
    const cp1x = points[i-1].x + (points[i].x - points[i-1].x) / 3;
    const cp1y = points[i-1].y;
    const cp2x = points[i].x - (points[i].x - points[i-1].x) / 3;
    const cp2y = points[i].y;
    linePath += \` C \${cp1x} \${cp1y} \${cp2x} \${cp2y} \${points[i].x} \${points[i].y}\`;
  }
  
  const areaPath = linePath 
    + \` L \${points[points.length-1].x} \${height}\`
    + \` L \${points[0].x} \${height} Z\`;
  
  const gradId = \`grad-\${color.replace('#','')}-\${Math.random().toString(36).slice(2,6)}\`;
  
  return (
    <svg 
      viewBox={\`0 0 \${width} \${height}\`}
      width="100%" 
      height={height}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="60%" stopColor={color} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={\`glow-\${gradId}\`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={areaPath} fill={\`url(#\${gradId})\`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={\`url(#glow-\${gradId})\`}
      />
      <circle
        cx={points[points.length-1].x}
        cy={points[points.length-1].y}
        r="3"
        fill={color}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1.5"
      >
        <animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

export function DashboardPage() {
  const [activityTab, setActivityTab] = useState("all");
  const [activeNav, setActiveNav] = useState("dashboard");
  const navigate = useNavigate();

  const BG = "linear-gradient(135deg, #0a0e1a 0%, #0d1224 40%, #080c18 100%)";
  const TEAL = "#10B981";
  const GREEN = "#34D399";
  const AMBER = "#FBBF24";
  const RED = "#EF4444";
  const TEXT = "#FFFFFF";
  const MUTED = "rgba(255,255,255,0.65)";
  const DIM = "rgba(255,255,255,0.45)";
  const MONO = "'Inter', sans-serif";
  const SANS = "'Inter', sans-serif";

  const allActivity = [
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "Flagged potential race condition", repo: "InfraZero", time: "12m ago" },
    { agent: "fortress", color: "#60a5fa", label: "Fortress", msg: "3 flaky tests auto-quarantined", repo: "Immersa", time: "29m ago" },
    { agent: "cortex", color: TEAL, label: "Cortex", msg: "Service map updated — 2 new nodes", repo: "InfraZero", time: "58s ago" },
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "PR #214 reviewed, 1 critical finding", repo: "Nexlayer", time: "1h ago" },
    { agent: "fortress", color: "#60a5fa", label: "Fortress", msg: "Full suite passed after hotfix", repo: "Immersa", time: "2h ago" },
    { agent: "cortex", color: TEAL, label: "Cortex", msg: "Detected 1 stale service endpoint", repo: "DataBridge", time: "3h ago" },
    { agent: "sentinel", color: "#a78bfa", label: "Sentinel", msg: "Dependency audit: 0 new CVEs", repo: "Immersa", time: "4h ago" },
  ];

  const filteredActivity = activityTab === "all" ? allActivity : allActivity.filter((a) => a.agent === activityTab);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", background: BG, color: TEXT, fontFamily: SANS, fontSize: 13, overflow: "hidden", position: 'relative' }}>
      <style>{\`
        * { scrollbar-width: none; ms-overflow-style: none; }
        ::-webkit-scrollbar { display: none; }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        @keyframes statusPing { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }
        .right-col::-webkit-scrollbar { display: none; }
      \`}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 15% 20%, rgba(29,78,216,0.12) 0%, rgba(109,40,217,0.06) 40%, transparent 70%)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 50% at 85% 80%, rgba(5,150,105,0.08) 0%, transparent 60%)' }} />

      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '220px', zIndex: 200, background: 'rgba(8,12,26,0.85)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(99,155,255,0.08)', display: 'flex', flexDirection: 'column', padding: '0' }}>
        <div style={{ height: '64px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3B82F6, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', fontFamily: MONO }}>V</span>
          </div>
          <span style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px', fontFamily: SANS }}>Velocis</span>
        </div>
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column' }}>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'repositories', icon: GitBranch, label: 'Repositories' },
            { id: 'sentinel', icon: Shield, label: 'Sentinel' },
            { id: 'fortress', icon: TestTube2, label: 'Fortress' },
            { id: 'cortex', icon: Eye, label: 'Visual Cortex' },
            { id: 'activity', icon: Activity, label: 'Activity' },
          ].map((item) => {
            const isActive = activeNav === item.id;
            const Icon = item.icon;
            return (
              <div key={item.id} onClick={() => setActiveNav(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '2px',
                  background: isActive ? 'linear-gradient(135deg, rgba(59,130,246,0.20), rgba(109,40,217,0.15))' : 'transparent', border: isActive ? '1px solid rgba(99,155,255,0.20)' : '1px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)' } }}
              >
                <Icon size={17} strokeWidth={1.8} style={{ color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.30)' }} />
                <span style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.40)', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[ { id: 'settings', icon: Settings, label: 'Settings' }, { id: 'logout', icon: LogOut, label: 'Log out' } ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '2px', background: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <Icon size={17} strokeWidth={1.8} style={{ color: 'rgba(255,255,255,0.30)' }} />
                <span style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.40)', fontWeight: 400 }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginLeft: '220px', minHeight: '100vh', zIndex: 10 }}>
        <header style={{ height: '56px', flexShrink: 0, borderBottom: '1px solid rgba(99,155,255,0.07)', background: 'rgba(8,12,26,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: "flex", alignItems: "center", padding: "0 32px", gap: 0, position: "relative", zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: SANS }}>
              <Home size={14} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }} onClick={() => navigate("/")} />
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>/</span>
              <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14 }}>Dashboard</span>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: '10px', padding: "5px 12px", width: 280 }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>⌕</span>
              <input placeholder="Search..." style={{ background: "none", border: "none", outline: "none", color: 'rgba(255,255,255,0.6)', fontSize: '13px', width: "100%", fontFamily: SANS }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', borderRadius: 3, padding: "1px 4px", fontFamily: MONO }}>⌘K</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)', color: '#34D399', padding: "5px 12px", borderRadius: 8, fontFamily: SANS, fontWeight: 600, fontSize: 12 }}>● sys ok</span>
            <span style={{ background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.20)', color: '#EAB308', padding: "5px 12px", borderRadius: 8, fontFamily: SANS, fontWeight: 600, fontSize: 12 }}>● 1 warn</span>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: "0 4px" }} />
            <div style={{ display: "flex", gap: 1 }}>
              {["1h", "24h", "7d", "30d"].map((t) => (
                <button key={t} style={{ background: t === "24h" ? 'rgba(59,130,246,0.15)' : "none", border: t === "24h" ? '1px solid rgba(59,130,246,0.25)' : "1px solid transparent", color: t === "24h" ? '#60A5FA' : 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: t === "24h" ? 600 : 500, padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontFamily: SANS }}>{t}</button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: "0 4px" }} />
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e293b", border: \`1px solid #60A5FA\`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", fontFamily: MONO }}>R</span>
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gridTemplateRows: 'auto auto', gap: '0', width: '100%', minHeight: '100vh', alignItems: 'start' }}>
          
          <div style={{ padding: '32px 24px 48px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start', marginBottom: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: '10px' }}>
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, Rishi
                </div>
                <div style={{ fontSize: '40px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-1.5px', lineHeight: 1.1 }}>Your systems are</div>
                <div style={{ fontSize: '40px', fontWeight: 700, background: 'linear-gradient(90deg, #34D399, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-1.5px', lineHeight: 1.1 }}>running well.</div>
                <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>3 agents monitoring your codebase in real-time.<br/>All critical systems operational.</div>
                
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', marginTop: '28px' }}>
                  {[ { label: 'Healthy Repos', value: '4', bg: 'rgba(16, 185, 129, 0.07)', hoverBg: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.18)', hoverBorder: '1px solid rgba(16, 185, 129, 0.30)', boxShadow: '0 2px 12px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.04)', hoverBoxShadow: '0 4px 16px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.04)', dotBg: '#10B981', dotBoxShadow: '0 0 6px rgba(16,185,129,0.6)', animation: 'statusPing 2.5s ease-in-out infinite', dividerBg: 'rgba(16,185,129,0.20)', labelColor: 'rgba(255,255,255,0.45)' }, { label: 'Warnings', value: '1', bg: 'rgba(234, 179, 8, 0.07)', hoverBg: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.18)', hoverBorder: '1px solid rgba(234, 179, 8, 0.30)', boxShadow: '0 2px 12px rgba(234,179,8,0.06), inset 0 1px 0 rgba(255,255,255,0.04)', hoverBoxShadow: '0 4px 16px rgba(234,179,8,0.12), inset 0 1px 0 rgba(255,255,255,0.04)', dotBg: '#EAB308', dotBoxShadow: '0 0 6px rgba(234,179,8,0.6)', animation: 'none', dividerBg: 'rgba(234,179,8,0.20)', labelColor: 'rgba(255,255,255,0.45)' }, { label: 'Critical', value: '1', bg: 'rgba(239, 68, 68, 0.07)', hoverBg: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.18)', hoverBorder: '1px solid rgba(239, 68, 68, 0.30)', boxShadow: '0 2px 12px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.04)', hoverBoxShadow: '0 4px 16px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.04)', dotBg: '#EF4444', dotBoxShadow: '0 0 6px rgba(239,68,68,0.6)', animation: 'none', dividerBg: 'rgba(239,68,68,0.20)', labelColor: 'rgba(255,255,255,0.45)' }, { label: 'Open Risks', value: '3', bg: 'rgba(255,255,255,0.04)', hoverBg: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)', hoverBorder: '1px solid rgba(255,255,255,0.20)', boxShadow: '0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)', hoverBoxShadow: '0 4px 16px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.04)', dotBg: 'rgba(255,255,255,0.35)', dotBoxShadow: 'none', animation: 'none', dividerBg: 'rgba(255,255,255,0.10)', labelColor: 'rgba(255,255,255,0.35)' } ].map((pill, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 18px', borderRadius: '12px', background: pill.bg, border: pill.border, boxShadow: pill.boxShadow, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', cursor: 'default', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => { e.currentTarget.style.background = pill.hoverBg; e.currentTarget.style.border = pill.hoverBorder; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = pill.hoverBoxShadow; }} onMouseLeave={e => { e.currentTarget.style.background = pill.bg; e.currentTarget.style.border = pill.border; e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = pill.boxShadow; }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pill.dotBg, boxShadow: pill.dotBoxShadow, animation: pill.animation, flexShrink: 0 }} />
                      <div style={{ width: '1px', height: '16px', background: pill.dividerBg, flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.5px', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>{pill.value}</span>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: pill.labelColor, fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em', lineHeight: 1, marginTop: '1px' }}>{pill.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.20) 0%, rgba(109,40,217,0.12) 100%)', border: '1px solid rgba(99,155,255,0.18)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(16px)', width: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: '16px' }}>SYSTEM STATUS</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Activity size={15} color="#34D399" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>sys ok</span>
                  <div style={{ width: '6px', height: '6px', borderRadius: "50%", background: '#34D399', animation: 'ping 2s ease-out infinite', marginLeft: 'auto' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <CheckCircle size={15} color="#34D399" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>99.7%</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>Uptime</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Zap size={15} color="#60A5FA" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>38ms</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>API latency</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)'}}>Last checked 2m ago</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>Repositories</span>
              <div style={{ display: "flex", gap: "16px", marginLeft: 4, alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }}/> Healthy 4</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: AMBER }}/> Warning 1</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: RED }}/> Critical 1</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: '0' }}>
              {[
                { name: "infrazero", status: "critical", color: '#EF4444', nav: "/repo/infrazero", spark: [18, 22, 19, 28, 12, 7, 4], pct: "↓ 38%", ptCol: '#EF4444', agents: [ { name: "Sentinel", aColor: "#a78bfa", desc: "race condition flagged in writer.go", dColor: RED, time: "12m" }, { name: "Fortress", aColor: "#60a5fa", desc: "247/247 tests passing", dColor: GREEN, time: "1h" } ]},
                { name: "immersa", status: "warning", color: '#EAB308', nav: "/repo/immersa", spark: [9, 14, 22, 11, 18, 25, 16], pct: "~ volatile", ptCol: '#EAB308', agents: [ { name: "Sentinel", aColor: "#a78bfa", desc: "PR #214 clean, merged", dColor: GREEN, time: "2h" }, { name: "Fortress", aColor: "#60a5fa", desc: "8 flaky tests quarantined", dColor: AMBER, time: "29m" } ]},
                { name: "nexlayer", status: "healthy", color: '#34D399', nav: "/repo/nexlayer", spark: [8, 11, 13, 14, 17, 21, 24], pct: "↑ 24%", ptCol: '#34D399', agents: [ { name: "Sentinel", aColor: "#a78bfa", desc: "0 issues in last scan", dColor: GREEN, time: "4h" }, { name: "Fortress", aColor: "#60a5fa", desc: "suite stable, 312 passing", dColor: GREEN, time: "3h" } ]},
                { name: "databridge", status: "healthy", color: '#34D399', nav: "/repo/databridge", spark: [12, 15, 13, 16, 14, 17, 18], pct: "↑ 12%", ptCol: '#34D399', agents: [ { name: "Cortex", aColor: TEAL, desc: "1 stale endpoint detected", dColor: AMBER, time: "3h" }, { name: "Sentinel", aColor: "#a78bfa", desc: "no new findings", dColor: GREEN, time: "5h" } ]},
              ].map((repo, idx) => (
                <div key={idx} style={{ background: 'rgba(13,18,36,0.80)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: '16px', padding: '22px 22px 16px 22px', backdropFilter: 'blur(16px) saturate(140%)', position: 'relative', overflow: 'hidden', transition: 'all 0.25s ease', cursor: "pointer" }} onClick={() => navigate(repo.nav)} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(18,26,52,0.90)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.20)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,155,255,0.10)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(13,18,36,0.80)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.10)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: repo.color, borderRadius: '16px 16px 0 0' }} />
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: \`radial-gradient(circle, \${repo.color}15, transparent)\`, pointerEvents: 'none' }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#FFFFFF', letterSpacing: '-0.4px', fontFamily: 'Inter, sans-serif' }}>{repo.name}</span>
                    <span style={{ marginLeft: "auto", color: repo.color, fontSize: '11px', fontWeight: 700, padding: "4px 12px", borderRadius: '8px', background: repo.color + '15', border: \`1px solid \${repo.color}35\`, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif' }}>{repo.status}</span>
                  </div>
                  {repo.agents.map((ag, aIdx) => (
                    <div key={aIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: ag.aColor, flexShrink: 0, marginRight: '4px', fontFamily: 'Inter, sans-serif' }}>{ag.name} →</span>
                      <span style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'Inter, sans-serif' }}><span style={{ color: ag.dColor, fontWeight: 500 }}>{ag.desc}</span></span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>{ag.time}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '16px', position: 'relative' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.20)', marginBottom: '8px', letterSpacing: '0.03em', fontFamily: 'Inter, sans-serif' }}>commit activity · 7d</div>
                    <div style={{ position: 'relative', height: '56px' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '24px', background: 'linear-gradient(to right, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '24px', background: 'linear-gradient(to left, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                      <RepoSparkline data={repo.spark} color={repo.color} height={56} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '13px', fontWeight: 700, color: repo.ptCol }}>{repo.pct}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="right-col" style={{ position: 'sticky', top: '56px', height: 'calc(100vh - 56px)', overflowY: 'auto', scrollbarWidth: 'none', borderLeft: '1px solid rgba(99,155,255,0.07)', padding: '20px 16px', backgroundColor: 'rgba(8,12,26,0.50)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(13,18,36,0.60)', border: '1px solid rgba(99,155,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>Activity</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: '11px', fontWeight: 600, background: 'rgba(52,211,153,0.10)', border: \`1px solid rgba(52,211,153,0.20)\`, padding: "4px 12px", borderRadius: '20px', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>5 new • <div style={{ position: 'relative', width: 6, height: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: '#34D399', position: 'absolute' }} /><div style={{ width: 6, height: 6, borderRadius: "50%", background: '#34D399', position: 'absolute', animation: 'ping 2s ease-out infinite' }} /></div><span style={{ color: '#34D399', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE</span></span>
              </div>
              <div style={{ display: "flex", gap: '4px', padding: '10px 18px 0' }}>
                {[ { id: "all", label: "All" }, { id: "sentinel", label: "Sentinel" }, { id: "fortress", label: "Fortress" }, { id: "cortex", label: "Cortex" } ].map((tab) => (
                  <button key={tab.id} onClick={() => setActivityTab(tab.id)} style={{ background: activityTab === tab.id ? 'rgba(59,130,246,0.15)' : "none", border: activityTab === tab.id ? '1px solid rgba(59,130,246,0.20)' : "1px solid transparent", color: activityTab === tab.id ? '#60A5FA' : "rgba(255,255,255,0.30)", fontSize: '12px', padding: "4px 12px", cursor: "pointer", borderRadius: '7px', fontFamily: 'Inter, sans-serif', fontWeight: 500, transition: 'color 0.2s' }}>{tab.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: '12px' }}>
                {filteredActivity.map((item, idx) => (
                  <div key={idx} style={{ padding: "12px 18px", borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: item.color, fontFamily: 'Inter, sans-serif' }}>{item.label}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginLeft: "auto", fontFamily: 'Inter, sans-serif', alignSelf: 'flex-start' }}>{item.time}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                      {item.msg} <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{item.repo}</span>
                    </div>
                  </div>
                ))}
                {filteredActivity.length === 0 && <div style={{ padding: "24px 10px", textAlign: "center", color: DIM, fontSize: 12, fontFamily: SANS }}>No activity</div>}
              </div>
            </div>

            <div style={{ background: 'rgba(13,18,36,0.60)', border: '1px solid rgba(99,155,255,0.08)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '14px', fontFamily: 'Inter, sans-serif' }}>SYSTEM</div>
              {[ { label: "API latency", val: "38ms", color: '#34D399' }, { label: "Queue depth", val: "12", color: '#FFFFFF' }, { label: "Agent uptime", val: "99.7%", color: '#34D399' }, { label: "Storage", val: "61%", color: '#EAB308' } ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: \`1px solid rgba(255,255,255,0.04)\` }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', fontFamily: 'Inter, sans-serif' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', color: row.color, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>{row.val}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(13,18,36,0.60)', border: '1px solid rgba(99,155,255,0.08)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '14px', fontFamily: 'Inter, sans-serif' }}>RECENT DEPLOYMENTS</div>
              {[ { repo: "infrazero", env: "prod", sc: RED, time: "14m ago" }, { repo: "nexlayer", env: "prod", sc: '#34D399', time: "2h ago" }, { repo: "immersa", env: "staging", sc: '#34D399', time: "3h ago" } ].map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: 'space-between', padding: "9px 0", borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.sc, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>{d.repo}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', fontFamily: 'Inter, sans-serif' }}>{d.env} {d.time}</span>
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

fs.writeFileSync(path, code);

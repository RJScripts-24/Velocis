const fs = require('fs');
const path = "c:\\Users\\ADMIN\\Desktop\\velocis\\frontend\\src\\app\\pages\\DashboardPage.tsx";

const code = `import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Home, Star } from 'lucide-react';

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
  let d = \\\`M \\\${pts[0].x} \\\${pts[0].y}\\\`;
  for (let i = 1; i < pts.length; i++) {
    const cx1 = pts[i-1].x + (pts[i].x - pts[i-1].x) / 3;
    const cx2 = pts[i].x - (pts[i].x - pts[i-1].x) / 3;
    d += \\\` C \\\${cx1} \\\${pts[i-1].y} \\\${cx2} \\\${pts[i].y} \\\${pts[i].x} \\\${pts[i].y}\\\`;
  }
  const area = d + \\\` L \\\${pts[pts.length-1].x} \\\${H} L \\\${pts[0].x} \\\${H} Z\\\`;
  const gId = \\\`sg\\\${Math.round(Math.random()*99999)}\\\`;
  return (
    <svg viewBox={\\\`0 0 \\\${W} \\\${H}\\\`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="70%" stopColor={color} stopOpacity="0.05"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={\\\`url(#\\\${gId})\\\`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3.5" fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5">
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
};

export function DashboardPage() {
  const [activityTab, setActivityTab] = useState("all");
  const navigate = useNavigate();

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'GOOD MORNING';
    if (hr < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ background: 'linear-gradient(135deg, #060914 0%, #0a0e1a 50%, #06080f 100%)', minHeight: '100vh', fontFamily: "'Inter', sans-serif", color: '#FFFFFF' }}>
      <style>{\\\`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after {
          font-family: 'Inter', -apple-system, sans-serif;
          box-sizing: border-box;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .activity-scroll::-webkit-scrollbar { display: none; }
        .right-panel::-webkit-scrollbar { display: none; }
      \\\`}</style>

      {/* FIXED GLOW LAYERS */}
      <div style={{ position: 'fixed', zIndex: 0, pointerEvents: 'none', width: '70vw', height: '70vh', top: '-20vh', left: '-10vw', background: 'radial-gradient(ellipse, rgba(29,78,216,0.12) 0%, transparent 65%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'fixed', zIndex: 0, pointerEvents: 'none', width: '50vw', height: '50vh', bottom: '-10vh', right: '-10vw', background: 'radial-gradient(ellipse, rgba(5,150,105,0.09) 0%, transparent 65%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'fixed', zIndex: 0, pointerEvents: 'none', width: '40vw', height: '40vh', top: '30vh', left: '35vw', background: 'radial-gradient(ellipse, rgba(109,40,217,0.06) 0%, transparent 65%)', filter: 'blur(60px)' }} />

      {/* NAVBAR */}
      <div style={{ 
        height: '56px', background: 'rgba(6,9,20,0.82)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(99,155,255,0.08)', boxShadow: '0 1px 0 rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '16px', position: 'sticky', top: 0, zIndex: 100 
      }}>
        {/* LEFT IDE */}
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3B82F6, #6D28D9)', color: '#FFFFFF', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>V</div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px', marginLeft: '8px' }}>Velocis</div>
        <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
          <Home size={14} color="rgba(255,255,255,0.35)" />
          <span style={{ color: 'rgba(255,255,255,0.20)', margin: '0 8px' }}>/</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Dashboard</span>
        </div>

        {/* CENTER */}
        <div style={{ flex: 1, maxWidth: '320px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', height: '34px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
          <Search size={14} color="rgba(255,255,255,0.25)" />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', flex: 1 }}>Search...</span>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>⌘K</div>
        </div>

        {/* RIGHT SIDE */}
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>sys ok</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.22)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#eab308' }} />
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#eab308' }}>1 warn</div>
          </div>
          <div style={{ display: 'flex', gap: '2px', marginLeft: '6px' }}>
            {['1h','24h','7d','30d'].map(t=> (
              <button key={t} style={{ border: 'none', background: t==='24h'?'rgba(255,255,255,0.10)':'transparent', fontSize: '12px', fontWeight: t==='24h'?700:500, padding: '4px 10px', borderRadius: '7px', cursor: 'pointer', color: t==='24h'?'#FFFFFF':'rgba(255,255,255,0.35)' }}>{t}</button>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)', marginLeft: '4px' }}>2m ago</div>
          <button style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '6px' }}>
            <Star size={15} color="rgba(255,255,255,0.50)" />
          </button>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6D28D9, #4F46E5)', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>R</span>
          </div>
        </div>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,155,255,0.15), transparent)', marginBottom: '0' }} />

      {/* MAIN CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 'calc(100vh - 56px)', alignItems: 'start', position: 'relative', zIndex: 10 }}>
        
        {/* LEFT COLUMN */}
        <div style={{ padding: '32px 24px 48px 32px' }}>
          
          {/* HERO */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '14px' }}>
              {getGreeting()}, RISHI
            </div>
            <div>
              <div style={{ fontSize: 'clamp(42px, 5vw, 64px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-2.5px', lineHeight: 1.05, display: 'block', marginBottom: '4px' }}>Your systems are </div>
              <div style={{ fontSize: 'clamp(42px, 5vw, 64px)', fontWeight: 800, background: 'linear-gradient(90deg, #34D399 0%, #10B981 50%, #06B6D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-2.5px', lineHeight: 1.05, display: 'block' }}>running well</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '16px', fontSize: '15px', color: 'rgba(255,255,255,0.45)' }}>
              <div>{currentDate}</div>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.20)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#22c55e' }}>3 agents running</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#eab308' }} />
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#eab308' }}>1 warning active</div>
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', gap: '10px' }}>
              {[
                { label: 'Healthy Repos', value: '4', bg: 'rgba(16, 185, 129, 0.07)', border: '1px solid rgba(16, 185, 129, 0.18)', dot: '#10B981', div: 'rgba(16,185,129,0.20)', anim: 'pulse 2.5s ease-in-out infinite' },
                { label: 'Warnings', value: '1', bg: 'rgba(234, 179, 8, 0.07)', border: '1px solid rgba(234, 179, 8, 0.18)', dot: '#EAB308', div: 'rgba(234,179,8,0.20)', anim: 'none' },
                { label: 'Critical', value: '1', bg: 'rgba(239, 68, 68, 0.07)', border: '1px solid rgba(239, 68, 68, 0.18)', dot: '#EF4444', div: 'rgba(239,68,68,0.20)', anim: 'none' },
                { label: 'Open Risks', value: '3', bg: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', dot: 'rgba(255,255,255,0.35)', div: 'rgba(255,255,255,0.10)', anim: 'none' }
              ].map((pill, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 18px', borderRadius: '12px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: pill.bg, border: pill.border, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.2)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pill.dot, animation: pill.anim, flexShrink: 0 }} />
                  <div style={{ width: '1px', height: '16px', background: pill.div, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>{pill.value}</div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', lineHeight: 1, marginTop: '2px' }}>{pill.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REPOSITORIES */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.5px' }}>Repositories</div>
            <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}><div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }}/>Healthy 4</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}><div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#eab308' }}/>Warning 1</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}><div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }}/>Critical 1</div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)', marginBottom: '20px', marginTop: '12px' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* infrazero */}
            <div style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', backdropFilter: 'blur(20px) saturate(150%)', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px 20px 14px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
              onClick={() => navigate('/repo/infrazero')}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,20,40,0.85)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.22)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,155,255,0.10)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,14,26,0.70)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.10)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '16px 16px 0 0', background: 'linear-gradient(90deg, #EF4444, #EF444460, transparent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.4px' }}>infrazero</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#EF444418', border: '1px solid #EF444440', color: '#EF4444' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#EF4444' }} />CRITICAL
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px', margin: '0 -8px', borderRadius: '6px', transition: 'background 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', flexShrink: 0 }}>Sentinel →</div>
                  <div style={{ fontSize: '13px', color: '#EF4444', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>race condition flagged in writer.go</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>12m</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px', margin: '0 -8px', borderRadius: '6px', transition: 'background 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>Fortress →</div>
                  <div style={{ fontSize: '13px', color: '#34D399', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>247/247 tests passing</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>1h</div>
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginBottom: '6px', letterSpacing: '0.03em' }}>commit activity · 7d</div>
                <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', height: '56px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to right, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to left, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                  <RepoSparkline data={[8,6,9,7,10,8,12,9,7,6,8,5,4,3]} color="#EF4444" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>↓ 38%</div>
              </div>
            </div>
            
            {/* immersa */}
            <div style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', backdropFilter: 'blur(20px) saturate(150%)', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px 20px 14px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
              onClick={() => navigate('/repo/immersa')}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,20,40,0.85)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.22)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,155,255,0.10)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,14,26,0.70)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.10)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '16px 16px 0 0', background: 'linear-gradient(90deg, #EAB308, #EAB30860, transparent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.4px' }}>immersa</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#EAB30818', border: '1px solid #EAB30840', color: '#EAB308' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#EAB308' }} />WARNING
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px', margin: '0 -8px', borderRadius: '6px', transition: 'background 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', flexShrink: 0 }}>Sentinel →</div>
                  <div style={{ fontSize: '13px', color: '#34D399', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>PR #214 clean, merged</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>2h</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px', margin: '0 -8px', borderRadius: '6px', transition: 'background 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>Fortress →</div>
                  <div style={{ fontSize: '13px', color: '#EAB308', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>8 flaky tests quarantined</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>29m</div>
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginBottom: '6px', letterSpacing: '0.03em' }}>commit activity · 7d</div>
                <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', height: '56px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to right, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to left, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                  <RepoSparkline data={[5,6,8,7,9,11,9,10,8,9,10,9,8,10]} color="#EAB308" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '13px', fontWeight: 700, color: '#EAB308' }}>~ volatile</div>
              </div>
            </div>

            {/* nexlayer */}
            <div style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', backdropFilter: 'blur(20px) saturate(150%)', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px 20px 14px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
              onClick={() => navigate('/repo/nexlayer')}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,20,40,0.85)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.22)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,155,255,0.10)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,14,26,0.70)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.10)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '16px 16px 0 0', background: 'linear-gradient(90deg, #34D399, #34D39960, transparent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.4px' }}>nexlayer</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#34D39918', border: '1px solid #34D39940', color: '#34D399' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34D399' }} />HEALTHY
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px', margin: '0 -8px', borderRadius: '6px', transition: 'background 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', flexShrink: 0 }}>Sentinel →</div>
                  <div style={{ fontSize: '13px', color: '#34D399', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>0 issues in last scan</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>4h</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px', margin: '0 -8px', borderRadius: '6px', transition: 'background 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>Fortress →</div>
                  <div style={{ fontSize: '13px', color: '#34D399', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>suite stable, 312 passing</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>3h</div>
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginBottom: '6px', letterSpacing: '0.03em' }}>commit activity · 7d</div>
                <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', height: '56px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to right, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to left, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                  <RepoSparkline data={[2,3,2.5,3,4,3.5,4,5,4.5,5,6,5.5,6,7]} color="#34D399" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '13px', fontWeight: 700, color: '#34D399' }}>↑ 24%</div>
              </div>
            </div>

            {/* databridge */}
            <div style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.10)', backdropFilter: 'blur(20px) saturate(150%)', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)', borderRadius: '16px', padding: '18px 20px 14px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
              onClick={() => navigate('/repo/databridge')}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,20,40,0.85)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.22)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,155,255,0.10)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,14,26,0.70)'; e.currentTarget.style.border = '1px solid rgba(99,155,255,0.10)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '16px 16px 0 0', background: 'linear-gradient(90deg, #34D399, #34D39960, transparent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.4px' }}>databridge</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#34D39918', border: '1px solid #34D39940', color: '#34D399' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34D399' }} />HEALTHY
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px', margin: '0 -8px', borderRadius: '6px', transition: 'background 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#34D399', flexShrink: 0 }}>Cortex →</div>
                  <div style={{ fontSize: '13px', color: '#EAB308', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>1 stale endpoint detected</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>3h</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '6px', margin: '0 -8px', borderRadius: '6px', transition: 'background 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', flexShrink: 0 }}>Sentinel →</div>
                  <div style={{ fontSize: '13px', color: '#34D399', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>no new findings</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 'auto' }}>5h</div>
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginBottom: '6px', letterSpacing: '0.03em' }}>commit activity · 7d</div>
                <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', height: '56px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to right, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20px', background: 'linear-gradient(to left, rgba(13,18,36,0.80), transparent)', zIndex: 1, pointerEvents: 'none' }} />
                  <RepoSparkline data={[3,3.5,3,4,3.5,4,4.5,4,5,4.5,5,5.5,5,6]} color="#34D399" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '13px', fontWeight: 700, color: '#34D399' }}>↑ 12%</div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ borderLeft: '1px solid rgba(99,155,255,0.07)', background: 'rgba(6,9,20,0.40)', backdropFilter: 'blur(20px)', padding: '20px 16px', position: 'sticky', top: '56px', height: 'calc(100vh - 56px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* ACTIVITY PANEL */}
          <div style={{ background: 'rgba(13,18,36,0.75)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '420px', flexShrink: 0 }}>
            {/* PANEL HEADER */}
            <div style={{ padding: '16px 18px 0 18px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>Activity</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.20)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>5 new</div>
                  <div style={{ position: 'relative', width: '8px', height: '8px' }}>
                    <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: 'rgba(34,197,94,0.3)', animation: 'ping 2s infinite ease-out' }} />
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', position: 'absolute', top: '1px', left: '1px' }} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', letterSpacing: '0.05em' }}>LIVE</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', padding: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['All', 'Sentinel', 'Fortress', 'Cortex'].map(tab => (
                  <button key={tab} style={{
                    padding: '5px 12px', borderRadius: '8px',
                    background: tab === 'All' ? 'rgba(59,130,246,0.15)' : 'transparent',
                    border: tab === 'All' ? '1px solid rgba(59,130,246,0.20)' : 'none',
                    fontSize: '12px', fontWeight: tab === 'All' ? 600 : 500,
                    color: tab === 'All' ? '#60A5FA' : 'rgba(255,255,255,0.30)',
                    cursor: 'pointer'
                  }}>{tab}</button>
                ))}
              </div>
            </div>
            
            {/* SCROLLABLE ITEMS */}
            <div className="activity-scroll" style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, scrollbarWidth: 'none' }}>
              {[
                { Agent: "SENTINEL", agentColor: '#7C3AED', time: '12m ago', Text: "Flagged potential race condition · ", Repo: "InfraZero" },
                { Agent: "FORTRESS", agentColor: '#2563EB', time: '29m ago', Text: "3 flaky tests auto-quarantined · ", Repo: "Immersa" },
                { Agent: "CORTEX", agentColor: '#34D399', time: '58s ago', Text: "Service map updated — 2 new nodes · ", Repo: "InfraZero" },
                { Agent: "SENTINEL", agentColor: '#7C3AED', time: '1h ago', Text: "PR #214 reviewed, 1 critical finding · ", Repo: "Nexlayer" },
                { Agent: "FORTRESS", agentColor: '#2563EB', time: '2h ago', Text: "Full suite passed after hotfix · ", Repo: "Immersa" },
              ].map((it, i) => (
                <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'default', transition: 'background 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: it.agentColor }}>{it.Agent}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{it.time}</div>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.60)', display: 'inline' }}>{it.Text}</div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', display: 'inline' }}>{it.Repo}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SYSTEM PANEL */}
          <div style={{ background: 'rgba(10,14,26,0.70)', border: '1px solid rgba(99,155,255,0.08)', backdropFilter: 'blur(20px)', borderRadius: '16px', padding: '20px', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', marginBottom: '14px' }}>SYSTEM</div>
            {[
              { label: 'API latency', val: '38ms', color: '#34D399', bc: '#34D399' },
              { label: 'Queue depth', val: '12', color: '#FFFFFF', bc: 'rgba(255,255,255,0.20)' },
              { label: 'Agent uptime', val: '99.7%', color: '#34D399', bc: '#34D399' },
              { label: 'Storage', val: '61%', color: '#EAB308', bc: '#EAB308' }
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '10px', borderLeft: \`2px solid \${r.bc}\`, transition: 'border-color 0.2s ease', fontSize: '13px', color: 'rgba(255,255,255,0.40)' }}>{r.label}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: r.color }}>{r.val}</div>
              </div>
            ))}
          </div>

          {/* RECENT DEPLOYMENTS PANEL */}
          <div style={{ background: 'rgba(13,18,36,0.75)', border: '1px solid rgba(99,155,255,0.10)', borderRadius: '16px', padding: '18px', flexShrink: 0 }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', marginBottom: '14px' }}>Recent Deployments</p>
            {[
              { color: '#EF4444', name: 'infrazero', desc: 'prod 14m ago', bTop: true },
              { color: '#34D399', name: 'nexlayer', desc: 'prod 2h ago', bTop: true },
              { color: '#34D399', name: 'immersa', desc: 'staging 3h ago', bTop: false }
            ].map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: d.bTop ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>{d.desc}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path, code);

"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router';
import {
    Shield, Lock, Network, Zap, Brain, GitMerge, ArrowDown, Check, X,
    Github, ChevronRight, Eye, Code2, TestTube2, Map, Webhook, Cpu,
    Database, Globe, Layers, Sparkles, Terminal, Activity, Clock,
    GitBranch, Play, RotateCcw, Circle, Square, Triangle, BookOpen, Rocket, ArrowUpRight
} from "lucide-react";

// ─── Fonts & Global Styles ───────────────────────────────────────────────────
const FontStyle = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-feature-settings: "kern" 1, "liga" 1, "calt" 1, "ss01" 1; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
    ::selection { background: rgba(26,127,60,0.15); color: #16141A; }
    *:focus-visible { outline: 2px solid #1A7F3C; outline-offset: 3px; }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #F7F6F3; }
    ::-webkit-scrollbar-thumb { background: #D4D0C8; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #16141A; }

    .font-bask { font-family: 'Libre Baskerville', Georgia, serif; text-shadow: 0 1px 0 rgba(255,255,255,0.8); }
    .font-inter { font-family: 'Inter', -apple-system, sans-serif; }
    .inter-body { font-size: 17px; max-width: 65ch; letter-spacing: -0.01em; }

    .nav-link-light {
      font-family: 'Inter', sans-serif; font-weight: 500; font-size: 14px;
      color: #4B4856; position: relative; transition: color 0.2s; text-decoration: none;
    }
    .nav-link-light::after {
      content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 2px;
      background: #1A7F3C; transform: scaleX(0); transform-origin: right; transition: transform 0.15s ease;
    }
    .nav-link-light:hover { color: #16141A; }
    .nav-link-light:hover::after, .nav-link-light.active::after { transform: scaleX(1); transform-origin: left; transition: transform 0.2s ease; }
    .nav-link-light.active { font-weight: 600; color: #16141A; }

    @keyframes logoDotBlink { 0%,100%{opacity:1} 50%{opacity:0} }
    .logo-dot { animation: logoDotBlink 1.2s step-end infinite; display:inline-block;width:2px;height:14px;background:#1A7F3C;margin-left:2px;vertical-align:middle; }
    .logo-container:hover .logo-dot { animation: none; opacity: 1; }
    
    .scroll-progress-container { position:fixed;top:0;left:0;height:2px;width:100%;z-index:9999;pointer-events:none; }
    .scroll-progress-bar { height:100%;background:linear-gradient(to right,#1A7F3C,#3FB950,#22C55E); position:relative; }
    .scroll-progress-glow { position:absolute; right:0; top:-1px; width:4px; height:4px; background:#3FB950; border-radius:50%; box-shadow:0 0 6px #3FB950; transform:translateX(50%); }

    .drop-cap::first-letter { font-family:'Libre Baskerville',Georgia,serif;font-size:4.2em;font-weight:700;float:left;line-height:.82;color:#1A7F3C;margin-right:10px;padding-right:2px;text-shadow:0 0 30px rgba(26,127,60,0.2); }

    .code-frag { position: absolute; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(26,127,60,1); white-space: nowrap; pointer-events: none; will-change: transform; animation: floatCode linear infinite; }
    @keyframes floatCode { 0% { transform: translateY(0px) translateX(0px); opacity: 0.22; } 33% { transform: translateY(-12px) translateX(4px); opacity: 0.32; } 66% { transform: translateY(-6px) translateX(-4px); opacity: 0.26; } 100% { transform: translateY(0px) translateX(0px); opacity: 0.22; } }

    @keyframes orb1Drift { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-20px)} }
    @keyframes orb2Drift { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,25px)} }
    @keyframes orb3Drift { 0%{transform:translate(0,0)} 100%{transform:translate(20px,30px)} }
    @keyframes orb4Drift { 0%{transform:translate(0,0)} 100%{transform:translate(-40px,-15px)} }

    table { border-collapse: collapse; }
    .comp-row:hover { background: #F0FDF4 !important; transition: background 150ms; }
    
    @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(26,127,60,0.4); } 100% { box-shadow: 0 0 0 8px rgba(26,127,60,0); } }
    .pulse-pill { animation: pulseRing 2s infinite; }
    
    @keyframes glowDotPulse { 0%, 100% { opacity: 1; filter: brightness(1); } 50% { opacity: 0.3; filter: brightness(1.5); } }
    .glow-dot { animation: glowDotPulse 1.5s infinite; }
    
    @keyframes scrollDot { 0%, 100% { opacity: 0.2; transform: translateY(0); } 50% { opacity: 1; transform: translateY(6px); } }
    @keyframes spinLinear { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin-slow { animation: spinLinear 20s linear infinite; }

    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
  `}</style>
);

// ─── Animation 6: Global Grain Overlay ───────────────────────────────────────
const GrainOverlay: React.FC = () => (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 998, pointerEvents: 'none', opacity: 0.04 }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <filter id="grain">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
    </div>
);

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1500, start = false) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!start) return;
        let cur = 0;
        const step = target / (duration / 16);
        const t = setInterval(() => {
            cur = Math.min(cur + step, target);
            setVal(Math.floor(cur));
            if (cur >= target) clearInterval(t);
        }, 16);
        return () => clearInterval(t);
    }, [start, target, duration]);
    return val;
}

// ─── Fade-up wrapper ──────────────────────────────────────────────────────────
const FadeUp: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
    children, delay = 0, className = "",
}) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
        className={className}
    >
        {children}
    </motion.div>
);

// ─── Section Label ────────────────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({
    children, color = "#1A7F3C",
}) => (
    <span className="font-mono-jb" style={{
        fontSize: "11px", color, letterSpacing: "0.14em",
    }}>
        {children}
    </span>
);

// ─── Animation 1: Hero Neural Network Canvas ─────────────────────────────────
const HeroCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        resize();
        window.addEventListener('resize', resize);
        const isMobile = window.innerWidth < 768;
        const COUNT = isMobile ? 35 : 70;
        const nodes = Array.from({ length: COUNT }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
            r: 1.5 + Math.random() * 1.5,
            pulse: 0, pulseDir: 0,
        }));
        let pulseTimer = 0;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pulseTimer++;
            if (pulseTimer > 180) {
                const n = nodes[Math.floor(Math.random() * nodes.length)];
                n.pulseDir = 1; pulseTimer = 0;
            }
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                if (a.pulseDir === 1) { a.pulse += 0.15; if (a.pulse >= 1) a.pulseDir = -1; }
                else if (a.pulseDir === -1) { a.pulse -= 0.15; if (a.pulse <= 0) { a.pulse = 0; a.pulseDir = 0; } }
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j]; const dx = a.x - b.x; const dy = a.y - b.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 120) {
                        const alpha = (1 - d / 120) * (a.pulse > 0 ? 0.38 : 0.12);
                        const col = 'rgba(26,127,60,' + alpha + ')';
                        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1;
                        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const pr = a.r + a.pulse * 4;
                ctx.beginPath();
                if (a.pulse > 0) {
                    ctx.shadowBlur = 16;
                    ctx.shadowColor = 'rgba(46,164,79,' + Math.round(a.pulse * 0.28 * 100) / 100 + ')';
                } else {
                    ctx.shadowColor = 'transparent';
                }
                ctx.arc(a.x, a.y, pr, 0, Math.PI * 2);
                const fillAlpha = a.pulse > 0 ? (0.38 + a.pulse * 0.20) : 0.18;
                ctx.fillStyle = a.pulse > 0
                    ? 'rgba(46,164,79,' + Math.round(fillAlpha * 100) / 100 + ')'
                    : 'rgba(26,127,60,0.18)';
                ctx.fill();
                a.x += a.vx; a.y += a.vy;
                if (a.x < 0 || a.x > canvas.width) a.vx *= -1;
                if (a.y < 0 || a.y > canvas.height) a.vy *= -1;
            }
            rafRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
};

// ─── STICKY NAV ───────────────────────────────────────────────────────────────
const StickyNav: React.FC<{ visible: boolean }> = ({ visible }) => {
    const links = [
        { label: "Mission", href: "#mission" },
        { label: "Culture", href: "#culture" },
        { label: "Open Roles", href: "#roles" },
        { label: "Benefits", href: "#benefits" },
        { label: "Team", href: "#team" },
    ];
    return (
        <AnimatePresence>
            {visible && (
                <motion.nav
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 text-[#16141A]"
                    style={{
                        height: 60,
                        background: "rgba(255,255,255,0.92)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        borderBottom: "1px solid #E8E5DF",
                        boxShadow: "0 1px 0 0 rgba(22,20,26,0.08)",
                    }}
                >
                    <a href="#hero" className="font-bask font-bold logo-container" style={{
                        fontSize: 18,
                        display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#16141A'
                    }}>
                        Velocis<span className="logo-dot" />
                    </a>
                    <div className="hidden md:flex items-center gap-8">
                        {links.map((l) => (
                            <a key={l.href} href={l.href} className="nav-link-light" onClick={(e) => { if (l.href.startsWith('/')) { e.preventDefault(); window.location.href = l.href; } }}>{l.label}</a>
                        ))}
                    </div>
                    <motion.a
                        href="#roles"
                        className="hidden md:flex items-center gap-2 font-inter font-semibold"
                        style={{
                            background: "#16141A", color: "#fff", borderRadius: 8,
                            fontSize: 13, padding: "9px 18px", textDecoration: "none"
                        }}
                        whileHover={{ y: -1, background: "#1A7F3C", boxShadow: "0 4px 12px rgba(26,127,60,0.25)", transition: { duration: 0.22, ease: [0.34, 1.56, 0.64, 1] } }}
                    >
                        View Open Roles
                    </motion.a>
                </motion.nav>
            )}
        </AnimatePresence>
    );
};

// ─── HERO ────────────────────────────────────────────────────────────────────
const HeroSection: React.FC = () => {
    const words1 = ["Build", "the", "future", "of"];
    const words2 = ["software", "engineering."];
    return (
        <section id="hero" className="relative" style={{ background: "#fff", paddingTop: 80, paddingBottom: 100, overflow: 'hidden', marginTop: 0 }}>
            <HeroCanvas />
            {/* Radial green glow around center */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 600px 320px at 50% 50%, rgba(26,127,60,0.045) 0%, transparent 70%)',
                animation: 'pulseHeroGlow 9s ease-in-out infinite'
            }} />
            <style>{`@keyframes pulseHeroGlow { 0%,100%{opacity:0.5;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} }`}</style>

            <div className="max-w-4xl mx-auto px-6 text-center" style={{ position: 'relative', zIndex: 1 }}>
                <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 15 }} style={{ marginBottom: 12 }}>
                    <span className="font-inter" style={{
                        fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em',
                        color: '#1A7F3C', border: '1px solid rgba(26,127,60,0.30)', borderRadius: 999,
                        padding: '4px 16px', display: 'inline-block', background: 'rgba(26,127,60,0.05)',
                        backdropFilter: 'blur(4px)'
                    }}>CAREERS AT VELOCIS</span>
                </motion.div>

                <h1 className="font-bask shadow-none" style={{
                    fontSize: "56px", fontWeight: 700,
                    lineHeight: 1.08, letterSpacing: "-0.03em", color: "#16141A",
                    maxWidth: 720, marginLeft: "auto", marginRight: "auto", textAlign: "center", textShadow: "none"
                }}>
                    {[...words1, ...words2].map((w, i) => (
                        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', marginRight: '0.22em' }}>
                            <motion.span
                                initial={{ opacity: 0, y: '110%', filter: 'blur(8px)' }}
                                animate={{ opacity: 1, y: '0%', filter: 'blur(0px)' }}
                                transition={{ duration: 0.65, delay: i * 0.055, ease: [0.22, 1, 0.36, 1] }}
                                style={{ display: 'inline-block' }}
                            >{w}</motion.span>
                        </span>
                    ))}
                </h1>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="font-inter mx-auto inter-body"
                    style={{ fontSize: 17, lineHeight: 1.68, color: "#6B6778", maxWidth: 460, marginTop: 16 }}
                >
                    We are a small team solving one of engineering's oldest problems. If you believe developers deserve better tools and better mentorship, you belong here.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}
                >
                    <div className="pulse-pill font-mono-jb" style={{ fontSize: 12, color: "#1A7F3C", border: "1px solid rgba(26,127,60,0.3)", padding: "5px 14px", borderRadius: 999, position: 'relative' }}>
                        3 open roles
                    </div>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="font-mono-jb" style={{ fontSize: 12, color: "#6B6778", border: "1px solid #E8E5DF", padding: "5px 14px", borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="pulse-pill" style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A7F3C' }} />
                        Remote friendly
                    </motion.div>
                </motion.div>
            </div>

            <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[0, 200, 400].map((d, i) => (
                        <div key={i} style={{ width: 3, height: 3, background: '#16141A', borderRadius: '50%', animation: 'scrollDot 1.5s ease infinite', animationDelay: `${d}ms` }} />
                    ))}
                </div>
                <span className="font-mono-jb" style={{ fontSize: 10, color: '#9B97A8', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>scroll</span>
            </div>
        </section>
    );
};

// ─── FULL-WIDTH MISSION VISUAL PANEL ──────────────────────────────────────────
const MissionPanel: React.FC = () => {
    return (
        <section style={{ background: "#fff", paddingBottom: 80 }}>
            <div className="max-w-6xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 50, filter: 'blur(12px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div style={{
                        background: "#16141A", borderRadius: 14,
                        boxShadow: "0 0 0 1px rgba(26,127,60,0.12), 0 2px 4px rgba(22,20,26,0.04), 0 24px 64px rgba(22,20,26,0.10), inset 0 1px 0 rgba(255,255,255,0.05)",
                        overflow: "hidden", maxWidth: 1100, margin: "0 auto",
                    }}>
                        {/* Top bar */}
                        <div style={{ background: "#1C1A22", height: 36, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
                            <div style={{ display: "flex", gap: 6, position: "absolute", left: 16 }}>
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
                            </div>
                            <span className="font-mono-jb" style={{ fontSize: 12, color: "#5A5768", width: "100%", textAlign: "center" }}>
                                velocis / team-dashboard
                            </span>
                        </div>
                        {/* Main area - 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3" style={{ minHeight: 320 }}>
                            {/* Col 1: Sentinel */}
                            <div style={{ padding: "24px 20px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                                <span className="font-mono-jb block uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#3FB950', marginBottom: 16 }}>Sentinel</span>
                                <div className="space-y-4">
                                    {["Refactor auth middleware", "Add rate limiting", "Update DB schema"].map((pr, i) => (
                                        <div key={i} style={{ background: "#1C1A22", borderRadius: 8, padding: 12, border: "1px solid rgba(255,255,255,0.04)", position: 'relative', overflow: 'hidden' }}>
                                            <div className="font-inter text-[13px] text-white font-medium relative z-10">{pr}</div>
                                            <div className="flex justify-between items-center mt-3 relative z-10">
                                                <span className="font-mono-jb text-[10px] text-[#2EA44F] flex items-center gap-1.5"><Check size={12} /> Reviewed</span>
                                                <span className="font-mono-jb text-[10px] text-[#6B6778]">2m ago</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Col 2: Fortress */}
                            <div style={{ padding: "24px 20px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                                <span className="font-mono-jb block uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#58A6FF', marginBottom: 16 }}>Fortress</span>
                                <div className="font-mono-jb text-[11px] text-[#6B6778] space-y-2">
                                    <div className="flex gap-2"><span className="text-[#58A6FF]">✓</span> <span>payments.test.ts</span></div>
                                    <div className="flex gap-2"><span className="text-[#58A6FF]">✓</span> <span>api_routes.test.ts</span></div>
                                    <div className="flex gap-2"><span className="text-[#58A6FF]">✓</span> <span>webhooks.test.ts</span></div>
                                    <div className="flex gap-2"><span className="text-[#58A6FF]">✓</span> <span>database.test.ts</span></div>
                                    <div className="mt-4 pt-4 border-t border-white/5 text-[#58A6FF]">
                                        14/14 passing — coverage 100%
                                    </div>
                                </div>
                            </div>
                            {/* Col 3: Visual Cortex */}
                            <div style={{ padding: "24px 20px" }}>
                                <span className="font-mono-jb block uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#A371F7', marginBottom: 16 }}>Visual Cortex</span>
                                <div style={{ position: "relative", height: 200, width: "100%" }}>
                                    <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
                                        <line x1="50" y1="50" x2="150" y2="50" stroke="rgba(163,113,247,0.3)" strokeWidth="1.5" strokeDasharray="4,3" />
                                        <line x1="150" y1="50" x2="100" y2="150" stroke="rgba(163,113,247,0.3)" strokeWidth="1.5" strokeDasharray="4,3" />
                                        <line x1="100" y1="150" x2="50" y2="50" stroke="rgba(163,113,247,0.3)" strokeWidth="1.5" strokeDasharray="4,3" />
                                        <line x1="50" y1="50" x2="100" y2="100" stroke="rgba(163,113,247,0.3)" strokeWidth="1.5" strokeDasharray="4,3" />
                                        <line x1="150" y1="50" x2="100" y2="100" stroke="rgba(163,113,247,0.3)" strokeWidth="1.5" strokeDasharray="4,3" />

                                        <circle cx="50" cy="50" r="16" fill="rgba(163,113,247,0.15)" stroke="#A371F7" strokeWidth="1.5" />
                                        <circle cx="150" cy="50" r="16" fill="rgba(163,113,247,0.15)" stroke="#A371F7" strokeWidth="1.5" />
                                        <circle cx="100" cy="150" r="16" fill="rgba(88,166,255,0.15)" stroke="#58A6FF" strokeWidth="1.5" />
                                        <circle cx="100" cy="100" r="16" fill="rgba(63,185,80,0.15)" stroke="#3FB950" strokeWidth="1.5" />

                                        <text x="50" y="54" textAnchor="middle" fill="#A371F7" fontSize="10" fontFamily="JetBrains Mono">API</text>
                                        <text x="150" y="54" textAnchor="middle" fill="#A371F7" fontSize="10" fontFamily="JetBrains Mono">AUTH</text>
                                        <text x="100" y="154" textAnchor="middle" fill="#58A6FF" fontSize="10" fontFamily="JetBrains Mono">DB</text>
                                        <text x="100" y="104" textAnchor="middle" fill="#3FB950" fontSize="10" fontFamily="JetBrains Mono">EVT</text>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        {/* Status bar */}
                        <div style={{ background: "#12101A", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 20px", display: "flex", gap: 24 }}>
                            {["3 agents active", "47 PRs reviewed today", "0 blockers"].map((s, i) => (
                                <span key={i} className="font-mono-jb mt-1" style={{ fontSize: 11, color: "#5A5768", display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {i === 0 && <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.6)', animation: 'glowDotPulse 1.5s infinite' }}></span>}
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};


// ─── THE PROBLEM WE'RE SOLVING ───────────────────────────────────────────────
const ProblemSection: React.FC = () => (
    <section id="mission" style={{ background: "#fff", padding: "160px 0" }}>
        <div className="max-w-[660px] mx-auto px-6">
            <FadeUp>
                <h2 className="font-bask" style={{
                    fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700,
                    lineHeight: 1.12, letterSpacing: "-0.025em", color: "#16141A", marginBottom: 32
                }}>
                    We watched brilliant developers get stuck.
                </h2>
            </FadeUp>
            <FadeUp delay={0.1}>
                <p className="font-inter drop-cap" style={{ fontSize: 17, lineHeight: 1.75, color: "#6B6778", marginBottom: 24, maxWidth: "65ch" }}>
                    Every engineering team we've ever seen faces the same silent bottleneck. Junior developers writing good code but not production-grade code. Senior engineers burning hours on reviews that should take minutes. Tribal knowledge locked in someone's head.
                </p>
                <p className="font-inter" style={{ fontSize: 17, lineHeight: 1.75, color: "#6B6778", marginBottom: 40, maxWidth: "65ch" }}>
                    We built Velocis because the problem isn't talent. It's tooling. And we're looking for people who feel that same frustration, and want to fix it permanently.
                </p>
            </FadeUp>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                whileInView={{ opacity: 1, height: 'auto' }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
            >
                <div style={{
                    borderLeft: "3px solid transparent", borderImage: "linear-gradient(to bottom, #1A7F3C, #3FB950) 1",
                    background: "rgba(26,127,60,0.04)",
                    borderRadius: "0 10px 10px 0", padding: "22px 28px", position: "relative"
                }}>
                    <span style={{
                        position: "absolute", top: -8, left: 18, fontSize: 88,
                        fontFamily: "Georgia, serif", color: "rgba(26,127,60,0.08)", lineHeight: 1
                    }}>❝</span>
                    <p className="font-bask relative z-10" style={{
                        fontSize: "18px", fontStyle: "italic", lineHeight: 1.72, color: "#2C2A36", margin: 0
                    }}>
                        "The best engineers we know aren't just coders. They're teachers. We built that into the product, and we build our team the same way."
                    </p>
                </div>
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }} whileInView={{ opacity: 0.6 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.8, delay: 0.2 }}
                style={{
                    height: 1, width: 56, background: "#E8E5DF", margin: "60px auto 0"
                }}
            />
        </div>
    </section>
);

// ─── Animation 7: Commit Dot Grid ──────────────────────────────────────────────
const CommitDotGrid: React.FC = () => {
    const cols = 52;
    const rows = 7;
    const dots = Array.from({ length: cols * rows }, (_, i) => {
        const x = Math.floor(i / rows);
        const y = i % rows;
        const baseLvl = Math.random() > 0.8 ? (Math.random() > 0.5 ? 2 : 1) : 0;
        return { x, y, baseLvl };
    });

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 1, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 12px)`, gap: '4px', transform: 'rotate(-5deg) scale(1.4)' }}>
                {dots.map((d, i) => {
                    const delay = (d.x * 0.05 + d.y * 0.1) + Math.random() * 2;
                    let color = 'rgba(26,127,60,0.06)';
                    if (d.baseLvl === 1) color = 'rgba(26,127,60,0.13)';
                    if (d.baseLvl === 2) color = 'rgba(26,127,60,0.22)';
                    if (d.baseLvl === 3) color = 'rgba(46,164,79,0.35)';
                    return (
                        <div key={i} style={{
                            width: 12, height: 12, borderRadius: 2,
                            background: color,
                            animation: `commitPulse 4s infinite alternate`,
                            animationDelay: `${delay}s`,
                        }} />
                    );
                })}
            </div>
            <style>{`
                @keyframes commitPulse {
                    0%, 70% { background: inherit; }
                    100% { background: rgba(63, 185, 80, 0.42); transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
};

// ─── CULTURE AND VALUES ───────────────────────────────────────────────────────
const CultureSection: React.FC = () => {
    const values = [
        { title: "Autonomous by Default", icon: <Terminal size={18} />, body: "We trust our team the same way Velocis trusts your repo. No micromanagement. You own your work end to end." },
        { title: "Teach Everything", icon: <BookOpen size={18} />, body: "Every PR review, every architecture decision is a teaching moment. We share the why, not just the what." },
        { title: "Ship with Intent", icon: <Rocket size={18} />, body: "We build production-grade software ourselves. We hold our internal work to the same standard Velocis enforces on yours." },
        { title: "Zero-Touch Quality", icon: <Shield size={18} />, body: "We don't debate code quality, we automate it. Our internal tooling runs on Velocis itself." },
        { title: "Deep Developer Empathy", icon: <Code2 size={18} />, body: "Every feature starts with: what does a junior dev need? What does a senior dev wish they never had to do again?" },
        { title: "Async and Remote First", icon: <Globe size={18} />, body: "Great engineers exist everywhere. We build systems and culture that work across time zones without friction." }
    ];
    return (
        <section id="culture" style={{ background: "#F7F6F3", padding: "160px 0", position: 'relative', overflow: 'hidden' }}>
            <CommitDotGrid />
            <style>{`
                .culture-card {
                    background: #FFFFFF; border: 1px solid #E8E5DF; border-radius: 14px; padding: 28px;
                    box-shadow: 0 1px 3px rgba(22,20,26,0.04);
                    transition: all 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
                    text-align: left;
                }
                .culture-card:hover {
                    transform: translateY(-6px);
                    border-color: rgba(26,127,60,0.25);
                    box-shadow: 0 0 0 4px rgba(26,127,60,0.06), 0 20px 48px rgba(22,20,26,0.10);
                }
                .culture-icon-box {
                    width: 44px; height: 44px; border-radius: 10px; background: #F0FDF4; border: 1px solid rgba(26,127,60,0.12);
                    display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
                    transition: all 280ms ease;
                }
                .culture-card:hover .culture-icon-box {
                    transform: scale(1.10) rotate(6deg);
                    background: #DCFCE7;
                }
                .culture-title {
                    font-family: 'Inter', sans-serif; font-weight: 600; font-size: 15px; color: #16141A; margin: 14px 0 8px;
                    transition: color 200ms ease;
                }
                .culture-card:hover .culture-title {
                    color: #1A7F3C;
                }
            `}</style>
            <div className="max-w-[1000px] mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
                <FadeUp>
                    <div style={{ maxWidth: 580, margin: "0 auto 64px", textAlign: 'center' }}>
                        <Label>● OUR CULTURE</Label>
                        <h2 className="font-bask" style={{
                            fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700,
                            lineHeight: 1.12, letterSpacing: "-0.025em", color: "#16141A", marginTop: 14, marginBottom: 20
                        }}>
                            Small team. Massive leverage.
                        </h2>
                        <p className="font-inter mx-auto" style={{ fontSize: 17, color: "#6B6778", lineHeight: 1.68 }}>
                            We are not a big company. We move fast, ship real things, and every person on the team has a direct impact on the product engineers use every day.
                        </p>
                    </div>
                </FadeUp>
                <div className="grid md:grid-cols-3 gap-5">
                    {values.map((v, i) => {
                        const staggerDelay = [0, 0.08, 0.16, 0.12, 0.20, 0.28][i] || 0;
                        return (
                            <motion.div key={i}
                                initial={{ opacity: 0, y: 28, scale: 0.97 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-60px" }}
                                transition={{ duration: 0.6, delay: staggerDelay, ease: [0.34, 1.56, 0.64, 1] }}
                                className="culture-card"
                            >
                                <div className="culture-icon-box">
                                    {React.cloneElement(v.icon as React.ReactElement, { size: 20, color: '#1A7F3C' })}
                                </div>
                                <h3 className="culture-title">
                                    {v.title}
                                </h3>
                                <p className="font-inter" style={{ fontSize: 14, color: "#6B6778", lineHeight: 1.65 }}>
                                    {v.body}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// ─── STATS SECTION ────────────────────────────────────────────────────────────
const StatItem: React.FC<{
    numericVal: number; display: string; suffix: string;
    desc: string; color: string; isText?: boolean;
    delay: number;
}> = ({ numericVal, display, suffix, desc, color, isText, delay }) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-50px" });
    const count = useCountUp(numericVal, 1800, !isText && inView);
    const isReady = inView && (count === numericVal || isText);

    return (
        <div ref={ref} className="text-center px-4 py-2" style={{ flex: 1 }}>
            <motion.div
                animate={isReady ? { scale: [1, 1.04, 1] } : {}}
                transition={{ duration: 0.5, type: 'spring' }}
                className="font-bask" style={{
                    fontSize: "clamp(72px, 9vw, 120px)", fontWeight: 700,
                    lineHeight: 1, color: "#16141A", textShadow: "0 2px 0 rgba(255,255,255,0.8)",
                    marginBottom: 16
                }}>
                {isText ? display : `${count}${suffix}`}
            </motion.div>
            <p className="font-inter flex items-start justify-center gap-2 text-left" style={{ fontSize: 14, lineHeight: 1.6, color: "#6B6778", maxWidth: 200, margin: "0 auto" }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 8 }} />
                <span>{desc}</span>
            </p>
        </div>
    );
};

const StatsSection: React.FC = () => (
    <section style={{ background: "#F0EEE9", padding: "140px 0", position: 'relative', overflow: 'hidden' }}>
        <div className="max-w-[900px] mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
            <FadeUp className="text-center mb-16">
                <span className="font-mono-jb" style={{ fontSize: 11, color: "#1A7F3C", letterSpacing: '0.14em', textTransform: 'uppercase' }}>● THE SCALE</span>
                <h2 className="font-bask" style={{
                    fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700,
                    lineHeight: 1.12, letterSpacing: "-0.025em", color: "#16141A", marginTop: 14, marginBottom: 72
                }}>
                    Why this matters.
                </h2>
            </FadeUp>
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-0">
                <StatItem numericVal={60} display="60" suffix="%" desc="of senior engineer time spent on repetitive code reviews and documentation" color="#1A7F3C" delay={0} />
                <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="hidden md:block" style={{ width: 1, height: 80, background: "linear-gradient(to bottom, transparent, #E8E5DF, transparent)", flexShrink: 0, transformOrigin: 'center' }} />
                <StatItem numericVal={10} display="10x" suffix="x" desc="faster skill growth when junior developers receive contextual, commit-level mentorship" color="#1A56DB" delay={0.1} />
                <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="hidden md:block" style={{ width: 1, height: 80, background: "linear-gradient(to bottom, transparent, #E8E5DF, transparent)", flexShrink: 0, transformOrigin: 'center' }} />
                <StatItem numericVal={85} display="$85B" suffix="B" desc="estimated annual cost of technical debt and poor code quality across the global software industry" color="#6D28D9" isText delay={0.2} />
            </div>
        </div>
    </section>
);

// ─── Animation 3: Floating Code Fragments ────────────────────────────────────
interface FragmentDef { text: string; top: string; opacity: number; duration: string; delay: string; }
const CodeFragments: React.FC<{ side: 'left' | 'right'; fragments: FragmentDef[] }> = ({ side, fragments }) => (
    <div style={{
        position: 'absolute', top: 0, bottom: 0,
        [side]: 8, width: 180,
        pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
        display: 'none',
    }} className="hidden xl:block">
        {fragments.map((f, i) => (
            <span key={i} className="code-frag" style={{
                top: f.top, [side]: 0,
                opacity: f.opacity,
                animationDuration: f.duration,
                animationDelay: f.delay,
            }}>{f.text}</span>
        ))}
    </div>
);

// ─── OPEN ROLES ───────────────────────────────────────────────────────────────
const RoleCard: React.FC<{ role: any; delay: number }> = ({ role, delay }) => {
    const [status, setStatus] = useState("Apply Now");

    const handleApply = () => {
        if (status !== "Apply Now") return;
        setStatus("Sending...");
        setTimeout(() => setStatus("Applied ✓"), 600);
        setTimeout(() => setStatus("Apply Now"), 2600);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay }}
            className="role-card flex flex-col gap-6"
            style={{ '--role-color': role.badgeColor, '--hover-border': `rgba(${role.rgb}, 0.25)` } as React.CSSProperties}
        >
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <div className="font-mono-jb" style={{ background: role.badgeBg, color: role.badgeColor, fontSize: 11, padding: "3px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", textTransform: "uppercase" }}>
                        <span className="badge-dot" style={{ background: role.badgeColor }}></span>{role.badge}
                    </div>
                    <h3 className="font-bask mt-2" style={{ fontSize: 22, fontWeight: 700, color: "#16141A" }}>{role.title}</h3>
                </div>
                <button onClick={handleApply} className="apply-btn font-inter font-semibold" style={{ background: status === "Applied ✓" ? "transparent" : "#16141A", color: status === "Applied ✓" ? "#1A7F3C" : "#fff", fontSize: 13, padding: "10px 20px", borderRadius: 8, border: status === "Applied ✓" ? "1px solid #1A7F3C" : "1px solid transparent", minWidth: 120 }}>
                    {status} {status === "Apply Now" && <span className="btn-arrow">→</span >}
                </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: -4 }}>
                {role.tags.map((t: string, j: number) => (
                    <span key={j} className="font-inter" style={{ background: "#F7F6F3", border: "1px solid #E8E5DF", color: "#6B6778", fontSize: 12, padding: "3px 12px", borderRadius: 999 }}>{t}</span>
                ))}
            </div>
            <p className="font-inter" style={{ fontSize: 16, color: "#6B6778", lineHeight: 1.7, maxWidth: "65ch", margin: 0 }}>
                {role.desc}
            </p>
            <div className="grid md:grid-cols-2 gap-8 mt-2">
                <div>
                    <h4 className="font-inter uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#9B97A8", marginBottom: 16 }}>What you'll do</h4>
                    <ul className="space-y-3">
                        {role.dos.map((item: string, j: number) => (
                            <li key={j} className="font-inter bullet-item flex items-start gap-2" style={{ fontSize: 14, color: "#4B4856", lineHeight: 1.6 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: role.badgeColor, flexShrink: 0, marginTop: 7 }}></span>
                                <span>{item}<span className="bullet-arrow">→</span></span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="font-inter uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#9B97A8", marginBottom: 16 }}>What we're looking for</h4>
                    <ul className="space-y-3">
                        {role.reqs.map((item: string, j: number) => (
                            <li key={j} className="font-inter bullet-item flex items-start gap-2" style={{ fontSize: 14, color: "#4B4856", lineHeight: 1.6 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: role.badgeColor, flexShrink: 0, marginTop: 7 }}></span>
                                <span>{item}<span className="bullet-arrow">→</span></span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    );
};

const RolesSection: React.FC = () => {
    const frags = {
        left: [
            { text: "git commit -m 'fix'", top: "15%", opacity: 0.22, duration: "9s", delay: "0s" },
            { text: "npm run build", top: "35%", opacity: 0.22, duration: "11s", delay: "2s" },
            { text: "docker deploy", top: "55%", opacity: 0.22, duration: "8s", delay: "1s" },
            { text: "CI/CD passing ✓", top: "75%", opacity: 0.22, duration: "13s", delay: "3s" },
            { text: "merged to main", top: "90%", opacity: 0.22, duration: "10s", delay: "0.5s" },
        ],
        right: [
            { text: "team.onboard(dev)", top: "18%", opacity: 0.22, duration: "10s", delay: "1s" },
            { text: "skills.level++", top: "38%", opacity: 0.22, duration: "12s", delay: "0s" },
            { text: "const impact = 'real'", top: "58%", opacity: 0.22, duration: "9s", delay: "2.5s" },
            { text: "await ship(feature)", top: "78%", opacity: 0.22, duration: "11s", delay: "1.5s" },
            { text: "PR approved ✓", top: "92%", opacity: 0.22, duration: "8s", delay: "4s" },
        ]
    };

    const roles = [
        {
            badge: "SENTINEL", badgeBg: "#DCFCE7", badgeColor: "#1A7F3C", rgb: "26,127,60",
            title: "AI/ML Engineer",
            tags: ["Remote", "Full-time", "AWS Bedrock"],
            desc: "Work on the brain of Velocis. Fine-tune Claude 3.5 Sonnet and Llama 3 for code reasoning, semantic security analysis, and mentorship-quality feedback generation.",
            dos: ["Design and evaluate prompts for code logic and security review", "Build RAG pipelines with Amazon Titan Embeddings and Bedrock Knowledge Bases", "Improve Sentinel's mentorship mode, teaching the why behind every issue"],
            reqs: ["Experience with LLM fine-tuning or prompt engineering at scale", "Familiarity with AWS Bedrock, Lambda, or serverless AI architecture", "Genuine curiosity about developer tooling and code quality"]
        },
        {
            badge: "FORTRESS", badgeBg: "#EFF6FF", badgeColor: "#1A56DB", rgb: "26,86,219",
            title: "Backend / AWS Engineer",
            tags: ["Remote", "Full-time", "AWS Step Functions"],
            desc: "Architect and scale the autonomous testing infrastructure that powers Fortress. Build the self-healing loop that writes, runs, and fixes tests without human intervention.",
            dos: ["Design AWS Step Functions workflows for multi-step test generation and execution", "Build Lambda functions that process GitHub webhooks in real time", "Improve the self-healing loop: Write, Run, Analyze, Fix"],
            reqs: ["Strong experience with serverless AWS architecture (Lambda, Step Functions, DynamoDB)", "Background in test automation, CI/CD, or developer infrastructure", "Obsession with reliability and zero-touch automation"]
        },
        {
            badge: "VISUAL CORTEX", badgeBg: "#F5F3FF", badgeColor: "#6D28D9", rgb: "109,40,217",
            title: "Frontend / Visualization Engineer",
            tags: ["Remote", "Full-time", "ReactFlow + GSAP"],
            desc: "Build the living architecture maps that make complex codebases instantly understandable. Work with ReactFlow, GSAP, and Next.js to create visualizations engineers actually love using.",
            dos: ["Build and animate interactive architecture graph components with ReactFlow", "Design smooth GSAP animations for the system pulse and live update effects", "Own the dashboard UI that developers see every single day"],
            reqs: ["Deep experience with React and modern animation libraries", "Portfolio showing complex data visualization or interactive UI work", "Eye for design and obsession with developer experience"]
        }
    ];

    return (
        <section id="roles" style={{ background: "#fff", padding: "160px 0", position: 'relative', overflow: 'hidden' }}>
            <style>{`
                .role-card {
                    background: #FFFFFF; border: 1px solid #E8E5DF; border-radius: 16px; padding: 32px;
                    border-left: 3px solid transparent;
                    transition: all 220ms ease;
                }
                .role-card:hover {
                    background: #FAFAF8; border-color: var(--hover-border);
                    border-left-color: var(--role-color);
                    border-top-left-radius: 16px; border-bottom-left-radius: 16px;
                    box-shadow: 0 8px 32px rgba(22,20,26,0.08); transform: translateY(-3px);
                }
                .bullet-item { transition: transform 150ms ease; }
                .bullet-item .bullet-arrow { opacity: 0; transform: translateX(-4px); transition: all 150ms ease; color: var(--role-color); margin-left: 4px; display: inline-block; }
                .bullet-item:hover { transform: translateX(6px); }
                .bullet-item:hover .bullet-arrow { opacity: 1; transform: translateX(0); }
                .apply-btn { transition: all 220ms ease; }
                .apply-btn:hover { background: #1A7F3C !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(26,127,60,0.28); }
                .apply-btn:hover .btn-arrow { transform: translateX(4px); }
                .btn-arrow { transition: transform 220ms ease; display: inline-block; margin-left: 4px; }
                
                @keyframes pulseBadgeDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
                .badge-dot { animation: pulseBadgeDot 1s infinite; width: 4px; height: 4px; border-radius: 50%; display: inline-block; margin-right: 6px; margin-bottom: 1px; }
            `}</style>
            <CodeFragments side="left" fragments={frags.left} />
            <CodeFragments side="right" fragments={frags.right} />
            <div className="max-w-[900px] mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
                <FadeUp className="text-center mb-16">
                    <div style={{ maxWidth: 560, margin: "0 auto 64px" }}>
                        <Label>● OPEN ROLES</Label>
                        <h2 className="font-bask" style={{
                            fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700,
                            lineHeight: 1.12, letterSpacing: "-0.025em", color: "#16141A", marginTop: 14, marginBottom: 20
                        }}>
                            Where you fit in.
                        </h2>
                        <p className="font-inter mx-auto" style={{ fontSize: 18, color: "#6B6778", lineHeight: 1.65 }}>
                            Three roles. Three ways to change how software gets built.
                        </p>
                    </div>
                </FadeUp>

                <div className="space-y-5">
                    {roles.map((r, i) => (
                        <RoleCard key={i} role={r} delay={i * 0.15} />
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── THE VELOCIS DIFFERENCE ───────────────────────────────────────────────────
const DiffSection: React.FC = () => {
    const rows = [
        { feature: "Engineering Scope", others: "Fixing Jira tickets", velocis: "Solving systemic workflow bottlenecks" },
        { feature: "Ownership", others: "Cogs in a massive machine", velocis: "Direct impact on every line of code" },
        { feature: "Feedback Loop", others: "Months to see impact", velocis: "Instant feedback from global developer users" },
        { feature: "Tooling Philosophy", others: "Ship another copilot", velocis: "Ship an autonomous teammate" },
    ];
    return (
        <section style={{ background: "#F0EEE9", padding: "160px 0" }}>
            <div className="max-w-[880px] mx-auto px-6">
                <FadeUp className="text-center mb-16">
                    <Label>● THE DIFFERENCE</Label>
                    <h2 className="font-bask" style={{
                        fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700,
                        lineHeight: 1.12, letterSpacing: "-0.025em", color: "#16141A", marginTop: 14, marginBottom: 20
                    }}>
                        Not just another tool.
                    </h2>
                    <p className="font-inter mt-4 mx-auto" style={{ fontSize: 18, color: "#6B6778", lineHeight: 1.6, maxWidth: 520 }}>
                        We're not building a feature factory. We're building a fundamental shift in how teams ship code.
                    </p>
                </FadeUp>
                <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <table style={{ width: "100%", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 24px rgba(22,20,26,0.07)", borderCollapse: "collapse", background: "#fff" }}>
                        <thead>
                            <tr style={{ background: "#16141A" }}>
                                <th className="font-inter" style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#9B97A8", width: "30%" }}>Feature</th>
                                <th className="font-inter" style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#9B97A8" }}>Other Tools</th>
                                <th className="font-inter" style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#3FB950" }}>At Velocis ⚡</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} className="comp-row"
                                    style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FAFAF8", borderBottom: i < rows.length - 1 ? "1px solid #F0EDE8" : "none" }}
                                >
                                    <td className="font-inter" style={{ padding: "18px 24px", fontSize: 14, fontWeight: 600, color: "#16141A" }}>{r.feature}</td>
                                    <td className="font-inter" style={{ padding: "18px 24px", fontSize: 14, color: "#9B97A8", fontStyle: "italic" }}>{r.others}</td>
                                    <td className="font-inter" style={{ padding: "18px 24px", fontSize: 14, color: "#16141A", fontWeight: 600 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", delay: 0.2 + (i * 0.06) }} style={{ color: "#1A7F3C", flexShrink: 0 }}>✓</motion.div>{r.velocis}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            </div>
        </section>
    );
};

// ─── BENEFITS & PERKS ─────────────────────────────────────────────────────────
const BenefitsSection: React.FC = () => {
    const benefits = [
        { label: "Top-Tier Health", color: "#1A7F3C", items: ["100% Premium Coverage", "Mental Health Stipend", "Unlimited Sick Days"] },
        { label: "Remote Flexibility", color: "#1A56DB", items: ["Work From Anywhere", "$2,000 Home Office Setup", "Flexible Hours"] },
        { label: "Growth & Learning", color: "#6D28D9", items: ["$3,000 Annual Learning Budget", "Conference Sponsorship", "Dedicated Pet Projects"] },
        { label: "Ownership", color: "#8E44EC", items: ["Competitive Equity", "Transparent Financials", "Founder-Level Access"] },
    ];
    return (
        <section id="benefits" style={{ background: "#F7F6F3", padding: "160px 0", position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'radial-gradient(#E8E5DF 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
            <div className="max-w-[880px] mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
                <FadeUp className="text-center mb-16">
                    <Label>● PERKS & BENEFITS</Label>
                    <h2 className="font-bask mt-4" style={{
                        fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700,
                        lineHeight: 1.12, letterSpacing: "-0.025em", color: "#16141A",
                    }}>
                        Taking care of our own.
                    </h2>
                </FadeUp>
                <div style={{ background: "#FFFFFF", borderRadius: 24, border: "1px solid #E8E5DF", padding: "48px", display: "flex", flexDirection: "column", gap: 32, boxShadow: "0 12px 40px rgba(22,20,26,0.03)" }}>
                    {benefits.map((cat, ci) => (
                        <FadeUp key={ci} delay={ci * 0.08}>
                            <div className="flex flex-col md:flex-row items-start gap-6 md:gap-12">
                                <div style={{ width: 140, flexShrink: 0, paddingTop: 6 }}>
                                    <Label color={cat.color}>{cat.label}</Label>
                                </div>
                                <motion.div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1 }}
                                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
                                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                                >
                                    {cat.items.map((item, ii) => (
                                        <motion.span key={ii}
                                            variants={{ hidden: { opacity: 0, scale: 0.9, y: 8 }, visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } } }}
                                            className="font-inter"
                                            style={{
                                                fontSize: 14, fontWeight: 500, color: "#16141A",
                                                background: "#FFFFFF", border: "1px solid #E8E5DF",
                                                borderRadius: 999, padding: "8px 18px",
                                                cursor: "default", transition: "all 200ms ease",
                                                boxShadow: "0 1px 2px rgba(22,20,26,0.02)",
                                            }}
                                            whileHover={{ borderColor: cat.color, boxShadow: `0 4px 12px rgba(${cat.color === '#1A7F3C' ? '26,127,60' : cat.color === '#1A56DB' ? '26,86,219' : cat.color === '#6D28D9' ? '109,40,217' : '142,68,236'}, 0.08)`, y: -2 }}
                                        >{item}</motion.span>
                                    ))}
                                </motion.div>
                            </div>
                            {ci < benefits.length - 1 && <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #E8E5DF, transparent)", marginTop: 32 }} />}
                        </FadeUp>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ─── TEAM SECTION ─────────────────────────────────────────────────────────────
interface TeamMember {
    initials: string; name: string; role: string; quote: string;
    ringColor: string; glowColor: string; badgeBg: string; badgeText: string;
}
const teamMembers: TeamMember[] = [
    {
        initials: "RK", name: "Rishabh Kumar Jha", role: "Team Leader",
        quote: "We didn't want to build another AI tool. We wanted to build a teammate.",
        ringColor: "#1A7F3C", glowColor: "rgba(26,127,60,0.15)", badgeBg: "#DCFCE7", badgeText: "#1A7F3C",
    },
    {
        initials: "PT", name: "Parinita Tiwari", role: "Core Member",
        quote: "Every junior developer deserves a senior engineer in their corner. Velocis makes that possible at scale.",
        ringColor: "#1A56DB", glowColor: "rgba(26,86,219,0.15)", badgeBg: "#EFF6FF", badgeText: "#1A56DB",
    },
    {
        initials: "HS", name: "Harsh Singhal", role: "Core Member",
        quote: "The best code review is the one that teaches. We built that into every commit.",
        ringColor: "#6D28D9", glowColor: "rgba(109,40,217,0.15)", badgeBg: "#F5F3FF", badgeText: "#6D28D9",
    },
];

const TeamParticles: React.FC = () => (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="team-dot"
                style={{
                    position: 'absolute', width: 3, height: 3, borderRadius: '50%',
                    background: i % 3 === 0 ? '#1A7F3C' : i % 3 === 1 ? '#1A56DB' : '#6D28D9',
                    left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                    animation: `teamFloat ${8 + Math.random() * 6}s infinite alternate ease-in-out`,
                    animationDelay: `-${Math.random() * 5}s`,
                }}
            />
        ))}
        <style>{`@keyframes teamFloat { from { transform: translateY(0) scale(1.5); opacity: 0.1; } to { transform: translateY(-60px) scale(0.5); opacity: 0.25; } }`}</style>
    </div>
);

const TeamSection: React.FC = () => (
    <section id="team" style={{ background: "#FFFFFF", padding: "160px 0", position: 'relative', overflow: 'hidden' }}>
        <TeamParticles />
        <div className="max-w-[1000px] mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
            <FadeUp className="text-center mb-6">
                <Label>● THE TEAM</Label>
                <h2 className="font-bask" style={{
                    fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700,
                    lineHeight: 1.12, letterSpacing: "-0.025em", color: "#16141A", marginTop: 14, marginBottom: 20
                }}>
                    Who you'll be building with.
                </h2>
                <p className="font-inter mt-4 mx-auto" style={{ fontSize: 18, color: "#6B6778", lineHeight: 1.6, maxWidth: 560 }}>
                    Three builders. One obsession: giving every developer a senior engineer in their corner. Connect with us on social or apply below.
                </p>
            </FadeUp>
            <FadeUp delay={0.1} className="flex justify-center mb-16">
                <div className="font-inter flex items-center gap-2 px-5 py-2" style={{
                    fontSize: 14, fontWeight: 600, color: "#16141A", background: "#FAFAF8",
                    border: "1px solid #E8E5DF", borderRadius: 999, boxShadow: "0 2px 8px rgba(22,20,26,0.04)"
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A7F3C', marginRight: 4, animation: 'pulseBadgeDot 2s infinite' }} />
                    <GitMerge size={15} style={{ color: "#16141A" }} /> Merge Conflict
                </div>
            </FadeUp>

            <motion.div className="grid md:grid-cols-3 gap-6"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            >
                {teamMembers.map((m) => (
                    <motion.div key={m.initials} className="team-card"
                        variants={{ hidden: { opacity: 0, y: 40, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] } } }}
                        whileHover={{ y: -6, boxShadow: "0 16px 48px rgba(22,20,26,0.08)", borderColor: "rgba(0,0,0,0.08)" }}
                        style={{ background: "#FAFAF8", borderRadius: 24, border: "1px solid rgba(0,0,0,0.04)", padding: "40px 32px", textAlign: "center", transition: "all 300ms cubic-bezier(0.34,1.56,0.64,1)" }}
                    >
                        <div className="team-avatar" style={{
                            width: 80, height: 80, borderRadius: "50%", background: "#16141A",
                            margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "'Libre Baskerville', serif", fontWeight: 700, fontSize: 24, color: "#fff",
                            outline: `2px solid ${m.ringColor}`, outlineOffset: 4,
                            boxShadow: `0 0 0 8px transparent`, transition: "all 300ms ease"
                        }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 0 10px ${m.glowColor}`; e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 0 8px transparent`; e.currentTarget.style.transform = 'scale(1)'; }}
                        >{m.initials}</div>
                        <h3 className="font-inter" style={{ fontSize: 18, fontWeight: 700, color: "#16141A", marginBottom: 10 }}>
                            {m.name}
                        </h3>
                        <span className="font-mono-jb" style={{
                            fontSize: 11, letterSpacing: "0.05em", color: m.badgeText, textTransform: "uppercase",
                            background: m.badgeBg, borderRadius: 999, padding: "4px 14px",
                            display: "inline-block", marginBottom: 20,
                        }}>{m.role}</span>
                        <p className="font-bask" style={{ fontSize: 15, fontStyle: "italic", color: "#6B6778", lineHeight: 1.7, margin: 0 }}>
                            "{m.quote}"
                        </p>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    </section>
);

// ─── DUAL CTA ─────────────────────────────────────────────────────────────────
const CTASection: React.FC = () => (
    <section id="cta" style={{ background: "#F7F6F3", padding: "160px 0", position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 600px 400px at 20% 50%, rgba(26,127,60,0.06) 0%, transparent 70%)', animation: 'orb1Drift 12s ease-in-out infinite alternate' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 700px 300px at 80% 60%, rgba(46,164,79,0.04) 0%, transparent 70%)', animation: 'orb2Drift 16s ease-in-out infinite alternate-reverse' }} />
        </div>
        <div className="max-w-[1000px] mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
            <FadeUp className="text-center mb-20">
                <h2 className="font-bask" style={{
                    fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700,
                    lineHeight: 1.08, letterSpacing: "-0.025em", color: "#16141A",
                }}>
                    Ready to help us build<br />the future?
                </h2>
            </FadeUp>
            <div className="grid md:grid-cols-2 gap-6 items-stretch">
                <FadeUp delay={0.05} className="h-full">
                    <div style={{ background: "linear-gradient(135deg, #16141A 0%, #0F0E13 100%)", borderRadius: 24, padding: "56px 48px", height: "100%", boxShadow: "0 32px 64px rgba(22,20,26,0.15)", display: "flex", flexDirection: "column" }}>
                        <h3 className="font-bask" style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 20 }}>
                            Apply for a role.
                        </h3>
                        <p className="font-inter flex-grow" style={{ fontSize: 16, color: "#9B97A8", lineHeight: 1.65, marginBottom: 40, maxWidth: "40ch" }}>
                            We review every single application manually. No automated filters. If you believe in what we're building, we want to hear from you.
                        </p>
                        <motion.button whileHover="hover"
                            onClick={() => { document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' }) }}
                            className="font-inter font-semibold flex items-center justify-center gap-2 apply-btn"
                            style={{
                                fontSize: 15, color: "#fff", width: "100%", cursor: "pointer",
                                background: "#2EA44F", borderRadius: 12, padding: "16px 24px",
                                border: "none", outline: "none"
                            }}
                        >
                            View Open Roles <motion.span variants={{ hover: { x: 4 } }}>→</motion.span>
                        </motion.button>
                    </div>
                </FadeUp>
                <FadeUp delay={0.12} className="h-full">
                    <motion.div whileHover={{ boxShadow: "0 12px 32px rgba(22,20,26,0.04)", y: -4 }} transition={{ duration: 0.3 }}
                        style={{ background: "#FFFFFF", borderRadius: 24, border: "1px solid #E8E5DF", padding: "56px 48px", height: "100%", display: "flex", flexDirection: "column" }}
                    >
                        <h3 className="font-bask" style={{ fontSize: 32, fontWeight: 700, color: "#16141A", marginBottom: 20 }}>
                            Don't see a fit?
                        </h3>
                        <p className="font-inter flex-grow" style={{ fontSize: 16, color: "#6B6778", lineHeight: 1.65, marginBottom: 40, maxWidth: "40ch" }}>
                            We are always looking for exceptional engineers, designers, and thinkers. Send us an email with your background and what you'd like to build.
                        </p>
                        <a href="mailto:careers@velocis.dev" className="font-inter inline-flex items-center gap-2" style={{
                            fontSize: 16, fontWeight: 600, color: "#16141A",
                            borderBottom: "1px solid #16141A", paddingBottom: 4, alignSelf: "flex-start",
                            textDecoration: "none", transition: "opacity 150ms ease"
                        }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                            careers@velocis.dev <ArrowUpRight size={16} />
                        </a>
                    </motion.div>
                </FadeUp>
            </div>
        </div>
    </section>
);

// ─── FOOTER ───────────────────────────────────────────────────────────────────
const Footer: React.FC = () => {
    const navigate = useNavigate();
    return (
    <footer className="font-inter" style={{
        background: "#FFFFFF", borderTop: "1px solid #E8E5DF",
        padding: "32px 48px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 24,
    }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, color: "#16141A", fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
                Velocis.
            </span>
            <span style={{ fontSize: 14, color: "#9B97A8" }}>
                © 2025 Velocis · Built by{" "}
                <span style={{ color: "#16141A", fontWeight: 600 }}>Merge Conflict</span>
            </span>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
            {["About Us", "Product", "Twitter", "GitHub"].map((l) => (
                <a key={l} href={l === 'About Us' ? '/about' : '#'} style={{ fontSize: 14, fontWeight: 500, color: "#6B6778", textDecoration: "none", transition: "color 150ms ease" }}
                    onClick={(e) => { if (l === 'About Us') { e.preventDefault(); window.open('/about', '_blank', 'noopener,noreferrer'); } }}
                    onMouseEnter={e => e.currentTarget.style.color = '#16141A'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B6778'}
                >
                    {l}
                </a>
            ))}
        </div>
    </footer>
    );
};

export function CareerPage() {
    const [navVisible, setNavVisible] = useState(false);
    const [scrollPct, setScrollPct] = useState(0);

    useEffect(() => {
        const onScroll = () => {
            setNavVisible(window.scrollY > 80);
            const doc = document.documentElement;
            const pct = (window.scrollY / (doc.scrollHeight - doc.clientHeight)) * 100;
            setScrollPct(pct);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className="font-inter" style={{ background: "#fff", color: "#16141A", minHeight: "100vh", overflowX: 'hidden' }}>
            <FontStyle />
            <GrainOverlay />
            <div className="scroll-progress" style={{ width: `${scrollPct}%` }} />

            <StickyNav visible={navVisible} />
            <HeroSection />
            <MissionPanel />
            <ProblemSection />

            <CultureSection />
            <StatsSection />
            <RolesSection />
            <DiffSection />
            <BenefitsSection />
            <TeamSection />
            <CTASection />
            <Footer />
        </div>
    );
}

// provide default export for ease of import
export default CareerPage;

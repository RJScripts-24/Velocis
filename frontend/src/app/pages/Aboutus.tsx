"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
    Shield, Lock, Network, Zap, Brain, GitMerge, ArrowDown, Check, X,
    Github, ChevronRight, Eye, Code2, TestTube2, Map, Webhook, Cpu,
    Database, Globe, Layers, Sparkles, Terminal, Activity, Clock,
    GitBranch, Play, RotateCcw, Circle, Square, Triangle,
} from "lucide-react";
import lightLogoImg from '../../../LightLogo.png';

// ΓöÇΓöÇΓöÇ Fonts & Global Styles ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const FontStyle = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    /* ΓöÇΓöÇ UPGRADED FONT STYLES v2 ΓöÇΓöÇ */

    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-feature-settings: "kern" 1, "liga" 1, "calt" 1; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
    ::selection { background: rgba(26,127,60,0.15); color: #16141A; }
    *:focus-visible { outline: 2px solid #1A7F3C; outline-offset: 3px; }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #F7F6F3; }
    ::-webkit-scrollbar-thumb { background: #D4D0C8; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #16141A; }

    .font-bask { font-family: 'Libre Baskerville', Georgia, serif; }
    .font-inter { font-family: 'Inter', -apple-system, sans-serif; }
    .font-mono-jb { font-family: 'JetBrains Mono', monospace; }

    .nav-link-light {
      font-family: 'Inter', sans-serif; font-weight: 500; font-size: 14px;
      color: #4B4856; letter-spacing: 0.01em; position: relative; transition: color 0.2s;
    }
    .nav-link-light::after {
      content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 1px;
      background: #1A7F3C; transform: scaleX(0); transform-origin: left; transition: transform 0.2s ease;
    }
    .nav-link-light:hover { color: #16141A; }
    .nav-link-light:hover::after, .nav-link-light.active::after { transform: scaleX(1); }
    @keyframes logoDotPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
    .logo-dot { animation: logoDotPulse 2s ease-in-out infinite; display:inline-block;width:6px;height:6px;border-radius:50%;background:#1A7F3C;margin-left:1px;vertical-align:middle; }
    .scroll-progress { position:fixed;top:0;left:0;height:2px;z-index:9999;background:linear-gradient(to right,#1A7F3C,#3FB950);pointer-events:none;transform-origin:left; }

    .agent-visual-float { animation: float-agent 6s ease-in-out infinite; }
    @keyframes float-agent { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
    .code-line { animation: code-appear 0.4s ease forwards; opacity: 0; }
    @keyframes code-appear { to { opacity: 1; } }
    .pulse-dot { animation: pulse-green 2s ease-in-out infinite; }
    @keyframes pulse-green { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(46,164,79,0.4)} 50%{opacity:.7;box-shadow:0 0 0 6px rgba(46,164,79,0)} }
    .blue-pulse-dot { animation: pulse-blue 2s ease-in-out infinite; }
    @keyframes pulse-blue { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(26,86,219,0.4)} 50%{opacity:.7;box-shadow:0 0 0 6px rgba(26,86,219,0)} }
    .node-pulse { animation: node-ping 3s ease-in-out infinite; }
    @keyframes node-ping { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
    @keyframes scrollLine{
      0%{transform:scaleY(0);transform-origin:top;opacity:0}
      30%{transform:scaleY(1);transform-origin:top;opacity:1}
      70%{transform:scaleY(1);transform-origin:bottom;opacity:1}
      100%{transform:scaleY(0);transform-origin:bottom;opacity:0}}
    .scroll-line-inner { animation: scrollLine 1.6s ease-in-out infinite; }

    table { border-collapse: collapse; }
    .comp-row:hover { background: #F7F6F3 !important; transition: background 150ms; }
    /* ΓöÇΓöÇ code fragments - GREEN ΓöÇΓöÇ */
    @keyframes floatCode {
      0%   { transform: translateY(0px) translateX(0px); opacity: 0.22; }
      33%  { transform: translateY(-12px) translateX(4px); opacity: 0.32; }
      66%  { transform: translateY(-6px) translateX(-4px); opacity: 0.26; }
      100% { transform: translateY(0px) translateX(0px); opacity: 0.22; }
    }
    .code-frag {
      position: absolute; font-family: 'JetBrains Mono', monospace; font-size: 11px;
      color: rgba(26,127,60,1); white-space: nowrap; pointer-events: none;
      will-change: transform; animation: floatCode linear infinite;
    }
    /* connector pulse */ 
    @keyframes connectorPulse { 0%{background-position:0 0} 100%{background-position:40px 0} }
    .connector-animated {
      background-image: repeating-linear-gradient(90deg,rgba(26,127,60,.35) 0,rgba(26,127,60,.35) 6px,transparent 6px,transparent 14px);
      background-size: 40px 100%; animation: connectorPulse 1.4s linear infinite;
    }
    /* tech badge */ 
    .tech-badge { font-size:13px;font-weight:500;color:#16141A;background:#fff;border:1px solid #E8E5DF;border-radius:999px;padding:5px 14px;cursor:default;display:inline-block;transition:border-color 150ms,background 150ms,color 150ms,transform 150ms; }
    .tech-badge:hover { background:#F0FDF4;border-color:#1A7F3C;color:#1A7F3C;transform:scale(1.03); }
    /* team card spring hover */
    .team-card { background:#fff;border:1px solid #E8E5DF;border-radius:20px;padding:36px 28px;text-align:center;box-shadow:0 2px 8px rgba(22,20,26,.04);transition:box-shadow 300ms cubic-bezier(.34,1.56,.64,1),transform 300ms cubic-bezier(.34,1.56,.64,1),border-color 300ms; }
    .team-card:hover { box-shadow:0 16px 48px rgba(22,20,26,.10);transform:translateY(-6px);border-color:rgba(26,127,60,.2); }
    /* drop cap */
    .drop-cap::first-letter { font-family:'Libre Baskerville',Georgia,serif;font-size:4em;font-weight:700;float:left;line-height:.82;color:#1A7F3C;margin-right:8px;margin-top:6px; }
    /* arrow link */
    .arrow-link { transition:gap 200ms ease;display:inline-flex;align-items:center;gap:4px; }
    .arrow-link:hover { gap:10px; }
    /* ::selection */
    ::selection { background:rgba(26,127,60,.15);color:#16141A; }
    *:focus-visible { outline:2px solid #1A7F3C;outline-offset:3px; }
    body { font-feature-settings:"kern" 1,"liga" 1,"calt" 1;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased; }
    @media (prefers-reduced-motion: reduce) {
      .code-frag,.agent-visual-float,.scroll-line-inner,.pulse-dot,.blue-pulse-dot,.node-pulse,.team-dot,.logo-dot,.connector-animated { animation: none !important; }
    }

    /* ΓöÇΓöÇ Team particles - GREEN ONLY ΓöÇΓöÇ */
    @keyframes floatDot { 0%{transform:translate(0,0)} 25%{transform:translate(8px,-14px)} 50%{transform:translate(-6px,-20px)} 75%{transform:translate(10px,-8px)} 100%{transform:translate(0,0)} }
    .team-dot { position:absolute;border-radius:50%;pointer-events:none;will-change:transform;animation:floatDot ease-in-out infinite; }
    /* ΓöÇΓöÇ CTA orb keyframes ΓöÇΓöÇ */
    @keyframes orb1Drift { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-20px)} }
    @keyframes orb2Drift { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,25px)} }
    @keyframes orb3Drift { 0%{transform:translate(0,0)} 100%{transform:translate(20px,30px)} }
    @keyframes orb4Drift { 0%{transform:translate(0,0)} 100%{transform:translate(-40px,-15px)} }
  `}</style>
);

// ΓöÇΓöÇΓöÇ Animation 1: Hero Neural Network Canvas ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
        const COUNT = isMobile ? 30 : 60;
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
                        const alpha = (1 - d / 120) * (a.pulse > 0 ? 0.28 : 0.12);
                        const col = `rgba(26,127,60,${alpha})`;
                        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1;
                        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const pr = a.r + a.pulse * 4;
                ctx.beginPath();
                if (a.pulse > 0) {
                    ctx.shadowBlur = 16;
                    ctx.shadowColor = `rgba(46,164,79,${a.pulse * 0.28})`;
                } else {
                    ctx.shadowColor = 'transparent';
                }
                ctx.arc(a.x, a.y, pr, 0, Math.PI * 2);
                ctx.fillStyle = a.pulse > 0
                    ? `rgba(46,164,79,${0.18 + a.pulse * 0.20})`
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

// ΓöÇΓöÇΓöÇ Animation 6: Global Grain Overlay ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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



// ΓöÇΓöÇΓöÇ Animation 3: Floating Code Fragments ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Animation 4: SVG Circuit Board ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const CircuitBoard: React.FC = () => {
    const ref = useRef<SVGPathElement>(null);
    const ref2 = useRef<SVGPathElement>(null);
    const sectionRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                [ref.current, ref2.current].forEach(p => {
                    if (!p) return;
                    const len = p.getTotalLength();
                    p.style.strokeDasharray = `${len}`;
                    p.style.strokeDashoffset = `${len}`;
                    p.style.transition = 'stroke-dashoffset 3s ease';
                    requestAnimationFrame(() => { p.style.strokeDashoffset = '0'; });
                });
                obs.disconnect();
            }
        }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return (
        <div ref={sectionRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice"
                style={{ position: 'absolute', inset: 0 }}>
                {/* Static junction dots */}
                {[[200, 80], [400, 80], [400, 200], [600, 200], [600, 320], [800, 80], [800, 200], [1000, 200], [1000, 320]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r={4} fill="rgba(46,164,79,0.26)">
                        <animate attributeName="r" values="4;7;4" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.26;0.35;0.26" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                ))}
                {/* Main traces */}
                <path ref={ref} d="M 100 80 L 200 80 L 200 200 L 400 200 L 400 80 L 600 80 L 600 200 L 800 200 L 800 80 L 1000 80 L 1000 200"
                    fill="none" stroke="rgba(26,127,60,0.16)" strokeWidth="1.2" style={{ filter: 'drop-shadow(0 0 6px rgba(26,127,60,0.35))' }} />
                <path ref={ref2} d="M 100 320 L 300 320 L 300 200 L 500 200 L 500 320 L 700 320 L 700 200 L 900 200 L 900 320 L 1100 320"
                    fill="none" stroke="rgba(26,127,60,0.16)" strokeWidth="1.2" style={{ filter: 'drop-shadow(0 0 6px rgba(26,127,60,0.35))' }} />
                {/* Signal pulse dot on first trace */}
                <circle r="4" fill="rgba(63,185,80,0.55)">
                    <animateMotion dur="6s" repeatCount="indefinite"
                        path="M 100 80 L 200 80 L 200 200 L 400 200 L 400 80 L 600 80 L 600 200 L 800 200 L 800 80 L 1000 80 L 1000 200" />
                </circle>
            </svg>
        </div>
    );
};

// ΓöÇΓöÇΓöÇ Animation 5: Team Particle Constellation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const TeamParticles: React.FC = () => {
    const dots = Array.from({ length: 36 }, (_, i) => ({
        left: `${5 + Math.random() * 90}%`,
        top: `${5 + Math.random() * 90}%`,
        size: i % 15 === 0 ? 3 : 2,
        color: i === 4 ? 'rgba(26,127,60,0.28)' : i === 12 ? 'rgba(46,164,79,0.22)' : i === 24 ? 'rgba(63,185,80,0.18)' : i % 5 === 0 ? 'rgba(46,164,79,0.24)' : 'rgba(26,127,60,0.16)',
        dur: `${8 + Math.random() * 12}s`,
        delay: `-${Math.random() * 15}s`,
    }));
    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {dots.map((d, i) => (
                <div key={i} className="team-dot" style={{
                    left: d.left, top: d.top,
                    width: d.size, height: d.size,
                    background: d.color,
                    animationDuration: d.dur,
                    animationDelay: d.delay,
                }} />
            ))}
        </div>
    );
};

// ΓöÇΓöÇΓöÇ Fade-up wrapper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Section Label ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({
    children, color = "#8E44EC",
}) => (
    <span className="font-inter" style={{
        fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em",
        textTransform: "uppercase", color,
    }}>
        {children}
    </span>
);

// ΓöÇΓöÇΓöÇ Count-up hook ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ STICKY NAV ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const StickyNav: React.FC<{ visible: boolean }> = ({ visible }) => {
    const links = [
        { label: "Mission", href: "#narrative" },
        { label: "Agents", href: "#sentinel" },
        { label: "How It Works", href: "#philosophy" },
        { label: "Tech", href: "#tech" },
        { label: "Team", href: "#team" },
    ];
    return (
        <AnimatePresence>
            {visible && (
                <motion.nav
                    initial={{ y: -72, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -72, opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
                    style={{
                        background: "rgba(255,255,255,0.92)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        borderBottom: "1px solid #E8E5DF",
                    }}
                >
                    <a href="#hero" className="font-bask font-bold" style={{ color: "#16141A", fontSize: 20, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <img src={lightLogoImg} alt="Velocis" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
                    </a>
                    <div className="hidden md:flex items-center gap-8">
                        {links.map((l) => (
                            <a key={l.href} href={l.href} className="nav-link-light" onClick={(e) => { if (l.href.startsWith('/')) { e.preventDefault(); window.location.href = l.href; } }}>{l.label}</a>
                        ))}
                    </div>
                    <a
                        href="#cta"
                        className="hidden md:flex items-center gap-2 font-inter font-semibold"
                        style={{ background: "#16141A", color: "#fff", borderRadius: 8, fontSize: 14, padding: "10px 20px", transition: 'background 250ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1A7F3C')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#16141A')}
                    >
                        <Github size={14} /> Connect GitHub
                    </a>
                </motion.nav>
            )}
        </AnimatePresence>
    );
};

// ΓöÇΓöÇΓöÇ HERO ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const HeroSection: React.FC = () => {
    const words1 = ["We", "built", "the", "Senior", "Engineer"];
    const words2 = ["your", "team", "always", "needed."];
    return (
        <section id="hero" className="relative" style={{ background: "#fff", paddingTop: 40, paddingBottom: 100, overflow: 'hidden', marginTop: 0 }}>
            <HeroCanvas />
            {/* Radial green glow behind heading */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 600px 300px at 50% 40%, rgba(26,127,60,0.04) 0%, transparent 70%)'
            }} />
            <div className="max-w-4xl mx-auto px-6 text-center" style={{ position: 'relative', zIndex: 1 }}>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }} style={{ marginBottom: 12 }}>
                    <span className="font-inter" style={{
                        fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: '#8E44EC',
                        border: '1px solid rgba(26,127,60,0.3)', borderRadius: 999,
                        padding: '4px 16px', display: 'inline-block',
                        marginTop: 0, paddingTop: 0
                    }}>About Velocis</span>
                </motion.div>

                <h1 className="font-bask" style={{
                    fontSize: "72px", fontWeight: 700,
                    lineHeight: 1.10, letterSpacing: "-0.025em", color: "#16141A",
                    maxWidth: 800, marginLeft: "auto", marginRight: "auto", textAlign: "center"
                }}>
                    {[...words1, ...words2].map((w, i) => (
                        <motion.span key={i}
                            initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ duration: 0.7, delay: 0.25 + i * 0.07, ease: [0.21, 0.47, 0.32, 0.98] }}
                            className="inline-block mr-[0.22em]"
                        >{w}</motion.span>
                    ))}
                </h1>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 1.1 }}
                    className="font-inter mx-auto"
                    style={{ fontSize: 19, lineHeight: 1.7, color: "#6B6778", maxWidth: 500, marginTop: 16 }}
                >
                    Velocis is an autonomous AI Digital Team Member, reviewing code, writing tests,
                    mapping architecture.{" "}
                    <span style={{ color: "#16141A", fontWeight: 500 }}>Before you ask.</span>
                </motion.p>
            </div>
        </section>
    );
};

// ΓöÇΓöÇΓöÇ DASHBOARD VISUAL ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const DashboardVisual: React.FC = () => {
    const codeLines = [
        { color: "#6D28D9", width: "42%", label: "function authenticate(user: User)" },
        { color: "#1A56DB", width: "28%", label: "  const token = jwt.sign(payload" },
        { color: "#9B97A8", width: "65%", label: "  if (!validateSchema(user)) throw new Error" },
        { color: "#1A7F3C", width: "38%", label: "  return { token, expiresIn: 3600 }" },
        { color: "#9B97A8", width: "20%", label: "}" },
        { color: "#6D28D9", width: "55%", label: "" },
        { color: "#1A56DB", width: "33%", label: "export const createOrder = async (req, res) =>" },
        { color: "#9B97A8", width: "48%", label: "  const { userId, items } = req.body" },
        { color: "#1A7F3C", width: "60%", label: "  await db.transaction(async (trx) => {" },
        { color: "#9B97A8", width: "25%", label: "    // SQL injection risk detected" },
    ];
    return (
        <section style={{ background: "#fff", paddingBottom: 80 }}>
            <div className="max-w-5xl mx-auto px-6">
                <FadeUp>
                    <div style={{
                        background: "#16141A", borderRadius: 12,
                        boxShadow: "0 24px 80px rgba(22,20,26,0.15)", overflow: "hidden",
                    }}>
                        {/* Top bar */}
                        <div style={{ background: "#1C1A22", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ display: "flex", gap: 7 }}>
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C840" }} />
                            </div>
                            <span className="font-mono-jb" style={{ fontSize: 12, color: "#9B97A8", marginLeft: 8 }}>
                                Velocis - velocis-commerce / src / auth.ts
                            </span>
                        </div>
                        {/* Main area */}
                        <div style={{ display: "flex", minHeight: 320 }}>
                            {/* File tree */}
                            <div style={{ width: 180, background: "#1C1A22", padding: "16px 0", borderRight: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
                                {["≡ƒôü src", "  ≡ƒôä auth.ts", "  ≡ƒôä orders.ts", "  ≡ƒôä payments.ts", "≡ƒôü tests", "  ≡ƒôä auth.spec.ts"].map((f, i) => (
                                    <div key={i} className="font-mono-jb" style={{
                                        fontSize: 11, color: i === 1 ? "#2EA44F" : "#6B6778",
                                        padding: "3px 16px", background: i === 1 ? "rgba(46,164,79,0.08)" : "transparent",
                                        fontWeight: i === 1 ? 600 : 400,
                                    }}>{f}</div>
                                ))}
                            </div>
                            {/* Code */}
                            <div style={{ flex: 1, padding: "20px 28px", position: "relative" }}>
                                {codeLines.map((line, i) => (
                                    <div key={i} className="code-line" style={{
                                        animationDelay: `${0.3 + i * 0.08}s`,
                                        display: "flex", alignItems: "center", gap: 12,
                                        marginBottom: 10,
                                    }}>
                                        <span className="font-mono-jb" style={{ fontSize: 11, color: "#4A4655", minWidth: 22, textAlign: "right" }}>{i + 1}</span>
                                        <div style={{ height: 10, borderRadius: 5, background: line.color, width: line.width, opacity: 0.7 }} />
                                    </div>
                                ))}
                                {/* Sentinel bubble */}
                                <div style={{
                                    position: "absolute", right: 20, top: 28, background: "#1C3828",
                                    border: "1px solid #2EA44F", borderRadius: 8, padding: "10px 14px", maxWidth: 220,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2EA44F" }} />
                                        <span className="font-mono-jb" style={{ fontSize: 10, color: "#2EA44F", fontWeight: 600 }}>SENTINEL</span>
                                    </div>
                                    <p className="font-inter" style={{ fontSize: 11, color: "#86EFAC", lineHeight: 1.5, margin: 0 }}>
                                        ΓÜá SQL injection risk on line 9 - use parameterized queries instead.
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Status bar */}
                        <div style={{ background: "#1C1A22", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 20px", display: "flex", gap: 24 }}>
                            {["Γ£ô Sentinel reviewed", "Fortress generated 12 tests", "Visual Cortex updated"].map((s, i) => (
                                <span key={i} className="font-mono-jb" style={{ fontSize: 11, color: i === 0 ? "#2EA44F" : "#6B6778" }}>{s}</span>
                            ))}
                        </div>
                    </div>
                </FadeUp>
            </div>
        </section>
    );
};

// ΓöÇΓöÇΓöÇ NARRATIVE INTRO ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const NarrativeSection: React.FC = () => (
    <section id="narrative" style={{ background: "#fff", padding: "100px 0" }}>
        <div className="max-w-2xl mx-auto px-6">
            <FadeUp>
                <Label>The Origin</Label>
                <h2 className="font-bask mt-4" style={{
                    fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 700,
                    lineHeight: 1.1, letterSpacing: "-0.02em", color: "#16141A",
                }}>
                    We watched brilliant developers get stuck.
                </h2>
            </FadeUp>
            <FadeUp delay={0.12}>
                <p className="font-inter mt-7" style={{ fontSize: 18, lineHeight: 1.75, color: "#6B6778" }}>
                    A massive Skill Gap and Seniority Bottleneck prevent junior developers from producing
                    production-grade software, while forcing senior engineers to burn hours on repetitive
                    reviews, undocumented systems, and the impossible standard of "ready to ship."
                </p>
                <p className="font-inter mt-5" style={{ fontSize: 18, lineHeight: 1.75, color: "#6B6778" }}>
                    We saw senior engineers trapped in review cycles instead of doing the architecture
                    work only they could do. We saw junior developers improving 10 times slower without
                    real feedback. We built Velocis to fix that permanently.
                </p>
            </FadeUp>
            <FadeUp delay={0.22}>
                <blockquote style={{
                    marginTop: 40, paddingLeft: 24,
                    borderLeft: "4px solid #8E44EC",
                }}>
                    <p className="font-bask" style={{
                        fontSize: "clamp(1.05rem, 2vw, 1.25rem)", fontStyle: "italic",
                        lineHeight: 1.6, color: "#16141A", margin: 0,
                    }}>
                        "Every senior engineer we spoke to said the same thing: I spend 60% of my time
                        reviewing code that should never have reached me."
                    </p>
                </blockquote>
            </FadeUp>
        </div>
    </section>
);

// ΓöÇΓöÇΓöÇ STATS SECTION ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const StatItem: React.FC<{
    numericVal: number; display: string; suffix: string;
    desc: string; color: string; isText?: boolean;
}> = ({ numericVal, display, suffix, desc, color, isText }) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true });
    const count = useCountUp(numericVal, 1500, !isText && inView);

    return (
        <div ref={ref} className="text-center px-8 py-2">
            <div className="font-bask" style={{
                fontSize: "clamp(80px, 10vw, 140px)", fontWeight: 700,
                lineHeight: 1, color,
                textShadow: '0 0 60px rgba(26,127,60,0.12)',
            }}>
                {isText ? display : `${count}${suffix}`}
            </div>
            <p className="font-inter" style={{ fontSize: 15, lineHeight: 1.6, color: "#6B6778", maxWidth: 200, margin: "16px auto 0" }}>
                {desc}
            </p>
        </div>
    );
};

// ΓöÇΓöÇΓöÇ Animation 7: Commit Dot Grid ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

const StatsSection: React.FC = () => (
    <section style={{ background: "#F7F6F3", padding: "100px 0", position: 'relative', overflow: 'hidden' }}>
        <CommitDotGrid />
        <div className="max-w-5xl mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
            <FadeUp className="text-center mb-16">
                <Label>The Numbers</Label>
                <h2 className="font-bask mt-4" style={{
                    fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 700,
                    lineHeight: 1.1, letterSpacing: "-0.02em", color: "#16141A",
                }}>
                    Numbers that matter.
                </h2>
            </FadeUp>
            <FadeUp delay={0.1}>
                <div className="flex flex-col md:flex-row items-center justify-center" style={{ gap: 0 }}>
                    <StatItem numericVal={80} display="80" suffix="%" desc="of logic and security issues caught in real time by Sentinel before merging" color="#1A7F3C" />
                    <div className="hidden md:block" style={{ width: 1, height: 120, background: "#E8E5DF", flexShrink: 0 }} />
                    <StatItem numericVal={10} display="10x" suffix="x" desc="faster skill development for junior developers through mentorship-style automated feedback" color="#1A56DB" />
                    <div className="hidden md:block" style={{ width: 1, height: 120, background: "#E8E5DF", flexShrink: 0 }} />
                    <StatItem numericVal={0} display="Zero" suffix="" desc="human prompts needed. Velocis triggers autonomously on every single commit via webhooks" color="#6D28D9" isText />
                </div>
            </FadeUp>
        </div>
    </section>
);

// ΓöÇΓöÇΓöÇ AGENT PANELS (CSS visuals) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const SentinelPanel: React.FC = () => (
    <div className="agent-visual-float" style={{
        background: "#16141A", borderRadius: 12, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(22,20,26,0.18)",
    }}>
        <div style={{ background: "#1C1A22", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="font-mono-jb" style={{ fontSize: 11, color: "#9B97A8" }}>Sentinel ┬╖ PR #47 ┬╖ Review Complete</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#2EA44F" }} />
                <span className="font-mono-jb" style={{ fontSize: 10, color: "#2EA44F" }}>Γ£ô Reviewed</span>
            </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
            {[
                { type: "remove", text: "const query = `SELECT * FROM users WHERE id = ${id}`" },
                { type: "add", text: "const query = db.prepare('SELECT * FROM users WHERE id = ?')" },
                { type: "add", text: "const result = query.get(id)" },
            ].map((line, i) => (
                <div key={i} className="font-mono-jb" style={{
                    fontSize: 11, lineHeight: "1.8",
                    color: line.type === "remove" ? "#FF7B72" : line.type === "add" ? "#7EE787" : "#9B97A8",
                    background: line.type === "remove" ? "rgba(255,123,114,0.08)" : line.type === "add" ? "rgba(126,231,135,0.08)" : "transparent",
                    padding: "2px 8px", borderRadius: 3, marginBottom: 2,
                }}>
                    {line.type === "remove" ? "- " : line.type === "add" ? "+ " : "  "}{line.text}
                </div>
            ))}
            <div style={{ marginTop: 14, background: "#1C3828", border: "1px solid rgba(46,164,79,0.4)", borderRadius: 8, padding: "10px 14px" }}>
                <p className="font-inter" style={{ fontSize: 11, color: "#86EFAC", lineHeight: 1.5, margin: 0 }}>
                    ≡ƒ¢í SQL injection risk eliminated. Query now uses parameterized statements - safe for production.
                </p>
            </div>
        </div>
    </div>
);

const FortressPanel: React.FC = () => (
    <div className="agent-visual-float" style={{
        background: "#16141A", borderRadius: 12, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(22,20,26,0.18)",
        animationDelay: "0.5s",
    }}>
        <div style={{ background: "#1C1A22", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="font-mono-jb" style={{ fontSize: 11, color: "#9B97A8" }}>Fortress ┬╖ Self-Healing Loop ┬╖ Active</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="blue-pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#1A56DB" }} />
                <span className="font-mono-jb" style={{ fontSize: 10, color: "#60A5FA" }}>Running</span>
            </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
            {[
                { icon: "Γ£ô", color: "#7EE787", text: "auth.test.ts - 8 tests passed" },
                { icon: "Γ£ù", color: "#FF7B72", text: "orders.test.ts - edge case failed" },
                { icon: "Γå╗", color: "#FBBF24", text: "Auto-fixing: boundary condition..." },
                { icon: "Γ£ô", color: "#7EE787", text: "orders.test.ts - 12 tests passed" },
                { icon: "Γ£ô", color: "#7EE787", text: "payments.test.ts - 6 tests passed" },
            ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span className="font-mono-jb" style={{ fontSize: 13, color: row.color, width: 14 }}>{row.icon}</span>
                    <span className="font-mono-jb" style={{ fontSize: 11, color: i === 1 ? "#FF7B72" : i === 2 ? "#FBBF24" : "#9B97A8" }}>{row.text}</span>
                </div>
            ))}
            <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(26,86,219,0.1)", borderRadius: 6, border: "1px solid rgba(26,86,219,0.3)" }}>
                <span className="font-mono-jb" style={{ fontSize: 11, color: "#60A5FA" }}>26/26 tests passing - zero human effort</span>
            </div>
        </div>
    </div>
);

const VCortexPanel: React.FC = () => {
    const nodes = [
        { label: "Auth", x: 60, y: 30, color: "#1A7F3C" },
        { label: "API", x: 200, y: 30, color: "#6D28D9" },
        { label: "DB", x: 60, y: 130, color: "#1A56DB" },
        { label: "Pay", x: 200, y: 130, color: "#8E44EC" },
        { label: "CDN", x: 130, y: 80, color: "#9B97A8" },
    ];
    const edges = [[0, 4], [1, 4], [4, 2], [4, 3], [0, 2], [1, 3]];
    return (
        <div className="agent-visual-float" style={{
            background: "#16141A", borderRadius: 12, overflow: "hidden",
            boxShadow: "0 20px 60px rgba(22,20,26,0.18)",
            animationDelay: "1s",
        }}>
            <div style={{ background: "#1C1A22", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="font-mono-jb" style={{ fontSize: 11, color: "#9B97A8" }}>Visual Cortex ┬╖ Architecture ┬╖ Live</span>
                <span className="font-mono-jb" style={{ fontSize: 10, color: "#C084FC" }}>ΓùÅ Live</span>
            </div>
            <div style={{ padding: 20, position: "relative", height: 200 }}>
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", padding: 20 }} viewBox="0 0 280 180">
                    {edges.map(([a, b], i) => (
                        <line key={i}
                            x1={nodes[a].x + 20} y1={nodes[a].y + 20}
                            x2={nodes[b].x + 20} y2={nodes[b].y + 20}
                            stroke="rgba(142,68,236,0.25)" strokeWidth={1.5} strokeDasharray="4,3"
                        />
                    ))}
                    {nodes.map((n, i) => (
                        <g key={i} className="node-pulse" style={{ animationDelay: `${i * 0.4}s` }}>
                            <circle cx={n.x + 20} cy={n.y + 20} r={18} fill={`${n.color}22`} stroke={n.color} strokeWidth={1.5} />
                            <text x={n.x + 20} y={n.y + 25} textAnchor="middle" fill={n.color}
                                style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                                {n.label}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
            <div style={{ padding: "8px 20px 16px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                {["5 services", "6 connections", "0 orphaned"].map((t, i) => (
                    <span key={i} className="font-mono-jb" style={{ fontSize: 11, color: i === 2 ? "#7EE787" : "#9B97A8" }}>{t}</span>
                ))}
            </div>
        </div>
    );
};

// ΓöÇΓöÇΓöÇ AGENT SECTIONS ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const AgentSection: React.FC<{
    id: string; bg: string; agentNum: string; agentColor: string;
    title: string; body: string; bullets: string[]; linkColor: string; linkLabel: string;
    reverse?: boolean; panel: React.ReactNode;
}> = ({ id, bg, agentNum, agentColor, title, body, bullets, linkColor, linkLabel, reverse, panel }) => {
    const fragsByAgent: Record<string, { left: FragmentDef[]; right: FragmentDef[] }> = {
        sentinel: {
            left: [
                { text: "if (auth.validate())", top: "10%", opacity: 0.07, duration: "9s", delay: "0s" },
                { text: "// SQL injection risk", top: "28%", opacity: 0.06, duration: "11s", delay: "2s" },
                { text: "try { await review() }", top: "46%", opacity: 0.08, duration: "8s", delay: "1s" },
                { text: ".catch(err => log(err))", top: "64%", opacity: 0.06, duration: "13s", delay: "3s" },
                { text: "const token = jwt.sign()", top: "80%", opacity: 0.07, duration: "10s", delay: "0.5s" },
            ],
            right: [
                { text: "PR #47 reviewed Γ£ô", top: "12%", opacity: 0.08, duration: "10s", delay: "1s" },
                { text: "severity: 'critical'", top: "30%", opacity: 0.06, duration: "12s", delay: "0s" },
                { text: "patch: suggested", top: "48%", opacity: 0.07, duration: "9s", delay: "2.5s" },
                { text: "mentor.explain(why)", top: "65%", opacity: 0.06, duration: "11s", delay: "1.5s" },
                { text: "lint.check(semantic)", top: "82%", opacity: 0.07, duration: "8s", delay: "4s" },
            ],
        },
        fortress: {
            left: [
                { text: "expect(fn).toBe(true)", top: "10%", opacity: 0.07, duration: "10s", delay: "0s" },
                { text: "describe('auth', () => {", top: "28%", opacity: 0.06, duration: "12s", delay: "1s" },
                { text: "it('should pass', () => {", top: "46%", opacity: 0.08, duration: "9s", delay: "2s" },
                { text: "await test.run()", top: "64%", opacity: 0.06, duration: "11s", delay: "3s" },
                { text: "coverage: 94.2%", top: "80%", opacity: 0.07, duration: "8s", delay: "0.5s" },
            ],
            right: [
                { text: "Γ£ô 12 tests passing", top: "12%", opacity: 0.08, duration: "9s", delay: "2s" },
                { text: "Γ£ù 1 failing ΓåÆ fixing", top: "30%", opacity: 0.06, duration: "11s", delay: "0s" },
                { text: "Γ£ô 13 tests passing", top: "48%", opacity: 0.07, duration: "10s", delay: "1.5s" },
                { text: "loop.selfHeal()", top: "65%", opacity: 0.06, duration: "13s", delay: "3s" },
                { text: "assert.equal(res, 200)", top: "82%", opacity: 0.07, duration: "8s", delay: "0.5s" },
            ],
        },
        vcortex: {
            left: [
                { text: "graph TD", top: "10%", opacity: 0.07, duration: "9s", delay: "0s" },
                { text: "Auth --> PaymentAPI", top: "28%", opacity: 0.06, duration: "12s", delay: "2s" },
                { text: "DB <-- Lambda", top: "46%", opacity: 0.08, duration: "10s", delay: "1s" },
                { text: "node.connect(edge)", top: "64%", opacity: 0.06, duration: "11s", delay: "3s" },
                { text: "topology.update()", top: "80%", opacity: 0.07, duration: "8s", delay: "0.5s" },
            ],
            right: [
                { text: "visualize(codebase)", top: "12%", opacity: 0.08, duration: "10s", delay: "1s" },
                { text: "ReactFlow.render()", top: "30%", opacity: 0.06, duration: "12s", delay: "0s" },
                { text: "dependencies: mapped", top: "48%", opacity: 0.07, duration: "9s", delay: "2.5s" },
                { text: "onboarding: 2 days", top: "65%", opacity: 0.06, duration: "11s", delay: "1.5s" },
                { text: "knowledge.transfer()", top: "82%", opacity: 0.07, duration: "8s", delay: "4s" },
            ],
        },
    };
    const frags = fragsByAgent[id] ?? fragsByAgent['sentinel'];
    return (
        <section id={id} style={{ background: bg, padding: "100px 0", position: 'relative', overflow: 'hidden' }}>
            <CodeFragments side="left" fragments={frags.left} />
            <CodeFragments side="right" fragments={frags.right} />
            <div className="max-w-6xl mx-auto px-6">
                <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-16`}>
                    {/* Text */}
                    <div className="flex-none md:w-[42%]">
                        <FadeUp>
                            <Label color={agentColor}>{agentNum}</Label>
                            <h2 className="font-bask mt-4" style={{
                                fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 700,
                                lineHeight: 1.1, letterSpacing: "-0.02em", color: "#16141A",
                            }}>
                                {title}
                            </h2>
                        </FadeUp>
                        <FadeUp delay={0.1}>
                            <p className="font-inter mt-6" style={{ fontSize: 18, lineHeight: 1.75, color: "#6B6778" }}>{body}</p>
                            <ul className="mt-6 space-y-3">
                                {bullets.map((b, i) => (
                                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                        <span style={{ color: agentColor, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>Γ£ô</span>
                                        <span className="font-inter" style={{ fontSize: 15, color: "#16141A", fontWeight: 500, lineHeight: 1.55 }}>{b}</span>
                                    </li>
                                ))}
                            </ul>
                            <a href="#" className="font-inter inline-block mt-8" style={{
                                fontSize: 15, fontWeight: 600, color: linkColor,
                                borderBottom: `1px solid ${linkColor}`, paddingBottom: 1,
                                textDecoration: "none", transition: "opacity 0.2s",
                            }}>{linkLabel} ΓåÆ</a>
                        </FadeUp>
                    </div>
                    {/* Visual */}
                    <div className="flex-1">
                        <FadeUp delay={0.15}>{panel}</FadeUp>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ΓöÇΓöÇΓöÇ PHILOSOPHY + PROCESS FLOW ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const PhilosophySection: React.FC = () => {
    const steps = [
        { num: 1, label: "Code Push" },
        { num: 2, label: "Webhook" },
        { num: 3, label: "Sentinel" },
        { num: 4, label: "Fortress" },
        { num: 5, label: "Visual Cortex" },
        { num: 6, label: "Production" },
    ];
    return (
        <section id="philosophy" style={{ background: "#F0EEE9", padding: "100px 0", position: 'relative', overflow: 'hidden' }}>
            <CircuitBoard />
            <div className="max-w-3xl mx-auto px-6 text-center">
                <FadeUp>
                    <Label>The Core Principle</Label>
                    <h2 className="font-bask mt-4" style={{
                        fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 700,
                        lineHeight: 1.1, letterSpacing: "-0.02em", color: "#16141A",
                    }}>
                        It works before you ask.
                    </h2>
                </FadeUp>
                <FadeUp delay={0.12}>
                    <p className="font-bask mx-auto mt-8" style={{
                        fontSize: "clamp(1.05rem, 2vw, 1.25rem)", fontStyle: "italic",
                        lineHeight: 1.6, color: "#16141A", maxWidth: 620,
                    }}>
                        "Unlike every other AI tool, Velocis doesn't wait for a prompt. It proactively
                        monitors your repository and acts autonomously on every single commit."
                    </p>
                </FadeUp>
                {/* Process flow */}
                <FadeUp delay={0.22}>
                    <div style={{ marginTop: 60, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 0 }}>
                        {steps.map((s, i) => (
                            <React.Fragment key={s.num}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 + i * 0.1, duration: 0.45 }}
                                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                                >
                                    <div style={{
                                        width: 40, height: 40, borderRadius: "50%",
                                        background: "#16141A", color: "#fff",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14,
                                    }}>{s.num}</div>
                                    <span className="font-inter" style={{ fontSize: 12, color: "#6B6778", fontWeight: 500, whiteSpace: "nowrap" }}>{s.label}</span>
                                </motion.div>
                                {i < steps.length - 1 && (
                                    <div style={{ width: 32, height: 1, background: "#D4D0C8", margin: "0 4px", marginBottom: 24, flexShrink: 0 }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </FadeUp>
            </div>
        </section>
    );
};

// ΓöÇΓöÇΓöÇ DIFFERENTIATORS TABLE ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const DiffTable: React.FC = () => {
    const rows = [
        { feature: "Interaction Model", others: "Waits for a prompt or command", velocis: "Triggers automatically on every commit" },
        { feature: "Code Review", others: "Syntax-only linting", velocis: "Semantic reasoning + security intent" },
        { feature: "Testing", others: "Requires manual test writing", velocis: "Self-healing loop - zero human effort" },
        { feature: "Documentation", others: "Static, quickly goes stale", velocis: "Live architecture maps, always current" },
    ];
    return (
        <section style={{ background: "#fff", padding: "100px 0" }}>
            <div className="max-w-4xl mx-auto px-6">
                <FadeUp className="text-center mb-14">
                    <Label>Why Velocis</Label>
                    <h2 className="font-bask mt-4" style={{
                        fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 700,
                        lineHeight: 1.1, letterSpacing: "-0.02em", color: "#16141A",
                    }}>
                        Not an assistant. An autonomous teammate.
                    </h2>
                    <p className="font-inter mt-4" style={{ fontSize: 18, color: "#6B6778", lineHeight: 1.6 }}>
                        GitHub Copilot suggests. SonarQube flags. Velocis <em style={{ color: "#16141A" }}>does</em>.
                    </p>
                </FadeUp>
                <FadeUp delay={0.1}>
                    <table style={{ width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid #E8E5DF" }}>
                        <thead>
                            <tr style={{ background: "#F7F6F3" }}>
                                <th className="font-inter" style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#16141A", borderBottom: "1px solid #E8E5DF", width: "28%" }}>Feature</th>
                                <th className="font-inter" style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#9B97A8", borderBottom: "1px solid #E8E5DF" }}>Other Tools</th>
                                <th className="font-inter" style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#1A7F3C", borderBottom: "1px solid #E8E5DF" }}>Velocis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <motion.tr key={i} className="comp-row"
                                    initial={{ opacity: 0, x: -16 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08, duration: 0.5 }}
                                    style={{ background: "#fff", borderBottom: i < rows.length - 1 ? "1px solid #E8E5DF" : "none" }}
                                >
                                    <td className="font-inter" style={{ padding: "16px 20px", fontSize: 15, fontWeight: 600, color: "#16141A" }}>{r.feature}</td>
                                    <td className="font-inter" style={{ padding: "16px 20px", fontSize: 15, color: "#9B97A8" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <X size={14} style={{ color: "#9B97A8", flexShrink: 0 }} />{r.others}
                                        </div>
                                    </td>
                                    <td className="font-inter" style={{ padding: "16px 20px", fontSize: 15, color: "#16141A", fontWeight: 500 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Check size={14} style={{ color: "#1A7F3C", flexShrink: 0 }} />{r.velocis}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </FadeUp>
            </div>
        </section>
    );
};

// ΓöÇΓöÇΓöÇ TECH STACK ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const TechSection: React.FC = () => {
    const cats = [
        { label: "AI Layer", color: "#1A7F3C", items: ["Amazon Bedrock", "Claude 3.5 Sonnet", "Llama 3", "Titan Embeddings v2"] },
        { label: "Backend", color: "#1A56DB", items: ["AWS Step Functions", "AWS Lambda", "API Gateway", "Amazon DynamoDB"] },
        { label: "Dev Tools", color: "#6D28D9", items: ["Amazon Kiro", "Amazon Q Developer"] },
        { label: "Frontend", color: "#8E44EC", items: ["Next.js", "ReactFlow", "GSAP", "AWS Amplify"] },
    ];
    return (
        <section id="tech" style={{ background: "#F7F6F3", padding: "100px 0" }}>
            <div className="max-w-4xl mx-auto px-6">
                <FadeUp className="text-center mb-16">
                    <Label>Technology</Label>
                    <h2 className="font-bask mt-4" style={{
                        fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 700,
                        lineHeight: 1.1, letterSpacing: "-0.02em", color: "#16141A",
                    }}>
                        Built on AWS. Powered by frontier AI.
                    </h2>
                </FadeUp>
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8E5DF", padding: "40px 40px", display: "flex", flexDirection: "column", gap: 32 }}>
                    {cats.map((cat, ci) => (
                        <FadeUp key={ci} delay={ci * 0.07}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
                                <div style={{ width: 100, flexShrink: 0, paddingTop: 6 }}>
                                    <Label color={cat.color}>{cat.label}</Label>
                                </div>
                                <motion.div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                                >
                                    {cat.items.map((item, ii) => (
                                        <motion.span key={ii}
                                            variants={{ hidden: { opacity: 0, scale: 0.88 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.35 } } }}
                                            className="font-inter"
                                            style={{
                                                fontSize: 13, fontWeight: 500, color: "#16141A",
                                                background: "#fff", border: "1px solid #E8E5DF",
                                                borderRadius: 999, padding: "5px 14px",
                                                cursor: "default", transition: "border-color 150ms",
                                                display: "inline-block",
                                            }}
                                            whileHover={{ borderColor: "#16141A" }}
                                        >{item}</motion.span>
                                    ))}
                                </motion.div>
                            </div>
                            {ci < cats.length - 1 && <div style={{ height: 1, background: "#E8E5DF", marginTop: 28 }} />}
                        </FadeUp>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ΓöÇΓöÇΓöÇ TEAM SECTION ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
interface TeamMember {
    initials: string; name: string; role: string; quote: string;
    ringColor: string; glowColor: string; badgeBg: string; badgeText: string;
}
const teamMembers: TeamMember[] = [
    {
        initials: "RK", name: "Rishabh Kumar Jha", role: "Team Leader",
        quote: "We didn't want to build another AI tool. We wanted to build a teammate.",
        ringColor: "#1A7F3C", glowColor: "#DCFCE7", badgeBg: "#DCFCE7", badgeText: "#1A7F3C",
    },
    {
        initials: "PT", name: "Parinita Tiwari", role: "Core Member",
        quote: "Every junior developer deserves a senior engineer in their corner. Velocis makes that possible at scale.",
        ringColor: "#1A56DB", glowColor: "#EFF6FF", badgeBg: "#EFF6FF", badgeText: "#1A56DB",
    },
    {
        initials: "HS", name: "Harsh Singhal", role: "Core Member",
        quote: "The best code review is the one that teaches. We built that into every commit.",
        ringColor: "#6D28D9", glowColor: "#F5F3FF", badgeBg: "#F5F3FF", badgeText: "#6D28D9",
    },
];

const TeamSection: React.FC = () => (
    <section id="team" style={{ background: "#fff", padding: "100px 0", position: 'relative', overflow: 'hidden' }}>
        <TeamParticles />
        <div className="max-w-5xl mx-auto px-6">
            <FadeUp className="text-center mb-6">
                <Label>The Team</Label>
                <h2 className="font-bask mt-4" style={{
                    fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 700,
                    lineHeight: 1.1, letterSpacing: "-0.02em", color: "#16141A",
                }}>
                    The team behind the machine.
                </h2>
                <p className="font-inter mt-4 mx-auto" style={{ fontSize: 18, color: "#6B6778", lineHeight: 1.6, maxWidth: 560 }}>
                    Three builders. One obsession: giving every developer a senior engineer in their corner.
                </p>
            </FadeUp>
            <FadeUp delay={0.1} className="flex justify-center mb-14">
                <div className="font-inter flex items-center gap-2 px-5 py-2" style={{
                    fontSize: 14, fontWeight: 600, color: "#16141A",
                    border: "1px solid #E8E5DF", borderRadius: 999,
                }}>
                    <GitMerge size={15} style={{ color: "#16141A" }} /> Merge Conflict
                </div>
            </FadeUp>

            <motion.div className="grid md:grid-cols-3 gap-6"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            >
                {teamMembers.map((m) => (
                    <motion.div key={m.initials}
                        variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65 } } }}
                        whileHover={{ y: -4, boxShadow: "0 8px 32px rgba(22,20,26,0.10)", transition: { duration: 0.25 } }}
                        style={{ background: "#F7F6F3", borderRadius: 16, border: "1px solid #E8E5DF", padding: 32, textAlign: "center" }}
                    >
                        <div style={{
                            width: 72, height: 72, borderRadius: "50%", background: "#16141A",
                            margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "'Libre Baskerville', serif", fontWeight: 700, fontSize: 22, color: "#fff",
                            outline: `2px solid ${m.ringColor}`, outlineOffset: 3,
                            boxShadow: `0 0 0 6px ${m.glowColor}`,
                        }}>{m.initials}</div>
                        <h3 className="font-inter" style={{ fontSize: 17, fontWeight: 700, color: "#16141A", marginBottom: 8 }}>
                            {m.name}
                        </h3>
                        <span className="font-inter" style={{
                            fontSize: 12, fontWeight: 600, color: m.badgeText,
                            background: m.badgeBg, borderRadius: 999, padding: "3px 12px",
                            display: "inline-block", marginBottom: 18,
                        }}>{m.role}</span>
                        <p className="font-bask" style={{ fontSize: 14, fontStyle: "italic", color: "#6B6778", lineHeight: 1.65, margin: 0 }}>
                            "{m.quote}"
                        </p>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    </section>
);

// ΓöÇΓöÇΓöÇ DUAL CTA ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const CTASection: React.FC = () => (
    <section id="cta" style={{ background: "#F7F6F3", padding: "100px 0", position: 'relative', overflow: 'hidden' }}>
        {/* Animation 7: Gradient mesh orbs */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 600px 400px at 20% 50%, rgba(26,127,60,0.14) 0%, transparent 70%)', animation: 'orb1Drift 12s ease-in-out infinite alternate' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 500px 350px at 80% 30%, rgba(46,164,79,0.11) 0%, transparent 70%)', animation: 'orb2Drift 15s ease-in-out infinite alternate-reverse' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 400px 500px at 60% 80%, rgba(63,185,80,0.09) 0%, transparent 70%)', animation: 'orb3Drift 10s ease-in-out infinite alternate' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 700px 300px at 40% 50%, rgba(22,163,74,0.07) 0%, transparent 70%)', animation: 'orb4Drift 18s ease-in-out infinite alternate' }} />
        </div>
        <div className="max-w-4xl mx-auto px-6">
            <FadeUp className="text-center mb-14">
                <h2 className="font-bask" style={{
                    fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)", fontWeight: 700,
                    lineHeight: 1.1, letterSpacing: "-0.02em", color: "#16141A",
                }}>
                    Ready to meet your new teammate?
                </h2>
            </FadeUp>
            <div className="grid md:grid-cols-2 gap-6">
                {/* Dark card */}
                <FadeUp delay={0.05}>
                    <div style={{ background: "#16141A", borderRadius: 12, padding: 40, height: "100%" }}>
                        <h3 className="font-bask" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: 16 }}>
                            Connect your repository.
                        </h3>
                        <p className="font-inter" style={{ fontSize: 16, color: "#9B97A8", lineHeight: 1.65, marginBottom: 28 }}>
                            Velocis configures itself via OAuth. No passwords. No manual setup. Just connect and it starts working.
                        </p>
                        <motion.a href="#" whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}
                            className="font-inter inline-flex items-center gap-2"
                            style={{
                                fontSize: 15, fontWeight: 600, color: "#fff",
                                background: "#2EA44F", borderRadius: 6, padding: "12px 24px",
                                textDecoration: "none", display: "inline-flex",
                            }}
                        >
                            <Github size={17} /> Connect with GitHub ΓåÆ
                        </motion.a>
                        <div style={{ display: "flex", gap: 18, marginTop: 16, flexWrap: "wrap" }}>
                            {[
                                { icon: <Eye size={12} />, text: "Read-only" },
                                { icon: <Lock size={12} />, text: "No code changes" },
                                { icon: <Shield size={12} />, text: "Secure OAuth" },
                            ].map((b, i) => (
                                <div key={i} className="font-inter" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6B6778" }}>
                                    <span style={{ color: "#9B97A8" }}>{b.icon}</span>{b.text}
                                </div>
                            ))}
                        </div>
                    </div>
                </FadeUp>
                {/* Light card */}
                <FadeUp delay={0.12}>
                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8E5DF", padding: 40, height: "100%" }}>
                        <h3 className="font-bask" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16141A", marginBottom: 16 }}>
                            Learn about Velocis.
                        </h3>
                        <p className="font-inter" style={{ fontSize: 16, color: "#6B6778", lineHeight: 1.65, marginBottom: 28 }}>
                            Explore how Sentinel, Fortress, and Visual Cortex work together to eliminate the bottleneck
                            between junior talent and production-grade software.
                        </p>
                        <a href="#narrative" className="font-inter" style={{
                            fontSize: 15, fontWeight: 600, color: "#16141A",
                            borderBottom: "1px solid #16141A", paddingBottom: 1,
                            textDecoration: "none",
                        }}>
                            Read the docs ΓåÆ
                        </a>
                    </div>
                </FadeUp>
            </div>
        </div>
    </section>
);

// ΓöÇΓöÇΓöÇ FOOTER ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const Footer: React.FC = () => (
    <footer className="font-inter" style={{
        background: "#fff", borderTop: "1px solid #E8E5DF",
        padding: "28px 40px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 12,
    }}>
        <span style={{ fontSize: 14, color: "#16141A", fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
            Velocis.
        </span>
        <span style={{ fontSize: 13, color: "#9B97A8" }}>
            ┬⌐ 2025 Velocis ┬╖ Built by{" "}
            <span style={{ color: "#16141A", fontWeight: 600 }}>Merge Conflict</span>
        </span>
        <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "GitHub"].map((l) => (
                <a key={l} href="#" style={{ fontSize: 13, color: "#6B6778", textDecoration: "none" }}>{l}</a>
            ))}
        </div>
    </footer>
);

// ΓöÇΓöÇΓöÇ PAGE ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export default function AboutPage() {
    const [navVisible, setNavVisible] = useState(false);
    const [scrollPct, setScrollPct] = useState(0);

    useEffect(() => {
        const onScroll = () => {
            setNavVisible(window.scrollY > window.innerHeight * 0.55);
            const doc = document.documentElement;
            const pct = (window.scrollY / (doc.scrollHeight - doc.clientHeight)) * 100;
            setScrollPct(pct);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className="font-inter" style={{ background: "#fff", color: "#16141A", minHeight: "100vh" }}>
            <FontStyle />
            <GrainOverlay />
            {/* Scroll progress */}
            <div className="scroll-progress" style={{ width: `${scrollPct}%` }} />
            <StickyNav visible={navVisible} />
            <HeroSection />
            <DashboardVisual />
            <NarrativeSection />
            <StatsSection />
            <AgentSection
                id="sentinel"
                bg="#fff"
                agentNum="AGENT 01"
                agentColor="#1A7F3C"
                title="The Intelligent Guardian."
                body="Sentinel performs real-time code reviews focused on logic, scalability, and security, not just syntax. It explains the why behind every suggestion, making it a mentor as much as a reviewer."
                bullets={[
                    "Catches up to 80% of logic and security issues before merging",
                    "Proactively detects SQL injection, XSS vulnerabilities, API leaks",
                    "Frees senior engineers for architecture-level decisions",
                ]}
                linkColor="#1A7F3C"
                linkLabel="Learn about Sentinel"
                panel={<SentinelPanel />}
            />
            <AgentSection
                id="fortress"
                bg="#F7F6F3"
                agentNum="AGENT 02"
                agentColor="#1A56DB"
                title="The Autonomous QA Engine."
                body="Fortress implements Zero-Touch TDD powered by AWS Step Functions. It writes, executes, and fixes unit tests automatically, a closed loop that requires zero human effort."
                bullets={[
                    "Self-healing loop: Write ΓåÆ Run ΓåÆ Fix - fully automated",
                    "Uncovers edge-case bugs often missed in manual testing",
                    "Powered by AWS Step Functions for reliability at scale",
                ]}
                linkColor="#1A56DB"
                linkLabel="Learn about Fortress"
                reverse
                panel={<FortressPanel />}
            />
            <AgentSection
                id="vcortex"
                bg="#fff"
                agentNum="AGENT 03"
                agentColor="#6D28D9"
                title="The Live Architect."
                body="Visual Cortex converts your codebase into a live, interactive architecture map, built with ReactFlow and GSAP. It updates in real-time as code evolves, eliminating dependency on undocumented tribal knowledge."
                bullets={[
                    "Live architecture diagram updates on every commit automatically",
                    "Reduces onboarding time from months to days",
                    "Eliminates dependency on tribal knowledge and stale docs",
                ]}
                linkColor="#6D28D9"
                linkLabel="Learn about Visual Cortex"
                panel={<VCortexPanel />}
            />
            <PhilosophySection />
            <DiffTable />
            <TechSection />
            <TeamSection />
            <CTASection />
            <Footer />
        </div>
    );
}

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Check, Star, Download, ChevronDown, List, Eye, Shield, GitBranch, Terminal, ExternalLink, Tag, Calendar, Hash, FileText, Copy, Link } from "lucide-react";
import README_CONTENT from './doc_content';
import { VELOCIS_LOGO_BASE64 } from "../components/Logo";



const FontStyle = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    
    .font-bask { font-family: 'Libre Baskerville', Georgia, serif; }
    .font-inter { font-family: 'Inter', -apple-system, sans-serif; }
    .font-mono-jb { font-family: 'JetBrains Mono', monospace; }

    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-feature-settings: "kern" 1, "liga" 1, "calt" 1; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
    
    ::selection { background: rgba(26,127,60,0.15); color: #16141A; }
    *:focus-visible { outline: 2px solid #1A7F3C; outline-offset: 3px; }

    .code-frag {
      position: absolute; font-family: 'JetBrains Mono', monospace; font-size: 11px;
      color: rgba(26,127,60,0.20); white-space: nowrap; pointer-events: none;
      will-change: transform; animation: floatCode linear infinite;
    }
    @keyframes floatCode {
      0%   { transform: translateY(0px) translateX(0px); }
      33%  { transform: translateY(-16px) translateX(6px); }
      66%  { transform: translateY(16px) translateX(-6px); }
      100% { transform: translateY(0px) translateX(0px); }
    }

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
    .nav-link-light.active { color: #16141A; font-weight: 600; }
    
    .logo-dot { animation: logoDotPulse 1.1s step-end infinite; display:inline-block;width:2px;height:13px;background:#1A7F3C;margin-left:2px;vertical-align:middle; }
    @keyframes logoDotPulse { 0%,100%{opacity:1} 50%{opacity:0} }

    .toc-item {
        font-family: 'Inter', sans-serif; font-size: 14px; padding: 7px 12px; border-radius: 6px; cursor: pointer; color: #6B6778; transition: all 150ms; display: block; width: 100%; text-align: left;
    }
    .toc-item:hover { color: #16141A; background: #F0EDE8; }
    .toc-item.active { color: #1A7F3C; background: #DCFCE7; font-weight: 600; border-left: 2px solid #1A7F3C; border-top-left-radius: 0; border-bottom-left-radius: 0; }

    .readme-heading-2 { position: relative; margin-top: 64px; margin-bottom: 16px; border-left: 3px solid #1A7F3C; padding-left: 16px; }
    .readme-heading-3 { position: relative; margin-top: 40px; margin-bottom: 12px; }
    .heading-anchor { opacity: 0; position: absolute; left: -24px; top: 50%; transform: translateY(-50%); transition: opacity 150ms; cursor: pointer; }
    .readme-heading-2:hover .heading-anchor, .readme-heading-3:hover .heading-anchor { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .code-frag, .logo-dot, .orb { animation: none !important; }
      html { scroll-behavior: auto; }
    }
    
    .md-code-block { background: #0D1117; border-radius: 10px; padding: 20px 24px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 16px rgba(0,0,0,0.15); position: relative; overflow: hidden; margin-bottom: 20px; }
    .md-code-chrome { height: 28px; background: #161B22; position: absolute; top:0; left:0; right:0; display:flex; align-items:center; padding: 0 16px; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .md-code-dots { display:flex; gap: 5px; }
    .md-code-dots div { width: 8px; height: 8px; border-radius: 50%; }
    .md-code-content { margin-top: 28px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; color: #E6EDF3; overflow-x: auto; }
    
    .syntax-keyword { color: #FF79C6; }
    .syntax-string { color: #A5D6FF; }
    .syntax-number { color: #79C0FF; }
    .syntax-comment { color: rgba(255,255,255,0.3); }
    .syntax-function { color: #D2A8FF; }
    .syntax-property { color: #FFA657; }
    .syntax-green { color: #3FB950; }
    .syntax-red { color: #FF7B72; }

    .md-table { width: 100%; border-radius: 10px; overflow: hidden; margin: 24px 0; border-collapse: separate; border-spacing: 0; box-shadow: 0 2px 8px rgba(22,20,26,0.06); }
    .md-table th { background: #16141A; color: #E6EDF3; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; padding: 12px 20px; text-align: left; }
    .md-table td { font-family: 'Inter', sans-serif; font-size: 14px; color: #16141A; padding: 12px 20px; border-bottom: 1px solid #F0EDE8; }
    .md-table tr:nth-child(even) td { background: #FAFAF8; }
    .md-table tr:nth-child(odd) td { background: #FFFFFF; }
    .md-table tr:hover td { background: #F0FDF4; transition: 150ms; }

    .md-blockquote { background: rgba(26,127,60,0.04); border-left: 3px solid #1A7F3C; border-radius: 0 8px 8px 0; padding: 16px 20px; position: relative; margin-bottom: 20px; overflow: hidden; }
    .md-list-item { font-family: 'Inter', sans-serif; font-size: 16px; color: #6B6778; line-height: 1.75; display: flex; align-items: flex-start; margin-bottom: 8px; transition: transform 150ms, color 150ms; }
    .md-list-item:hover { color: #16141A; transform: translateX(3px); }
    .md-list-dot { width: 6px; height: 6px; border-radius: 50%; background: #1A7F3C; margin-top: 11px; margin-right: 18px; flex-shrink: 0; }
    `}</style>
);

interface FragmentDef { text: string; top: string; opacity: number; duration: string; delay: string; }

const CodeFragments: React.FC<{ side: 'left' | 'right'; fragments: FragmentDef[] }> = ({ side, fragments }) => (
    <div style={{ position: 'absolute', top: 0, bottom: 0, [side]: 8, width: 180, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }} className="hidden xl:block">
        {fragments.map((f, i) => (
            <span key={i} className="code-frag" style={{ top: f.top, [side]: 0, opacity: f.opacity, animationDuration: f.duration, animationDelay: f.delay }}>{f.text}</span>
        ))}
    </div>
);

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

        let paused = false;
        const handleVisibility = () => { paused = document.hidden; };
        document.addEventListener('visibilitychange', handleVisibility);

        const COUNT = 55;
        const nodes = Array.from({ length: COUNT }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
            r: 1.5 + Math.random() * 1.5,
            pulse: 0, pulseDir: 0,
        }));

        let pulseTimer = 0;
        let lastTime = performance.now();

        const draw = (time: number) => {
            if (paused) {
                lastTime = time;
                rafRef.current = requestAnimationFrame(draw);
                return;
            }
            const dt = (time - lastTime) / 16.66;
            lastTime = time;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pulseTimer += dt;

            if (pulseTimer > 200) { // roughly 3-4s
                const n = nodes[Math.floor(Math.random() * nodes.length)];
                n.pulseDir = 1; pulseTimer = 0;
            }

            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                if (a.pulseDir === 1) { a.pulse += 0.05 * dt; if (a.pulse >= 1) a.pulseDir = -1; }
                else if (a.pulseDir === -1) { a.pulse -= 0.05 * dt; if (a.pulse <= 0) { a.pulse = 0; a.pulseDir = 0; } }

                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j]; const dx = a.x - b.x; const dy = a.y - b.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 120) {
                        const alpha = (1 - d / 120) * (a.pulse > 0 ? 0.38 : 0.12);
                        const col = `rgba(26,127,60,${alpha})`;
                        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1;
                        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }

                const pr = a.r + a.pulse * 3;
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

                a.x += a.vx * dt; a.y += a.vy * dt;
                if (a.x < 0 || a.x > canvas.width) a.vx *= -1;
                if (a.y < 0 || a.y > canvas.height) a.vy *= -1;
            }
            rafRef.current = requestAnimationFrame(draw);
        };
        rafRef.current = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', handleVisibility); };
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
};

const StickyNav: React.FC<{ visible: boolean }> = ({ visible }) => {
    const [logoHovered, setLogoHovered] = useState(false);

    return (
        <motion.nav
            initial={{ y: -68, opacity: 0 }}
            animate={{ y: visible ? 0 : -68, opacity: visible ? 1 : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8"
            style={{
                height: 68,
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(16px)",
                borderBottom: "1px solid #E8E5DF",
                boxShadow: visible ? "0 1px 0 rgba(22,20,26,0.08)" : "none",
            }}
        >
            <a
                href="/"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    textDecoration: 'none'
                }}
                onMouseEnter={() => setLogoHovered(true)}
                onMouseLeave={() => setLogoHovered(false)}
            >
                <img
                    src={VELOCIS_LOGO_BASE64}
                    alt="Velocis"
                    style={{
                        height: '44px',
                        width: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                        transform: logoHovered ? 'scale(1.04)' : 'scale(1)',
                        transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                        filter: logoHovered
                            ? 'drop-shadow(0 0 8px rgba(150, 80, 240, 0.45))'
                            : 'none',
                    }}
                />
            </a>
            <div className="hidden md:flex items-center gap-8">
                {["About", "Careers", "Blog", "Docs", "Security", "Contact"].map((l) => (
                    <a key={l} href={l === 'Docs' ? '/docs' : '/'} className={`nav-link-light ${l === "Docs" ? "active" : ""}`}>{l}</a>
                ))}
            </div>
            <a
                href="#"
                className="hidden md:flex items-center gap-2 font-inter font-semibold"
                style={{ background: "#16141A", color: "#fff", borderRadius: 8, fontSize: 13, padding: "9px 18px", transition: 'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1A7F3C'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,127,60,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#16141A'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
                Connect GitHub
            </a>
        </motion.nav>
    );
};

// --- Markdown Parsing ---
function parseMarkdown(md: string) {
    const lines = md.split('\n');
    const result: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeLang = '';
    let listItems: React.ReactNode[] = [];
    let inList = false;

    const parseInline = (text: string, keyPrefix: string) => {
        let parts: React.ReactNode[] = [];
        let cur = text;
        let pidx = 0;

        while (cur.length > 0) {
            const badgeMatch = cur.match(/^\[\!\[(.*?)\]\((.*?)\)\]\((.*?)\)/);
            if (badgeMatch) {
                const alt = badgeMatch[1];
                let bg = "#DCFCE7", color = "#1A7F3C";
                if (alt === "License") { bg = "#EFF6FF"; color = "#1A56DB"; }
                else if (alt === "AWS") { bg = "#FFF7ED"; color = "#EA580C"; }
                else if (alt === "Bedrock") { bg = "#F5F3FF"; color = "#6D28D9"; }

                parts.push(
                    <span key={`b-${keyPrefix}-${pidx++}`} style={{
                        background: bg, color, borderRadius: 999, padding: "3px 12px",
                        fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11, display: "inline-block", marginRight: 8, marginBottom: 8
                    }}>
                        {alt}
                    </span>
                );
                cur = cur.slice(badgeMatch[0].length);
                continue;
            }

            const boldMatch = cur.match(/^\*\*(.*?)\*\*/);
            if (boldMatch) {
                parts.push(<strong key={`bo-${keyPrefix}-${pidx++}`} style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#16141A" }}>{boldMatch[1]}</strong>);
                cur = cur.slice(boldMatch[0].length);
                continue;
            }

            const italicMatch = cur.match(/^\*(.*?)\*/);
            if (italicMatch) {
                parts.push(<em key={`it-${keyPrefix}-${pidx++}`} style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: "italic", color: "#6B6778" }}>{italicMatch[1]}</em>);
                cur = cur.slice(italicMatch[0].length);
                continue;
            }

            const codeMatch = cur.match(/^`(.*?)`/);
            if (codeMatch) {
                parts.push(<code key={`ic-${keyPrefix}-${pidx++}`} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#1A7F3C",
                    background: "rgba(26,127,60,0.08)", border: "1px solid rgba(26,127,60,0.15)",
                    borderRadius: 4, padding: "2px 8px"
                }}>{codeMatch[1]}</code>);
                cur = cur.slice(codeMatch[0].length);
                continue;
            }

            parts.push(cur[0]);
            cur = cur.slice(1);
        }

        return <>{parts}</>;
    };

    const flushList = (key: number) => {
        if (inList && listItems.length > 0) {
            result.push(<div key={`ul-${key}`} style={{ marginBottom: 20 }}>{listItems}</div>);
            listItems = [];
            inList = false;
        }
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (inCodeBlock) {
            if (trimmed === '```') {
                inCodeBlock = false;
                result.push(
                    <div key={`code-${i}`} className="md-code-block">
                        <div className="md-code-chrome">
                            <div className="md-code-dots">
                                <div style={{ background: "#FF5F57" }} /><div style={{ background: "#FFBD2E" }} /><div style={{ background: "#28C840" }} />
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#6B6778" }}>{codeLang}</div>
                        </div>
                        <div style={{ position: 'absolute', top: 36, right: 12 }}>
                            <button className="flex items-center justify-center" style={{
                                background: "transparent", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6,
                                width: 32, height: 32, cursor: "pointer", transition: "all 150ms"
                            }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
                                onClick={(e) => {
                                    navigator.clipboard.writeText(codeContent);
                                    const el = e.currentTarget;
                                    el.innerHTML = '<span style="color:#7EE787"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>';
                                    setTimeout(() => {
                                        el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6778" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                                    }, 1500);
                                }}>
                                <Copy size={14} color="#6B6778" />
                            </button>
                        </div>
                        <pre className="md-code-content">
                            {codeContent.split('\n').map((cl, cli) => {
                                let html = cl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                                html = html.replace(/\b(const|interface|import|type|from|export|await|async|new|function)\b/g, '<span class="syntax-keyword">$1</span>');
                                html = html.replace(/('[^']*'|"[^"]*")/g, '<span class="syntax-string">$1</span>');
                                html = html.replace(/\b(\d+)\b/g, '<span class="syntax-number">$1</span>');
                                html = html.replace(/(\/\/.*)/g, '<span class="syntax-comment">$1</span>');
                                html = html.replace(/\b(true|pass)\b/g, '<span class="syntax-green">$1</span>');
                                html = html.replace(/\b(false|fail)\b/g, '<span class="syntax-red">$1</span>');
                                return <div key={cli} dangerouslySetInnerHTML={{ __html: html || ' ' }} style={{ minHeight: '1.7em' }} />;
                            })}
                        </pre>
                    </div>
                );
                codeContent = '';
            } else {
                codeContent += line + '\n';
            }
            i++;
            continue;
        }

        if (trimmed.startsWith('```')) {
            flushList(i);
            inCodeBlock = true;
            codeLang = trimmed.slice(3).trim();
            i++;
            continue;
        }

        if (trimmed === '---') {
            flushList(i);
            result.push(
                <div key={`hr-${i}`} style={{ margin: "24px 0", position: "relative", textAlign: "center" }}>
                    <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#E8E5DF" }} />
                    <div style={{ position: "relative", display: "inline-block", background: "#FFFFFF", padding: "0 16px", color: "#E8E5DF", letterSpacing: 4, fontSize: 10 }}>
                        ● ● ●
                    </div>
                </div>
            );
            i++;
            continue;
        }

        if (trimmed.startsWith('# ')) {
            flushList(i);
            result.push(<h1 key={`h1-${i}`} className="font-bask" style={{ fontSize: 40, fontWeight: 700, color: "#16141A", letterSpacing: "-0.03em", marginBottom: 8 }}>{parseInline(trimmed.slice(2), `h1-${i}`)}</h1>);
            i++; continue;
        }
        if (trimmed.startsWith('## ')) {
            flushList(i);
            const id = trimmed.slice(3).toLowerCase().replace(/[^\w]+/g, '-');
            result.push(
                <h2 key={`h2-${i}`} id={id} className="font-bask readme-heading-2" style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, color: "#16141A", letterSpacing: "-0.02em" }}>
                    <a href={`#${id}`} className="heading-anchor" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#' + id); }}><Link size={16} color="#9B97A8" /></a>
                    {parseInline(trimmed.slice(3), `h2-${i}`)}
                </h2>
            );
            i++; continue;
        }
        if (trimmed.startsWith('### ')) {
            flushList(i);
            const id = trimmed.slice(4).toLowerCase().replace(/[^\w]+/g, '-');
            result.push(
                <h3 key={`h3-${i}`} id={id} className="font-bask readme-heading-3" style={{ fontSize: 22, fontWeight: 700, color: "#16141A" }}>
                    <a href={`#${id}`} className="heading-anchor" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#' + id); }}><Link size={16} color="#9B97A8" /></a>
                    {parseInline(trimmed.slice(4), `h3-${i}`)}
                </h3>
            );
            i++; continue;
        }
        if (trimmed.startsWith('#### ')) {
            flushList(i);
            result.push(<h4 key={`h4-${i}`} className="font-inter" style={{ fontSize: 16, fontWeight: 700, color: "#16141A", marginTop: 28, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{parseInline(trimmed.slice(5), `h4-${i}`)}</h4>);
            i++; continue;
        }

        if (trimmed.startsWith('> ')) {
            flushList(i);
            result.push(
                <blockquote key={`bq-${i}`} className="md-blockquote">
                    <div style={{ position: "absolute", top: -10, left: -6, fontSize: 72, color: "rgba(26,127,60,0.08)", fontFamily: "Georgia, serif", lineHeight: 1 }}>❝</div>
                    <p className="font-bask" style={{ fontStyle: "italic", fontSize: 18, color: "#2C2A36", lineHeight: 1.7, margin: 0, position: "relative", zIndex: 1 }}>
                        {parseInline(trimmed.slice(2), `bq-${i}`)}
                    </p>
                </blockquote>
            );
            i++; continue;
        }

        if (trimmed.startsWith('- ')) {
            inList = true;
            listItems.push(
                <div key={`li-${i}`} className="md-list-item">
                    <div className="md-list-dot" />
                    <div>{parseInline(trimmed.slice(2), `li-${i}`)}</div>
                </div>
            );
            i++; continue;
        }

        if (trimmed.match(/^\d+\.\s/)) {
            inList = true;
            const match = trimmed.match(/^(\d+)\.\s(.*)/)!;
            listItems.push(
                <div key={`li-${i}`} className="md-list-item">
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#1A7F3C", marginTop: 2, marginRight: 12, width: 16, textAlign: "right", flexShrink: 0 }}>{match[1]}.</div>
                    <div>{parseInline(match[2], `li-${i}`)}</div>
                </div>
            );
            i++; continue;
        }

        if (trimmed.startsWith('|')) {
            flushList(i);
            const tableRows: React.ReactNode[] = [];
            let rIdx = 0;
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                const rowLine = lines[i].trim();
                if (rowLine.includes('---')) { i++; continue; }

                const cells = rowLine.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
                if (rIdx === 0) {
                    tableRows.push(<tr key={`tr-${i}`}>{cells.map((c, ci) => <th key={`th-${ci}`}>{c}</th>)}</tr>);
                } else {
                    tableRows.push(
                        <tr key={`tr-${i}`}>
                            {cells.map((c, ci) => (
                                <td key={`td-${ci}`}>{parseInline(c, `td-${i}-${ci}`)}</td>
                            ))}
                        </tr>
                    );
                }
                rIdx++;
                i++;
            }
            result.push(
                <table key={`tbl-${i}`} className="md-table">
                    <tbody>{tableRows}</tbody>
                </table>
            );
            continue;
        }

        if (trimmed.length > 0 && !trimmed.startsWith('[')) {
            flushList(i);
            result.push(<p key={`p-${i}`} className="font-inter" style={{ fontSize: 17, color: "#6B6778", lineHeight: 1.8, maxWidth: "70ch", marginBottom: 20 }}>{parseInline(trimmed, `p-${i}`)}</p>);
        } else if (trimmed.startsWith('[')) {
            flushList(i);
            result.push(<div key={`badge-${i}`} style={{ display: "flex", flexWrap: "wrap", marginBottom: 20 }}>{parseInline(trimmed, `badgerow-${i}`)}</div>);
        } else {
            flushList(i);
        }

        i++;
    }
    flushList(i);

    return <>{result}</>;
}


export default function DocsPage() {
    const heroRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeSection, setActiveSection] = useState("");

    const handleScroll = () => {
        setScrolled(window.scrollY > 80);
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        setScrollProgress((winScroll / height) * 100);
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const headings = document.querySelectorAll('.readme-heading-2, .readme-heading-3');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, { rootMargin: '-100px 0px -60% 0px' });
        headings.forEach(h => observer.observe(h));
        return () => observer.disconnect();
    }, []);

    const handleDownload = () => {
        const blob = new Blob([README_CONTENT], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'velocis-README.md';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(README_CONTENT);
    };

    const parsedContent = parseMarkdown(README_CONTENT);

    return (
        <div style={{ background: '#FFFFFF', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
            <FontStyle />
            <GrainOverlay />
            <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress / 100})`, left: 0, width: '100%' }}>
                <div style={{ position: 'absolute', right: 0, top: -1, width: 4, height: 4, borderRadius: '50%', background: '#3FB950', boxShadow: '0 0 6px #3FB950' }} />
            </div>

            <StickyNav visible={scrolled} />

            <section ref={heroRef} style={{ position: 'relative', paddingTop: 32, paddingBottom: 32 }}>
                <HeroCanvas />
                <div className="max-w-4xl mx-auto px-6 text-center" style={{ position: 'relative', zIndex: 1 }}>
                    <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, type: "spring" }} style={{ marginBottom: 24 }}>
                        <span className="font-mono-jb" style={{ fontSize: 11, color: "#1A7F3C", letterSpacing: "0.14em", padding: "4px 16px", borderRadius: 999, border: "1px solid rgba(26,127,60,0.30)", background: "rgba(26,127,60,0.05)" }}>
                            DOCUMENTATION
                        </span>
                    </motion.div>

                    <h1 className="font-bask" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.03em", color: "#16141A", maxWidth: 720, margin: "0 auto" }}>
                        {"Everything you need to build with Velocis.".split(' ').map((w, i) => (
                            <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', marginRight: '0.22em' }}>
                                <motion.span style={{ display: 'inline-block' }} initial={{ y: '110%', filter: 'blur(8px)' }} animate={{ y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.65, delay: i * 0.055, ease: [0.22, 1, 0.36, 1] }}>
                                    {w}
                                </motion.span>
                            </span>
                        ))}
                    </h1>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.4 }} className="font-inter" style={{ fontSize: 17, color: "#6B6778", maxWidth: 500, margin: "16px auto 0", lineHeight: 1.68 }}>
                        One README. Every technology, every architecture decision, every integration - documented clearly and downloadable instantly.
                    </motion.p>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                        {[
                            { text: "v2.4.1 stable", color: "#1A7F3C", border: "rgba(26,127,60,0.3)", mono: true },
                            { text: "Last updated March 2026", color: "#6B6778", border: "#E8E5DF", mono: false },
                            { text: "MIT Licensed", color: "#6B6778", border: "#E8E5DF", mono: false }
                        ].map((p, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                                style={{
                                    border: `1px solid ${p.border}`, borderRadius: 999, padding: "4px 12px",
                                    color: p.color, fontFamily: p.mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
                                    fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
                                }}>
                                {i === 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A7F3C', display: 'inline-block', animation: 'pulse-green 2s infinite' }} />}
                                {p.text}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: "0 0 32px", background: "#FFFFFF", position: 'relative', zIndex: 10 }}>
                <div className="max-w-[860px] mx-auto px-6">
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                        style={{ background: "#16141A", borderRadius: 14, padding: "20px 28px", display: "flex", alignItems: "center", justifyItems: "stretch", justifyContent: "space-between", gap: 24, boxShadow: "0 4px 24px rgba(22,20,26,0.15), 0 0 0 1px rgba(26,127,60,0.12)", flexWrap: "wrap" }}>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <FileText size={20} color="#3FB950" />
                            <div>
                                <div className="font-mono-jb" style={{ fontSize: 14, fontWeight: 600, color: "#E6EDF3" }}>README.md</div>
                                <div className="font-inter" style={{ fontSize: 13, color: "#6B6778" }}>Velocis Technical Documentation - Complete infrastructure and technology reference</div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                            <button onClick={handleDownload} className="flex items-center gap-2 font-inter" style={{ background: "#2EA44F", color: "white", borderRadius: 8, fontWeight: 600, fontSize: 14, padding: "10px 20px", transition: "all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#22863A"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(46,164,79,0.30)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#2EA44F"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                                <Download size={16} /> Download README.md
                            </button>
                            <button onClick={handleCopy} className="flex items-center gap-2 font-inter" style={{ background: "rgba(255,255,255,0.06)", color: "#E6EDF3", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontWeight: 500, fontSize: 14, padding: "10px 18px", transition: "all 200ms" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}>
                                <Copy size={16} /> Copy to clipboard
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section style={{ background: "#FFFFFF", padding: "24px 0 64px", position: "relative" }}>
                <CodeFragments side="left" fragments={[
                    { text: "npm install velocis", top: "15%", opacity: 0.20, duration: "8s", delay: "0s" },
                    { text: "git clone repo", top: "35%", opacity: 0.18, duration: "10s", delay: "2s" },
                    { text: "docker compose up", top: "55%", opacity: 0.22, duration: "7s", delay: "1s" },
                    { text: "export default config", top: "70%", opacity: 0.19, duration: "11s", delay: "3s" },
                    { text: "import { Velocis }", top: "85%", opacity: 0.21, duration: "9s", delay: "0.5s" },
                ]} />
                <CodeFragments side="right" fragments={[
                    { text: "README.md", top: "20%", opacity: 0.22, duration: "9s", delay: "1s" },
                    { text: "// docs updated", top: "40%", opacity: 0.19, duration: "12s", delay: "0s" },
                    { text: "v2.4.1 stable", top: "60%", opacity: 0.21, duration: "8s", delay: "2.5s" },
                    { text: "aws deploy --prod", top: "75%", opacity: 0.18, duration: "10s", delay: "1.5s" },
                    { text: "bedrock.invoke()", top: "90%", opacity: 0.20, duration: "11s", delay: "4s" },
                ]} />

                <div className="max-w-[1120px] mx-auto px-6 flex flex-col lg:flex-row gap-12 relative z-10">
                    <div className="w-full lg:w-[28%] flex-shrink-0">
                        <div style={{ position: "sticky", top: 88 }}>
                            <div style={{ background: "#F7F6F3", borderRadius: 14, border: "1px solid #E8E5DF", padding: 24 }}>
                                <div className="font-mono-jb" style={{ fontSize: 11, color: "#9B97A8", letterSpacing: "0.14em", marginBottom: 16 }}>ON THIS PAGE</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {[
                                        { id: "overview", label: "Overview" },
                                        { id: "architecture", label: "Architecture" },
                                        { id: "technology-stack", label: "Technology Stack" },
                                        { id: "api-reference", label: "API Reference" },
                                        { id: "getting-started", label: "Getting Started" },
                                        { id: "license", label: "License" },
                                    ].map(item => (
                                        <a key={item.id} href={`#${item.id}`} className={`toc-item ${activeSection === item.id ? 'active' : ''}`}>
                                            {item.label}
                                        </a>
                                    ))
                                    }
                                </div>
                                <div style={{ borderTop: "1px solid #E8E5DF", margin: "20px 0" }} />

                                <div style={{ background: "#FFFFFF", border: "1px solid #E8E5DF", borderRadius: 10, padding: 16 }}>
                                    <div className="font-mono-jb" style={{ fontSize: 12, color: "#16141A", marginBottom: 10 }}>README.md</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                                        <div className="flex items-center gap-2 font-inter" style={{ fontSize: 13, color: "#6B6778" }}><Calendar size={14} /> March 1, 2026</div>
                                        <div className="flex items-center gap-2 font-inter" style={{ fontSize: 13, color: "#6B6778" }}><Tag size={14} /> v2.4.1</div>
                                        <div className="flex items-center gap-2 font-inter" style={{ fontSize: 13, color: "#6B6778" }}><FileText size={14} /> 540 words</div>
                                    </div>
                                    <button onClick={handleDownload} className="w-full flex items-center justify-center gap-2 font-inter" style={{ background: "#1A7F3C", color: "white", borderRadius: 8, fontWeight: 600, fontSize: 13, padding: "8px 0" }}>
                                        <Download size={14} /> Download .md
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-[72%] bg-white rounded-xl break-words" ref={contentRef}>
                        {parsedContent}
                    </div>
                </div>
            </section>

            <section style={{ background: "#F7F6F3", padding: "32px 0", position: "relative" }}>
                <div className="max-w-[860px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 relative">
                    {[
                        { num: "540", label: "Words documented" },
                        { num: "6", label: "Sections covered" },
                        { num: "2", label: "Code examples" },
                        { num: "v2.4.1", label: "Current version" }
                    ].map((stat, i) => (
                        <div key={i} className="text-center relative">
                            {i > 0 && <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-12" style={{ background: "linear-gradient(to bottom, transparent, #E8E5DF, transparent)" }} />}
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
                                <div className="font-bask" style={{ fontSize: 36, fontWeight: 700, color: "#16141A", lineHeight: 1 }}>{stat.num}</div>
                                <div className="font-inter" style={{ fontSize: 13, color: "#6B6778", marginTop: 4 }}>{stat.label}</div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ background: "#F7F6F3", padding: "64px 0", position: "relative", overflow: "hidden" }}>
                <div className="w-full relative z-10 px-6">
                    <div className="max-w-[680px] mx-auto text-center mb-12">
                        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
                            className="font-bask" style={{ fontSize: "clamp(36px, 4.5vw, 48px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#16141A" }}>
                            Take the docs with you.
                        </motion.h2>
                        <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
                            className="font-inter" style={{ fontSize: 17, color: "#6B6778", maxWidth: 420, margin: "16px auto 0", lineHeight: 1.6 }}>
                            Download the complete Velocis README as a markdown file. Every technology, every architecture decision, every API reference — yours to keep.
                        </motion.p>
                    </div>

                    <div className="max-w-[800px] mx-auto flex flex-col md:flex-row gap-6">
                        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}
                            className="w-full md:w-1/2 flex flex-col justify-between"
                            style={{ background: "linear-gradient(135deg, #16141A 0%, #1D1B26 100%)", borderRadius: 16, padding: 40, position: "relative" }}>
                            <div style={{ position: "absolute", inset: 0, backgroundSize: "20px 20px", backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", borderRadius: 16, pointerEvents: "none" }} />
                            <div className="relative z-10">
                                <h3 className="font-bask" style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 16 }}>Download README.md</h3>
                                <p className="font-inter" style={{ fontSize: 15, color: "#9B97A8", marginBottom: 28, lineHeight: 1.6 }}>
                                    The complete technical reference - 540 words, 6 sections, 2 code examples. Works offline, in your editor, anywhere.
                                </p>
                                <div className="flex items-center gap-3 mb-6">
                                    <FileText size={16} color="#3FB950" />
                                    <span className="font-mono-jb" style={{ fontSize: 13, color: "#E6EDF3" }}>README.md</span>
                                    <span className="font-mono-jb" style={{ fontSize: 11, color: "#6B6778" }}>18.4 KB</span>
                                </div>
                            </div>
                            <button onClick={handleDownload} className="relative z-10 w-full flex items-center justify-center gap-2 font-inter"
                                style={{ background: "#2EA44F", color: "white", borderRadius: 8, fontWeight: 600, fontSize: 14, padding: "12px 24px", transition: "all 200ms" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#22863A"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(46,164,79,0.35)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#2EA44F"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                                <Download size={16} /> Download README.md
                            </button>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.3 }}
                            className="w-full md:w-1/2 flex flex-col justify-between"
                            style={{ background: "#FFFFFF", borderRadius: 16, padding: 40, border: "1px solid #E8E5DF" }}>
                            <div>
                                <div className="flex items-center justify-center mb-6" style={{ width: 40, height: 40, background: "#F0FDF4", borderRadius: 10, transition: "transform 200ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = "rotate(4deg) scale(1.06)"; e.currentTarget.style.background = "#DCFCE7"; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = "rotate(0) scale(1)"; e.currentTarget.style.background = "#F0FDF4"; }}>
                                    <span className="font-bask" style={{ fontSize: 18, fontWeight: 700, color: "#1A7F3C" }}>V</span>
                                </div>
                                <h3 className="font-bask" style={{ fontSize: 22, fontWeight: 700, color: "#16141A", marginBottom: 16 }}>Connect your repository.</h3>
                                <p className="font-inter" style={{ fontSize: 15, color: "#6B6778", marginBottom: 28, lineHeight: 1.6 }}>
                                    Ready to see Velocis in action? Connect via OAuth and Sentinel starts reviewing your next pull request automatically.
                                </p>
                            </div>
                            <div>
                                <button className="w-full flex items-center justify-center gap-2 font-inter mb-4"
                                    style={{ background: "#16141A", color: "white", borderRadius: 8, fontWeight: 600, fontSize: 14, padding: "12px 24px", transition: "all 200ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#1A7F3C"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(26,127,60,0.25)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "#16141A"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                                    Connect with GitHub
                                </button>
                                <div className="font-inter text-center" style={{ fontSize: 12, color: "#6B6778" }}>
                                    Read-only · No code stored · Revoke anytime
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
            {/* FOOTER */}
            <footer style={{ background: "#FFFFFF", borderTop: "1px solid #E8E5DF", padding: "60px 0" }}>
                <div className="max-w-[1080px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <img src={VELOCIS_LOGO_BASE64} alt="Velocis" style={{ height: '32px', width: 'auto' }} />
                        <div className="font-inter text-[14px] text-[#6B6778]">
                            © 2025 Velocis · Engineered by Merge Conflict
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        {["Twitter", "GitHub", "Discord", "Privacy", "Terms"].map((l) => (
                            <a key={l} href="#" className="font-inter text-[14px] text-[#6B6778] hover:text-[#16141A] transition-colors">{l}</a>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}


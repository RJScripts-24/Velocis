"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Shield, Lock, Key, Check, X, ChevronDown, Mail, AlertTriangle, Eye, Unlock, Globe, Database, Zap, RefreshCw, Copy, FileX, ArrowUpRight } from 'lucide-react';

const GStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;cursor:none!important;}
    html{scroll-behavior:smooth;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#16141A;font-feature-settings:"kern"1,"liga"1,"calt"1;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;}
    ::selection{background:rgba(26,127,60,0.15);color:#16141A;}
    .fb{font-family:'Libre Baskerville',serif;}
    .fm{font-family:'JetBrains Mono',monospace;}
    button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid #1A7F3C;outline-offset:3px;}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
    @media(max-width:768px){*{cursor:auto!important;}.cc{display:none!important;}}
    @keyframes blink{50%{opacity:0;}}
    @keyframes breathe{0%,100%{transform:scale(.95);opacity:.5;}50%{transform:scale(1.05);opacity:1;}}
    @keyframes pr{0%{box-shadow:0 0 0 0 rgba(26,127,60,.4);}70%{box-shadow:0 0 0 8px rgba(26,127,60,0);}100%{box-shadow:0 0 0 0 rgba(26,127,60,0);}}`}
  </style>
);

const Cursor = () => {
  const [p, setP] = useState({ x: -100, y: -100 }), [h, setH] = useState(false);
  useEffect(() => {
    const mv = (e: MouseEvent) => setP({ x: e.clientX, y: e.clientY });
    const ov = (e: MouseEvent) => setH(!!(e.target as HTMLElement).closest('a,button,[role="button"]'));
    window.addEventListener('mousemove', mv); window.addEventListener('mouseover', ov);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseover', ov); };
  }, []);
  return <motion.div className="cc fixed top-0 left-0 w-[6px] h-[6px] rounded-full pointer-events-none z-[10000]" style={{ backgroundColor: h ? 'transparent' : '#1A7F3C', border: h ? '1px solid #1A7F3C' : 'none' }} animate={{ x: p.x - 3, y: p.y - 3, scale: h ? 4 : 1 }} transition={{ type: 'spring', damping: 30, stiffness: 250, mass: .5 }} />;
};

const ProgBar = () => {
  const { scrollYProgress } = useScroll();
  const sx = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return <motion.div style={{ scaleX: sx }} className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1A7F3C] to-[#3FB950] origin-left z-[9999]"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-[#3FB950] rounded-full shadow-[0_0_6px_#3FB950]" /></motion.div>;
};

const Grain = () => <div style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none', opacity: .04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />;

const Canvas = () => {
  const cr = useRef<HTMLCanvasElement>(null), rf = useRef(0);
  useEffect(() => {
    const c = cr.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const rs = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    rs(); window.addEventListener('resize', rs);
    const ns = Array.from({ length: 55 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, pulse: 0, pDir: 0 }));
    let pt = 0;
    const draw = () => {
      if (document.hidden) { rf.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, c.width, c.height); pt++;
      if (pt > 200) { ns[Math.floor(Math.random() * ns.length)].pDir = 1; pt = 0; }
      ns.forEach((n, i) => {
        if (n.pDir === 1) { n.pulse += .12; if (n.pulse >= 1) n.pDir = -1; }
        else if (n.pDir === -1) { n.pulse -= .12; if (n.pulse <= 0) { n.pulse = 0; n.pDir = 0; } }
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > c.width) n.vx *= -1;
        if (n.y < 0 || n.y > c.height) n.vy *= -1;
        ns.slice(i + 1).forEach(m => { const d = Math.hypot(n.x - m.x, n.y - m.y); if (d < 140) { ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.strokeStyle = `rgba(26,127,60,${.12 * (1 - d / 140)})`; ctx.lineWidth = 1; ctx.stroke(); } });
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.5 + n.pulse * 3, 0, Math.PI * 2);
        if (n.pulse > 0) { ctx.shadowBlur = 14; ctx.shadowColor = `rgba(46,164,79,${n.pulse * .28})`; } else ctx.shadowBlur = 0;
        ctx.fillStyle = n.pulse > 0 ? `rgba(46,164,79,${.18 + n.pulse * .2})` : 'rgba(26,127,60,0.18)'; ctx.fill();
      });
      rf.current = requestAnimationFrame(draw);
    };
    rf.current = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', rs); cancelAnimationFrame(rf.current); };
  }, []);
  return <canvas ref={cr} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const Lbl = ({ children, color = '#1A7F3C', pill }: { children: React.ReactNode; color?: string; pill?: boolean }) => (
  <div className={`fm uppercase text-[11px] tracking-[0.14em] inline-block${pill ? ' border border-[rgba(26,127,60,0.3)] bg-[rgba(26,127,60,0.05)] rounded-full px-4 py-1.5' : ''}`} style={{ color }}>{children}</div>
);

const FadeUp = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .7, delay, ease: [.25, .1, .25, 1] }} className={className}>{children}</motion.div>
);

const Divider = () => <div className="flex flex-col items-center gap-3 py-2 pointer-events-none opacity-20"><div className="w-px h-10 bg-gradient-to-b from-transparent via-[#E8E5DF] to-transparent" /><div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[#1A7F3C]" />)}</div></div>;

const Nav = () => {
  const [sc, setSc] = useState(false);
  useEffect(() => { const h = () => setSc(window.scrollY > 80); window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h); }, []);
  return (
    <motion.nav initial={{ y: -60, opacity: 0 }} animate={{ y: sc ? 0 : -60, opacity: sc ? 1 : 0 }} className="fixed top-0 left-0 right-0 h-[60px] z-[5000] px-8 flex items-center justify-between border-b border-[#E8E5DF] bg-[rgba(255,255,255,0.92)] backdrop-blur-[16px]" style={{ boxShadow: sc ? '0 1px 0 rgba(22,20,26,0.08)' : 'none' }}>
      <div className="flex items-center gap-2"><span className="fb font-bold text-[18px]">Velocis.</span><div className="w-[2px] h-[13px] bg-[#1A7F3C] animate-[blink_1.1s_step-end_infinite]" /></div>
      <div className="hidden md:flex items-center gap-8 font-[500] text-[14px] text-[#4B4856]">
        {[['About', '/about'], ['Careers', '/careers'], ['Security', '/security'], ['Contact', '/contact']].map(([x, href]) => (
          <a key={x} href={href} className={`relative group transition-colors ${x === 'Security' ? 'text-[#16141A] font-semibold' : 'hover:text-[#16141A]'}`}>{x}<span className={`absolute -bottom-1 left-0 w-full h-[1px] bg-[#1A7F3C] origin-left transition-transform duration-200 ${x === 'Security' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} /></a>
        ))}
      </div>
      <motion.button whileHover={{ y: -1, backgroundColor: '#1A7F3C', boxShadow: '0 4px 12px rgba(26,127,60,0.25)' }} className="bg-[#16141A] text-white px-[18px] py-[9px] rounded-[8px] font-semibold text-[13px]">Connect GitHub</motion.button>
    </motion.nav>
  );
};

const Frags = ({ s }: { s: 'left' | 'right' }) => {
  const fs = s === 'left' ? ['encrypt(payload)', 'auth.validate(token)', 'ssl: TLS 1.3', 'scope: read-only', 'oauth.verify()'] : ['no secrets stored', 'jwt.sign(claims)', 'access: minimal', 'audit.log(event)', 'revoke anytime'];
  return (
    <div className={`fixed top-0 bottom-0 ${s === 'left' ? 'left-4' : 'right-4'} w-36 pointer-events-none hidden xl:flex flex-col justify-around z-0`}>
      {fs.map((f, i) => <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: .2, x: s === 'left' ? [0, 6, 0] : [0, -6, 0], y: [0, -14, 0] }} transition={{ duration: 6 + i * 1.2, delay: i * 1.1, repeat: Infinity, ease: 'easeInOut' }} className="fm text-[11px] text-[#1A7F3C] whitespace-nowrap">{f}</motion.div>)}
    </div>
  );
};

const CircuitBg = () => {
  const r1 = useRef<SVGPathElement>(null), r2 = useRef<SVGPathElement>(null), sec = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sec.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        [r1.current, r2.current].forEach(p => { if (!p) return; const len = p.getTotalLength(); p.style.strokeDasharray = `${len}`; p.style.strokeDashoffset = `${len}`; p.style.transition = 'stroke-dashoffset 3s ease'; requestAnimationFrame(() => { p.style.strokeDashoffset = '0'; }); });
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={sec} className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
        {[[200, 80], [400, 80], [600, 200], [800, 80], [1000, 200]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={4} fill="rgba(46,164,79,0.26)"><animate attributeName="r" values="4;7;4" dur={`${2 + i * .3}s`} repeatCount="indefinite" /><animate attributeName="opacity" values="0.26;0.35;0.26" dur={`${2 + i * .3}s`} repeatCount="indefinite" /></circle>)}
        <path ref={r1} d="M 100 80 L 200 80 L 200 200 L 400 200 L 400 80 L 600 80 L 600 200 L 800 200 L 800 80 L 1000 80 L 1000 200" fill="none" stroke="rgba(26,127,60,0.16)" strokeWidth="1.2" />
        <path ref={r2} d="M 100 320 L 300 320 L 300 200 L 500 200 L 500 320 L 700 320 L 900 320 L 1100 320" fill="none" stroke="rgba(26,127,60,0.14)" strokeWidth="1.2" />
        <circle r="4" fill="rgba(63,185,80,0.55)"><animateMotion dur="6s" repeatCount="indefinite" path="M 100 80 L 200 80 L 200 200 L 400 200 L 400 80 L 600 80 L 600 200 L 800 200 L 800 80 L 1000 80 L 1000 200" /></circle>
      </svg>
    </div>
  );
};

const DarkPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-[#16141A] rounded-[14px] overflow-hidden shadow-[0_0_0_1px_rgba(26,127,60,0.12),0_24px_64px_rgba(22,20,26,0.10)]">
    <div className="bg-[#1C1A22] px-4 py-2.5 flex items-center gap-3 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-[#FF5F57]" /><div className="w-3 h-3 rounded-full bg-[#FEBC2E]" /><div className="w-3 h-3 rounded-full bg-[#28C840]" /></div>
      <span className="fm text-[11px] text-[#5A5768] flex-1 text-center">{title}</span>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

export default function SecurityPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [cp, setCp] = useState(false);
  const copyEmail = () => { navigator.clipboard.writeText('security@velocis.ai'); setCp(true); setTimeout(() => setCp(false), 2000); };

  const stats = [
    { icon: <Shield size={22} />, num: 'Read-only', label: 'OAuth scope. We never write to your repo.', ac: '#1A7F3C' },
    { icon: <Lock size={22} />, num: 'Zero', label: 'Lines of your code ever stored on our servers.', ac: '#1A7F3C' },
    { icon: <Key size={22} />, num: 'TLS 1.3', label: 'All data in transit encrypted end-to-end.', ac: '#1A7F3C' },
    { icon: <RefreshCw size={22} />, num: 'Instant', label: 'Access revocation from your GitHub settings.', ac: '#1A7F3C' },
  ];

  const vulns = [
    { sev: 'HIGH', sevC: '#DC2626', sevBg: '#FEF2F2', icon: <AlertTriangle size={18} />, title: 'SQL Injection', body: 'Detects unsanitized user input passed directly to database queries — one of the most critical vulnerability classes.' },
    { sev: 'HIGH', sevC: '#DC2626', sevBg: '#FEF2F2', icon: <Shield size={18} />, title: 'Cross-Site Scripting (XSS)', body: 'Identifies unescaped user-controlled data rendered in HTML context, enabling script injection attacks.' },
    { sev: 'HIGH', sevC: '#DC2626', sevBg: '#FEF2F2', icon: <Key size={18} />, title: 'API Key and Secret Exposure', body: 'Scans for hardcoded API keys, tokens, passwords, and credentials accidentally committed to the codebase.' },
    { sev: 'MEDIUM', sevC: '#EA580C', sevBg: '#FFF7ED', icon: <Unlock size={18} />, title: 'Broken Authentication', body: 'Detects weak authentication patterns, missing token expiry, insecure session handling, and improper access controls.' },
    { sev: 'MEDIUM', sevC: '#EA580C', sevBg: '#FFF7ED', icon: <FileX size={18} />, title: 'Insecure Dependencies', body: 'Flags usage of packages with known CVEs and recommends secure alternatives or patched versions.' },
    { sev: 'INFO', sevC: '#1A56DB', sevBg: '#EFF6FF', icon: <Eye size={18} />, title: 'Security Misconfiguration', body: 'Identifies CORS misconfigurations, open redirects, missing security headers, and overly permissive settings.' },
  ];

  const faqs = [
    { q: 'Does Velocis store my source code?', a: 'No. Velocis never stores your source code. Code is processed in-memory by Amazon Bedrock and immediately discarded. Only repository metadata, PR summaries, and agent outputs are stored in DynamoDB.' },
    { q: 'What GitHub permissions does Velocis request?', a: 'Velocis requests a single OAuth scope: read:repo. This allows us to read repository contents and monitor pull request events via webhooks. We do not request write access, admin access, or access to your secrets or environment variables.' },
    { q: 'Can I revoke Velocis access at any time?', a: 'Yes. You can revoke Velocis access instantly from GitHub Settings, Applications, Authorized OAuth Apps. The moment you revoke access, Velocis loses all ability to read your repository.' },
    { q: 'Is Velocis compliant with SOC 2 or ISO 27001?', a: 'Velocis is built on AWS infrastructure which maintains SOC 2 Type II, ISO 27001, and numerous other certifications. Velocis itself is an early-stage product and is working toward formal compliance certification.' },
    { q: 'Does Velocis use my code to train AI models?', a: 'No. Amazon Bedrock, which powers Velocis agents, does not use customer data to train or improve foundation models by default. Your code is never used as training data.' },
    { q: 'How are webhook secrets secured?', a: 'GitHub webhook payloads are verified using HMAC-SHA256 signature validation. Any payload that fails signature verification is rejected immediately before processing.' },
    { q: 'What happens to my data if I stop using Velocis?', a: 'Upon account deletion or access revocation, all repository metadata and stored agent outputs are purged within 30 days. You can request immediate deletion by contacting security@velocis.ai.' },
    { q: 'Is data encrypted at rest and in transit?', a: 'Yes. All data stored in DynamoDB is encrypted at rest using AES-256. All data in transit is protected by TLS 1.3. Internal AWS service-to-service communication uses AWS VPC with additional encryption.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <GStyle /><Cursor /><ProgBar /><Grain /><Nav />

      {/* HERO */}
      <section className="relative pt-14 pb-12 bg-white overflow-hidden text-center px-6">
        <Canvas />
        <div className="absolute inset-0 pointer-events-none animate-[breathe_9s_ease-in-out_infinite] bg-[radial-gradient(ellipse_600px_300px_at_50%_50%,rgba(26,127,60,0.04)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-[680px] mx-auto">
          <motion.div initial={{ scale: .85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mb-3"><Lbl pill>SECURITY AT VELOCIS</Lbl></motion.div>
          <h1 className="fb font-bold text-[56px] leading-[1.08] tracking-[-0.03em] text-[#16141A]">
            {['Security', 'is', 'not', 'a', 'feature.', 'It', 'is', 'the', 'foundation.'].map((w, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.2em]">
                <motion.span initial={{ y: '110%', filter: 'blur(8px)' }} animate={{ y: 0, filter: 'blur(0)' }} transition={{ duration: .65, delay: .1 + i * .055, ease: [.22, 1, .36, 1] }} className="inline-block">{w}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5, duration: .6 }} className="text-[17px] text-[#6B6778] leading-[1.68] mt-4 max-w-[500px] mx-auto">Velocis connects to your codebase with the minimum permissions necessary. Read-only. Transparent. Fully revocable. Your code belongs to you, always.</motion.p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {[{ t: 'Read-only OAuth', a: true }, { t: 'No code stored', a: false }, { t: 'Revoke anytime', a: false }].map((x, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6 + i * .1 }} className={`fm text-[12px] px-4 py-1.5 border rounded-full ${x.a ? 'border-[rgba(26,127,60,0.3)] text-[#1A7F3C] animate-[pr_2s_infinite]' : 'border-[#E8E5DF] text-[#6B6778]'}`}>{x.t}</motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white pb-12 px-6">
        <div className="max-w-[960px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 28, scale: .97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .6, delay: i * .1, ease: [.25, .1, .25, 1] }} whileHover={{ y: -4, borderColor: 'rgba(26,127,60,0.2)', boxShadow: '0 12px 36px rgba(22,20,26,0.08)' }} className="bg-[#F7F6F3] border border-[#E8E5DF] rounded-[14px] p-6 cursor-default">
              <div className="w-11 h-11 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-4" style={{ color: s.ac }}>{s.icon}</div>
              <div className="fb font-bold text-[28px] text-[#16141A] leading-none mb-2">{s.num}</div>
              <p className="text-[13px] text-[#6B6778] leading-relaxed">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Divider />

      {/* OAUTH MODEL */}
      <section className="relative py-14 bg-[#F7F6F3] overflow-hidden px-6">
        <Frags s="left" /><Frags s="right" />
        <div className="relative z-10 max-w-[1000px] mx-auto">
          <FadeUp className="text-center mb-10">
            <Lbl>● THE CONNECTION MODEL</Lbl>
            <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3 tracking-[-0.025em]">How Velocis connects to your code.</h2>
            <p className="text-[17px] text-[#6B6778] mt-4 max-w-[520px] mx-auto leading-relaxed">We use GitHub OAuth exclusively. No passwords. No deploy keys. No personal access tokens.</p>
          </FadeUp>
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-start">
            <motion.div initial={{ opacity: 0, x: -32, filter: 'blur(12px)' }} whileInView={{ opacity: 1, x: 0, filter: 'blur(0)' }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .8, delay: .2 }}>
              <DarkPanel title="oauth-flow.log">
                <div className="space-y-1">
                  {[
                    { n: '1', t: 'User clicks Connect with GitHub', c: '#8B949E' },
                    { n: '2', t: 'GitHub OAuth popup opens', c: '#8B949E' },
                    { n: '3', t: 'read:repo scope requested only', c: '#3FB950' },
                    { n: '4', t: 'OAuth token returned securely', c: '#3FB950' },
                    { n: '5', t: 'Token stored encrypted, never exposed', c: '#58A6FF' },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: .3 + i * .15, duration: .4 }} className="flex items-center gap-3 py-2.5 px-3 rounded-lg" style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div className="w-6 h-6 rounded-full bg-[rgba(26,127,60,0.15)] flex items-center justify-center fm text-[10px] text-[#3FB950] flex-shrink-0">{s.n}</div>
                      <span className="fm text-[12px]" style={{ color: s.c }}>{s.t}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3FB950] animate-[pr_2s_infinite] flex-shrink-0" />
                  <span className="fm text-[10px] text-[#5A5768]">Scope: read:repo only · No write access · Revoke at github.com/settings/applications</span>
                </div>
              </DarkPanel>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .8, delay: .35 }} className="flex flex-col gap-6">
              <div><Lbl>PERMISSIONS</Lbl><h3 className="fb font-bold text-[22px] text-[#16141A] mt-1.5">Minimal by design.</h3><p className="text-[15px] text-[#6B6778] mt-2 leading-[1.7]">We request only the permissions required for Velocis to function. You can verify this at any time in your GitHub settings.</p></div>
              <div>
                <p className="font-bold text-[13px] text-[#16141A] mb-3">What Velocis CAN do:</p>
                {['Read repository contents and file structure', 'Monitor pull request events via webhooks', 'Read commit history and branch information', 'Access public repository metadata'].map((t, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-[#F0EDE8]"><Check size={16} className="text-[#1A7F3C] flex-shrink-0 mt-0.5" /><span className="text-[14px] text-[#16141A]">{t}</span></div>
                ))}
              </div>
              <div className="h-[1px] bg-[#E8E5DF]" />
              <div>
                <p className="font-bold text-[13px] text-[#DC2626] mb-3">What Velocis CANNOT do:</p>
                {['Write, edit, or delete any code', 'Create or merge pull requests', 'Access private SSH keys or secrets', 'Read environment variables or .env files', 'Access repositories you have not authorized'].map((t, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-[#F0EDE8]"><X size={16} className="text-[#DC2626] flex-shrink-0 mt-0.5" /><span className="text-[14px] text-[#6B6778]">{t}</span></div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Divider />

      {/* SECURITY PILLARS */}
      <section className="py-14 bg-white px-6">
        <FadeUp className="text-center mb-10">
          <Lbl>● SECURITY PILLARS</Lbl>
          <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3 tracking-[-0.025em]">Built secure from the ground up.</h2>
          <p className="text-[17px] text-[#6B6778] mt-4 max-w-[520px] mx-auto leading-relaxed">Three architectural principles that govern every decision we make.</p>
        </FadeUp>
        <div className="max-w-[1000px] mx-auto space-y-6">
          {[
            { n: '01', color: '#1A7F3C', lbl: 'DATA PRIVACY', title: 'Your code never leaves your control.', body: 'Velocis processes code in-memory using Amazon Bedrock. We do not persist, store, or cache your source code on any Velocis infrastructure. Every analysis is ephemeral — it happens, delivers results, and the code is gone.', bullets: ['In-memory processing only — nothing written to disk', 'Amazon Bedrock processes in isolated containers', 'No training on your proprietary codebase'], code: [{ l: 'storage.code = false', c: '#FF7B72' }, { l: 'processing: "in-memory"', c: '#3FB950' }, { l: 'retention: "ephemeral"', c: '#3FB950' }, { l: 'bedrock.isolate = true', c: '#A5D6FF' }, { l: 'train_on_data: false', c: '#FF7B72' }] },
            { n: '02', color: '#1A56DB', lbl: 'ACCESS CONTROL', title: 'Least privilege. Always.', body: 'Velocis operates on the principle of least privilege. We request only the minimum GitHub OAuth scope needed — read:repo — and our internal architecture enforces this at every layer.', bullets: ['Single OAuth scope: read:repo only', 'Role-based access controls within Velocis infrastructure', 'All agent actions logged and auditable'], code: [{ l: "scope: ['read:repo']", c: '#79C0FF' }, { l: 'write_access: false', c: '#FF7B72' }, { l: 'delete_access: false', c: '#FF7B72' }, { l: "webhook: ['pull_request']", c: '#A5D6FF' }, { l: 'revocation: "instant"', c: '#3FB950' }] },
            { n: '03', color: '#6D28D9', lbl: 'INFRASTRUCTURE', title: 'Enterprise-grade infrastructure.', body: 'Velocis is built entirely on AWS serverless infrastructure. No persistent servers to patch, no long-running processes to compromise, and automatic scaling with built-in redundancy.', bullets: ['Serverless architecture eliminates persistent attack surface', 'TLS 1.3 encryption for all data in transit', 'AWS Lambda functions isolated per execution'], code: [{ l: 'arch: "serverless"', c: '#3FB950' }, { l: 'tls: "1.3"', c: '#3FB950' }, { l: 'isolation: "per-invocation"', c: '#A5D6FF' }, { l: 'persistence: "none"', c: '#FF7B72' }, { l: 'provider: "AWS"', c: '#79C0FF' }] },
          ].map((p, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .7, delay: .1 }} className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-[${idx % 2 === 1 ? '#F7F6F3' : 'white'}] rounded-[16px] border border-[#E8E5DF] p-8`}>
              <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                <Lbl color={p.color}>PILLAR {p.n} — {p.lbl}</Lbl>
                <h3 className="fb font-bold text-[24px] text-[#16141A] mt-2 leading-snug">{p.title}</h3>
                <p className="text-[15px] text-[#6B6778] mt-3 leading-[1.75]">{p.body}</p>
                <div className="mt-4 space-y-2">
                  {p.bullets.map((b, bi) => <div key={bi} className="flex items-start gap-3"><Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: p.color }} /><span className="text-[14px] font-semibold text-[#16141A]">{b}</span></div>)}
                </div>
              </div>
              <div className={idx % 2 === 1 ? 'lg:order-1' : ''}>
                <DarkPanel title={`config.pillar-${p.n.toLowerCase()}`}>
                  {p.code.map((line, li) => (
                    <div key={li} className="flex gap-4 py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                      <span className="fm text-[11px] text-[rgba(255,255,255,0.2)] w-5 text-right flex-shrink-0">{li + 1}</span>
                      <span className="fm text-[12px]" style={{ color: line.c }}>{line.l}</span>
                    </div>
                  ))}
                </DarkPanel>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <Divider />

      {/* AWS SECURITY */}
      <section className="relative py-14 bg-[#F7F6F3] overflow-hidden px-6">
        <CircuitBg />
        <div className="relative z-10 max-w-[900px] mx-auto">
          <FadeUp className="text-center mb-10">
            <Lbl>● INFRASTRUCTURE</Lbl>
            <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3 tracking-[-0.025em]">Secured by AWS.</h2>
            <p className="text-[17px] text-[#6B6778] mt-4 max-w-[540px] mx-auto leading-relaxed">Every component of Velocis runs on Amazon Web Services — one of the most audited and certified cloud infrastructures on the planet.</p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: <Globe size={22} />, bg: '#DCFCE7', ic: '#1A7F3C', title: 'Amazon Bedrock', note: 'SOC 2 · ISO 27001', body: 'AI inference runs in AWS-managed isolated environments. Your prompts and code are not used to train foundation models.' },
              { icon: <Zap size={22} />, bg: '#EFF6FF', ic: '#1A56DB', title: 'AWS Lambda', note: 'Isolated execution · Zero persistence', body: 'Each function execution is isolated. No shared state between invocations. Attack surface is minimal by architecture.' },
              { icon: <Database size={22} />, bg: '#F5F3FF', ic: '#6D28D9', title: 'Amazon DynamoDB', note: 'Encrypted at rest · AES-256', body: 'Stores only repository metadata and agent outputs — never source code. Encrypted at rest using AES-256.' },
              { icon: <Globe size={22} />, bg: '#DCFCE7', ic: '#1A7F3C', title: 'Amazon API Gateway', note: 'TLS 1.3 · Rate limited', body: 'All external requests pass through API Gateway with TLS 1.3 enforcement, rate limiting, and request validation.' },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24, scale: .97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .6, delay: i * .1 }} whileHover={{ y: -4, borderColor: 'rgba(26,127,60,0.2)', boxShadow: '0 12px 36px rgba(22,20,26,0.08)' }} className="bg-white border border-[#E8E5DF] rounded-[14px] p-6 cursor-default">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.bg, color: c.ic }}>{c.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-[15px] text-[#16141A]">{c.title}</span>
                      <span className="fm text-[10px] text-[#1A7F3C] bg-[#DCFCE7] px-2 py-0.5 rounded-full">{c.note}</span>
                    </div>
                    <p className="text-[13px] text-[#6B6778] mt-2 leading-relaxed">{c.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* SENTINEL VULNERABILITIES */}
      <section className="py-14 bg-white px-6">
        <FadeUp className="text-center mb-10">
          <Lbl>● SENTINEL SECURITY</Lbl>
          <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3 tracking-[-0.025em]">What Sentinel looks for.</h2>
          <p className="text-[17px] text-[#6B6778] mt-4 max-w-[540px] mx-auto leading-relaxed">Sentinel reviews your pull requests for these security vulnerability classes — proactively, before they reach production.</p>
        </FadeUp>
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vulns.map((v, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .5, delay: i * .08 }} whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(220,38,38,0.06)' }} className="bg-white border border-[#E8E5DF] rounded-[12px] p-5 cursor-default group transition-all hover:border-l-[3px] hover:border-l-[#DC2626]">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#FEF2F2', color: '#DC2626' }}>{v.icon}</div>
                <span className="fm text-[10px] px-2.5 py-0.5 rounded-full" style={{ background: v.sevBg, color: v.sevC }}>{v.sev}</span>
              </div>
              <h4 className="font-bold text-[14px] text-[#16141A] mb-1.5">{v.title}</h4>
              <p className="text-[13px] text-[#6B6778] leading-relaxed">{v.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Divider />

      {/* RESPONSIBLE DISCLOSURE */}
      <section className="py-14 bg-[#F7F6F3] px-6">
        <div className="max-w-[680px] mx-auto">
          <FadeUp className="text-center mb-10">
            <Lbl>● RESPONSIBLE DISCLOSURE</Lbl>
            <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3">Found a vulnerability?</h2>
            <p className="text-[17px] text-[#6B6778] mt-4 max-w-[540px] mx-auto leading-relaxed">We take every security report seriously. If you have found a vulnerability in Velocis, we want to hear from you.</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="relative bg-[rgba(26,127,60,0.04)] border-l-[3px] border-[#1A7F3C] rounded-r-[10px] p-6 mb-10">
              <p className="fb italic text-[17px] text-[#2C2A36] leading-[1.72]">"We commit to acknowledging your report within 24 hours, keeping you informed throughout the resolution process, and never taking legal action against researchers who follow responsible disclosure guidelines."</p>
            </div>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[{ n: '1', l: 'Report', d: 'Email security@velocis.ai with details of the vulnerability' }, { n: '2', l: 'Acknowledge', d: 'We confirm receipt within 24 hours and begin investigation' }, { n: '3', l: 'Resolve', d: 'We patch the vulnerability and keep you informed of progress' }, { n: '4', l: 'Credit', d: 'With your permission, we credit you in our security acknowledgments' }].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="w-9 h-9 rounded-full bg-[#16141A] text-white font-bold text-[14px] flex items-center justify-center mx-auto mb-3">{s.n}</div>
                  <div className="font-semibold text-[13px] text-[#16141A] mb-1">{s.l}</div>
                  <p className="text-[12px] text-[#6B6778] leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#16141A] rounded-[12px] p-6">
                <Mail size={20} className="text-[#3FB950] mb-3" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[15px] text-white">security@velocis.ai</span>
                  <button onClick={copyEmail} className="relative p-2 text-[#5A5768] hover:text-[#3FB950] transition-colors">
                    <AnimatePresence>{cp && <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute -top-9 left-1/2 -translate-x-1/2 fm text-[10px] bg-white text-[#16141A] px-3 py-1 rounded shadow whitespace-nowrap">Copied!</motion.span>}</AnimatePresence>
                    {cp ? <Check size={16} className="text-[#3FB950]" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-[13px] text-[#9B97A8] mt-1">For responsible disclosure reports</p>
              </div>
              <div className="bg-white border border-[#E8E5DF] rounded-[12px] p-6">
                <Shield size={20} className="text-[#1A7F3C] mb-3" />
                <div className="font-semibold text-[15px] text-[#16141A]">PGP Key available</div>
                <p className="text-[13px] text-[#6B6778] mt-1 mb-3">Request our public PGP key for encrypted submissions</p>
                <a href="mailto:security@velocis.ai?subject=PGP Key Request" className="font-semibold text-[13px] text-[#1A7F3C] inline-flex items-center gap-1 group/l">Request PGP Key <ArrowUpRight size={13} className="group-hover/l:translate-x-0.5 group-hover/l:-translate-y-0.5 transition-transform" /></a>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <Divider />

      {/* FAQ */}
      <section className="py-14 bg-white px-6">
        <div className="max-w-[680px] mx-auto">
          <FadeUp className="text-center mb-10">
            <Lbl>● SECURITY FAQ</Lbl>
            <h2 className="fb font-bold text-[clamp(32px,4vw,44px)] text-[#16141A] mt-3">Security questions, answered.</h2>
            <p className="text-[17px] text-[#6B6778] mt-4 max-w-[480px] mx-auto leading-relaxed">Transparent answers to the questions every security-conscious developer asks.</p>
          </FadeUp>
          <div className="border-t border-[#E8E5DF]">
            {faqs.map((x, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .5, delay: i * .07 }} className="border-b border-[#E8E5DF]">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full py-5 flex items-center justify-between text-left group">
                  <span className={`font-semibold text-[15px] transition-colors ${faqOpen === i ? 'text-[#1A7F3C]' : 'text-[#16141A] group-hover:text-[#1A7F3C]'}`}>{x.q}</span>
                  <ChevronDown size={19} className={`text-[#9B97A8] transition-transform duration-250 flex-shrink-0 ml-4 ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>{faqOpen === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .3, ease: [.25, .1, .25, 1] }} className="overflow-hidden"><p className="text-[15px] text-[#6B6778] leading-[1.72] pb-5">{x.a}</p></motion.div>}</AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16 bg-[#F7F6F3] overflow-hidden px-6">
        {[{ c: 'rgba(26,127,60,0.14)', d: 12, s: 280, x: '10%', y: '20%' }, { c: 'rgba(46,164,79,0.11)', d: 15, s: 360, x: '70%', y: '10%' }, { c: 'rgba(63,185,80,0.09)', d: 18, s: 320, x: '80%', y: '60%' }, { c: 'rgba(22,163,74,0.07)', d: 14, s: 260, x: '20%', y: '70%' }].map((o, i) => (
          <motion.div key={i} animate={{ x: [0, 40, -40, 0], y: [0, -25, 25, 0] }} transition={{ duration: o.d, repeat: Infinity, ease: 'easeInOut' }} className="absolute rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: o.c, width: o.s, height: o.s, left: o.x, top: o.y }} />
        ))}
        <div className="relative z-10 max-w-[800px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="fb font-bold text-[clamp(36px,4.5vw,52px)] text-[#16141A] tracking-[-0.03em]">Security you can verify.</h2>
            <p className="text-[17px] text-[#6B6778] max-w-[440px] mx-auto mt-4 leading-relaxed">Connect Velocis via read-only OAuth. Review exactly what permissions we request. Revoke at any time. No lock-in. No surprises.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-5">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .7 }} className="flex-1 bg-[#16141A] rounded-[16px] p-7 relative overflow-hidden border border-[#2A2838]">
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle,rgba(26,127,60,0.4)_1px,transparent_1px)] [background-size:20px_20px]" />
              <h3 className="fb font-bold text-[22px] text-white mb-3">Connect securely.</h3>
              <p className="text-[14px] text-[#9B97A8] mb-6 leading-relaxed">OAuth only. Read-only scope. No passwords. No deploy keys. Connect in under 60 seconds and see exactly what permissions are requested before you authorize.</p>
              <motion.button whileHover={{ y: -2, backgroundColor: '#22863A', boxShadow: '0 8px 24px rgba(46,164,79,.35)' }} className="bg-[#2EA44F] text-white px-6 py-3 rounded-[8px] font-semibold text-[14px] flex items-center gap-2 transition-colors">Connect with GitHub <ArrowUpRight size={15} /></motion.button>
              <div className="mt-5 flex flex-wrap gap-4 text-[12px] text-[#6B6778]">
                <span className="flex items-center gap-1.5"><Shield size={12} className="text-[#2EA44F]" />Read-only</span>
                <span className="flex items-center gap-1.5"><Lock size={12} className="text-[#2EA44F]" />No code stored</span>
                <span className="flex items-center gap-1.5"><RefreshCw size={12} className="text-[#2EA44F]" />Revoke anytime</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .7, delay: .15 }} className="flex-1 bg-white border border-[#E8E5DF] rounded-[16px] p-7 group">
              <div className="w-10 h-10 bg-[#F0FDF4] border border-[#DCFCE7] rounded-[10px] flex items-center justify-center fb font-bold text-[18px] text-[#1A7F3C] mb-5 group-hover:rotate-[4deg] group-hover:scale-[1.06] transition-transform">V</div>
              <h3 className="fb font-bold text-[22px] text-[#16141A] mb-3">Report a vulnerability.</h3>
              <p className="text-[14px] text-[#6B6778] mb-6 leading-relaxed">Found a security issue? We take every report seriously and commit to responding within 24 hours.</p>
              <a href="mailto:security@velocis.ai" className="font-semibold text-[14px] text-[#1A7F3C] flex items-center gap-2 group/l hover:underline"><Mail size={15} />security@velocis.ai <ArrowUpRight size={13} className="group-hover/l:translate-x-0.5 group-hover/l:-translate-y-0.5 transition-transform" /></a>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E8E5DF] py-10 px-8 bg-white">
        <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[#9B97A8] text-[14px]">
          <div className="flex items-baseline gap-4"><span className="fb font-bold text-[19px] text-[#16141A]">Velocis.</span><span>© 2025 Velocis · Built by <span className="text-[#16141A] font-semibold">Merge Conflict</span></span></div>
          <div className="flex gap-7 font-medium">{['About Us', 'Blog', 'Security', 'GitHub'].map(l => <a key={l} href="#" className="hover:text-[#16141A] transition-colors">{l}</a>)}</div>
        </div>
      </footer>
    </div>
  );
}
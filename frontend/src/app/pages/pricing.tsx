import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, Star, ChevronDown, Zap, Shield, Eye, GitBranch, ArrowRight, Building2, Users, Infinity } from "lucide-react";
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

    @keyframes orb1Drift { 0%{transform:translate(0,0)} 100%{transform:translate(40px,-20px)} }
    @keyframes orb2Drift { 0%{transform:translate(0,0)} 100%{transform:translate(-30px,25px)} }

    @media (prefers-reduced-motion: reduce) {
      .code-frag, .logo-dot, .orb { animation: none !important; }
      html { scroll-behavior: auto; }
    }

    .pricing-table-row:hover { background: #FAFAF8; transition: background 150ms; }
    .pricing-table-th { background: rgba(255,255,255,0.97); backdrop-filter: blur(8px); }

    .pricing-btn-primary { background: #2EA44F; color: white; border: none; }
    .pricing-btn-primary:hover { background: #22863A; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(46,164,79,0.35); }
    .pricing-btn-secondary { background: #16141A; color: white; border: none; }
    .pricing-btn-secondary:hover { background: #1A7F3C; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(26,127,60,0.25); }
    .pricing-btn-outline { background: transparent; color: #16141A; border: 2px solid #16141A; }
    .pricing-btn-outline:hover { background: #16141A; color: white; transform: translateY(-2px); }
    .pricing-btn-ghost { background: #F7F6F3; color: #16141A; border: 1px solid #E8E5DF; }
    .pricing-btn-ghost:hover { background: #F0EDE8; border-color: #D4D0C8; transform: translateY(-2px); }
    `}</style>
);

interface FragmentDef { text: string; top: string; opacity: number; duration: string; delay: string; drift: string; }

const CodeFragments: React.FC<{ side: 'left' | 'right'; fragments: FragmentDef[] }> = ({ side, fragments }) => (
    <div style={{ position: 'absolute', top: 0, bottom: 0, [side]: 8, width: 180, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }} className="hidden xl:block">
        {fragments.map((f, i) => (
            <span key={i} className="code-frag" style={{ top: f.top, [side]: 0, opacity: f.opacity, animationDuration: f.duration, animationDelay: f.delay }}>{f.text}</span>
        ))}
    </div>
);

const GrainOverlay: React.FC = () => (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 999, pointerEvents: 'none', opacity: 0.04 }}>
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

            if (pulseTimer > 200) {
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
                {["About", "Careers", "Blog", "Docs", "Pricing", "Security", "Contact"].map((l) => (
                    <a key={l} href={l === 'Pricing' ? '/pricing' : (l === 'Docs' ? '/docs' : (l === 'Security' ? '/security' : '/'))} className={`nav-link-light ${l === "Pricing" ? "active" : ""}`}>{l}</a>
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

export default function PricingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [faqOpen, setFaqOpen] = useState<number | null>(null);

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

    const tiers = [
        {
            id: 'free',
            label: 'FREE',
            labelColor: '#9B97A8',
            name: 'Solo',
            description: 'For individual developers exploring autonomous code review.',
            monthly: 0,
            annual: 0,
            annualBilled: 'Free forever. No credit card.',
            monthlyBilled: 'Free forever. No credit card.',
            cta: 'Get started free',
            ctaStyle: 'pricing-btn-ghost',
            features: ['1 connected repository', '1 developer seat', '50 Sentinel PR reviews / mo', 'Fortress test generation (20 PRs/mo)', 'Visual Cortex architecture map', 'GitHub OAuth integration', '48-hour response support'],
            iconColor: '#1A7F3C',
            bgColor: '#FFFFFF',
            textColor: '#16141A',
            badge: null
        },
        {
            id: 'starter',
            label: 'STARTER',
            labelColor: '#3FB950',
            name: 'Team',
            description: 'For engineering teams who want autonomous reviews on every PR.',
            monthly: 49,
            annual: 39,
            monthlyOrig: null,
            annualOrig: 49,
            annualBilled: 'Billed $468/year · Save $120',
            monthlyBilled: 'Billed monthly',
            cta: 'Start free trial',
            ctaSub: '14-day free trial, no card needed',
            ctaStyle: 'pricing-btn-primary',
            features: ['5 connected repositories', '5 developer seats', 'Unlimited Sentinel PR reviews', 'Unlimited Fortress test generation', 'Visual Cortex for all repositories', 'Priority Slack support', 'Mentorship mode enabled', 'Security vulnerability reports'],
            iconColor: '#3FB950',
            bgColor: '#16141A',
            textColor: '#FFFFFF',
            elevated: true,
            badge: 'MOST POPULAR'
        },
        {
            id: 'growth',
            label: 'GROWTH',
            labelColor: '#1A56DB',
            name: 'Scale',
            description: 'For scaling teams with multiple repos and advanced analytics.',
            monthly: 149,
            annual: 119,
            monthlyOrig: null,
            annualOrig: 149,
            annualBilled: 'Billed $1,428/year · Save $360',
            monthlyBilled: 'Billed monthly',
            cta: 'Get started',
            ctaStyle: 'pricing-btn-secondary',
            features: ['25 connected repositories', '25 developer seats', 'Unlimited Sentinel PR reviews', 'Unlimited Fortress test generation', 'Visual Cortex for all repositories', 'Advanced analytics dashboard', 'Custom review rulesets', 'JIRA and Linear integration', 'Priority email and chat support', 'Role-based access control'],
            iconColor: '#1A7F3C',
            bgColor: '#FFFFFF',
            textColor: '#16141A',
            badge: null
        },
        {
            id: 'enterprise',
            label: 'ENTERPRISE',
            labelColor: '#6D28D9',
            name: 'Enterprise',
            description: 'For large engineering orgs needing security, compliance & custom integrations.',
            monthly: 'Custom',
            annual: 'Custom',
            annualBilled: 'Tailored to your team size and usage',
            monthlyBilled: 'Tailored to your team size and usage',
            cta: 'Contact sales',
            ctaStyle: 'pricing-btn-outline',
            features: ['Unlimited repositories', 'Unlimited developer seats', 'Dedicated Velocis instance', 'SSO and SAML integration', 'Custom AI model fine-tuning', 'On-premise deployment option', 'SLA-backed 99.9% uptime', 'Dedicated Customer Success Manager', 'Custom security and compliance check', 'Custom training sessions', 'Infosec and legal review'],
            iconColor: '#6D28D9',
            bgColor: '#F7F6F3',
            textColor: '#16141A',
            badge: null,
            accentBorder: 'linear-gradient(to right, #6D28D9, #1A56DB)'
        }
    ];

    const toggleBilling = () => {
        setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly');
    };

    return (
        <div style={{ background: '#FFFFFF', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
            <FontStyle />
            <GrainOverlay />
            <div className="fixed top-0 z-[9999]" style={{ transform: `scaleX(${scrollProgress / 100})`, left: 0, width: '100%', height: 2, background: 'linear-gradient(90deg, #1A7F3C, #3FB950)', transformOrigin: 'left' }}>
                <div style={{ position: 'absolute', right: 0, top: -1, width: 4, height: 4, borderRadius: '50%', background: '#3FB950', boxShadow: '0 0 6px #3FB950' }} />
            </div>

            <StickyNav visible={scrolled} />

            {/* HERO SECTION */}
            <section style={{ position: 'relative', paddingTop: 80, paddingBottom: 48, background: '#FFFFFF' }}>
                <HeroCanvas />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, type: "spring" }} style={{ marginBottom: 24 }}>
                        <span className="font-mono-jb uppercase" style={{ fontSize: 11, color: "#1A7F3C", letterSpacing: "0.14em", padding: "4px 16px", borderRadius: 999, border: "1px solid rgba(26,127,60,0.30)", background: "rgba(26,127,60,0.05)" }}>
                            PRICING
                        </span>
                    </motion.div>

                    <h1 className="font-bask" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.03em", color: "#16141A", maxWidth: 700, margin: "0 auto" }}>
                        {"Plans that grow with your team.".split(' ').map((w, i) => (
                            <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', marginRight: '0.22em' }}>
                                <motion.span style={{ display: 'inline-block' }} initial={{ y: '110%', filter: 'blur(8px)' }} animate={{ y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.65, delay: i * 0.055, ease: [0.22, 1, 0.36, 1] }}>
                                    {w}
                                </motion.span>
                            </span>
                        ))}
                    </h1>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.4 }} className="font-inter" style={{ fontSize: 17, color: "#6B6778", maxWidth: 500, margin: "16px auto 0", lineHeight: 1.68 }}>
                        Start free. Scale as your engineering team grows. Every plan includes all three agents, Sentinel, Fortress, and Visual Cortex, working autonomously from day one.
                    </motion.p>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                            style={{ border: `1px solid rgba(26,127,60,0.3)`, borderRadius: 999, padding: "4px 12px", color: "#1A7F3C", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A7F3C', display: 'inline-block', animation: 'pulse-green 2s infinite' }} />
                            Free tier forever
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                            style={{ border: `1px solid #E8E5DF`, borderRadius: 999, padding: "4px 12px", color: "#6B6778", fontFamily: "'Inter', sans-serif", fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            No credit card required
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                            style={{ border: `1px solid #E8E5DF`, borderRadius: 999, padding: "4px 12px", color: "#6B6778", fontFamily: "'Inter', sans-serif", fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            Cancel anytime
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* BILLING TOGGLE SECTION */}
            <section style={{ padding: "0 0 48px", background: "#FFFFFF", position: 'relative', zIndex: 10 }}>
                <div className="max-w-[860px] mx-auto px-6 text-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mx-auto" style={{ width: 'fit-content' }}>
                        <div style={{ background: "#F7F6F3", border: "1px solid #E8E5DF", borderRadius: 999, padding: 4, display: "inline-flex", gap: 4, position: 'relative' }}>
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className="font-inter"
                                style={{
                                    background: billingCycle === 'monthly' ? '#16141A' : 'transparent',
                                    color: billingCycle === 'monthly' ? '#FFFFFF' : '#6B6778',
                                    borderRadius: 999,
                                    fontWeight: billingCycle === 'monthly' ? 600 : 500,
                                    fontSize: 14,
                                    padding: "8px 20px",
                                    transition: "background 200ms ease, color 200ms ease"
                                }}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('annual')}
                                className="font-inter"
                                style={{
                                    background: billingCycle === 'annual' ? '#16141A' : 'transparent',
                                    color: billingCycle === 'annual' ? '#FFFFFF' : '#6B6778',
                                    borderRadius: 999,
                                    fontWeight: billingCycle === 'annual' ? 600 : 500,
                                    fontSize: 14,
                                    padding: "8px 20px",
                                    transition: "background 200ms ease, color 200ms ease",
                                    position: 'relative'
                                }}
                            >
                                Annual
                                <AnimatePresence>
                                    {billingCycle === 'annual' && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            className="font-mono-jb"
                                            style={{
                                                position: 'absolute', top: -10, right: -20,
                                                background: '#DCFCE7', color: '#1A7F3C',
                                                fontSize: 10, padding: '2px 8px', borderRadius: 999,
                                                boxShadow: '0 2px 8px rgba(26,127,60,0.15)',
                                                letterSpacing: '0.05em'
                                            }}
                                        >
                                            SAVE 20%
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                        <div className="font-inter" style={{ fontSize: 13, color: "#9B97A8", marginTop: 12 }}>
                            Annual billing saves up to 20% across all paid plans
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* PRICING CARDS SECTION */}
            <section style={{ background: "#FFFFFF", padding: "0 0 80px", position: "relative" }}>
                <CodeFragments side="left" fragments={[
                    { text: "plan.upgrade()", top: "15%", opacity: 0.20, duration: "8s", delay: "0s", drift: "6px" },
                    { text: "billing.monthly", top: "35%", opacity: 0.18, duration: "10s", delay: "2s", drift: "-6px" },
                    { text: "cost: $0/mo", top: "55%", opacity: 0.22, duration: "7s", delay: "1s", drift: "5px" },
                    { text: "trial.start()", top: "70%", opacity: 0.19, duration: "11s", delay: "3s", drift: "-7px" },
                    { text: "free forever", top: "85%", opacity: 0.21, duration: "9s", delay: "0.5s", drift: "4px" },
                ]} />
                <CodeFragments side="right" fragments={[
                    { text: "agents: 3", top: "20%", opacity: 0.22, duration: "9s", delay: "1s", drift: "-5px" },
                    { text: "repos.connect()", top: "40%", opacity: 0.19, duration: "12s", delay: "0s", drift: "6px" },
                    { text: "reviews.auto()", top: "60%", opacity: 0.21, duration: "8s", delay: "2.5s", drift: "-4px" },
                    { text: "tests.generate()", top: "75%", opacity: 0.18, duration: "10s", delay: "1.5s", drift: "7px" },
                    { text: "coverage: 94%", top: "90%", opacity: 0.20, duration: "11s", delay: "4s", drift: "-6px" },
                ]} />

                <div className="max-w-[1180px] mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
                        {tiers.map((tier, idx) => (
                            <motion.div
                                key={tier.id}
                                initial={{ opacity: 0, y: 28, scale: 0.97 }}
                                whileInView={{ opacity: 1, y: tier.elevated ? -8 : 0, scale: 1 }}
                                viewport={{ once: true, margin: "-80px" }}
                                transition={{ duration: 0.5, delay: idx * 0.1, type: "spring" }}
                                style={{
                                    background: tier.bgColor,
                                    borderRadius: 18,
                                    padding: 32,
                                    position: 'relative',
                                    border: tier.elevated ? 'none' : '1px solid #E8E5DF',
                                    boxShadow: tier.elevated
                                        ? '0 0 0 1px rgba(26,127,60,0.3), 0 4px 24px rgba(22,20,26,0.2), 0 0 80px rgba(26,127,60,0.08)'
                                        : '0 1px 3px rgba(22,20,26,0.04)',
                                    transition: "all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                                    transform: tier.elevated ? 'translateY(-8px)' : 'translateY(0)'
                                }}
                                onMouseEnter={e => {
                                    if (tier.elevated) {
                                        e.currentTarget.style.transform = 'translateY(-14px)';
                                        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(26,127,60,0.5), 0 24px 64px rgba(22,20,26,0.3), 0 0 120px rgba(26,127,60,0.15)';
                                    } else {
                                        e.currentTarget.style.transform = 'translateY(-6px)';
                                        e.currentTarget.style.boxShadow = '0 20px 56px rgba(22,20,26,0.10)';
                                        e.currentTarget.style.borderColor = 'rgba(26,127,60,0.2)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (tier.elevated) {
                                        e.currentTarget.style.transform = 'translateY(-8px)';
                                        e.currentTarget.style.boxShadow = '0 0 0 1px rgba(26,127,60,0.3), 0 4px 24px rgba(22,20,26,0.2), 0 0 80px rgba(26,127,60,0.08)';
                                    } else {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(22,20,26,0.04)';
                                        e.currentTarget.style.borderColor = '#E8E5DF';
                                    }
                                }}
                            >
                                {tier.accentBorder && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: tier.accentBorder, borderRadius: '18px 18px 0 0' }} />
                                )}
                                {tier.badge && (
                                    <motion.div
                                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring" }}
                                        className="font-mono-jb"
                                        style={{
                                            position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)',
                                            background: 'linear-gradient(135deg, #1A7F3C, #2EA44F)', color: 'white',
                                            padding: '5px 16px', borderRadius: 999, fontSize: 10, letterSpacing: '0.1em',
                                            boxShadow: '0 4px 12px rgba(26,127,60,0.4)', zIndex: 10
                                        }}
                                    >
                                        {tier.badge}
                                    </motion.div>
                                )}

                                <div className="font-mono-jb" style={{ color: tier.labelColor, fontSize: 11, letterSpacing: "0.14em", marginBottom: 8, textTransform: 'uppercase' }}>
                                    {tier.label}
                                </div>
                                <h3 className="font-bask" style={{ color: tier.textColor, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                                    {tier.name}
                                </h3>
                                <p className="font-inter" style={{ color: tier.elevated ? 'rgba(255,255,255,0.6)' : '#6B6778', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
                                    {tier.description}
                                </p>

                                <div style={{ height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={billingCycle}
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                transition={{ duration: 0.15 }}
                                                className="font-bask"
                                                style={{ fontSize: 52, fontWeight: 700, color: tier.textColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
                                            >
                                                {tier.monthly === 'Custom' ? 'Custom' :
                                                    (billingCycle === 'monthly' ? `$${tier.monthly}` : `$${tier.annual}`)
                                                }
                                            </motion.div>
                                        </AnimatePresence>
                                        {tier.monthly !== 'Custom' && (
                                            <span className="font-inter" style={{ fontSize: 14, color: tier.elevated ? 'rgba(255,255,255,0.5)' : '#9B97A8' }}>
                                                /month
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-inter" style={{
                                        fontSize: 13, marginTop: 4, height: 20,
                                        color: billingCycle === 'annual' && tier.annualOrig ? (tier.elevated ? '#3FB950' : '#1A7F3C') : (tier.elevated ? 'rgba(255,255,255,0.4)' : '#9B97A8')
                                    }}>
                                        <AnimatePresence mode="wait">
                                            <motion.span
                                                key={billingCycle}
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            >
                                                {billingCycle === 'annual' && tier.annualOrig && (
                                                    <span style={{ textDecoration: 'line-through', marginRight: 8, color: tier.elevated ? 'rgba(255,255,255,0.3)' : '#9B97A8' }}>
                                                        ${tier.annualOrig}
                                                    </span>
                                                )}
                                                {billingCycle === 'annual' ? tier.annualBilled : tier.monthlyBilled}
                                            </motion.span>
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div style={{ height: 1, background: tier.elevated ? 'rgba(255,255,255,0.08)' : '#E8E5DF', margin: '20px 0' }} />

                                <div style={{ marginBottom: 24, minHeight: 64 }}>
                                    <button
                                        className={`w-full font-inter flex items-center justify-center gap-2 ${tier.ctaStyle}`}
                                        style={{ height: 48, borderRadius: 10, fontWeight: 600, fontSize: 14, transition: 'all 200ms' }}
                                    >
                                        {tier.cta}
                                    </button>
                                    {tier.ctaSub && (
                                        <div className="font-inter text-center mt-2" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                            {tier.ctaSub}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    {tier.features.map((feat, fi) => (
                                        <div key={fi} className="flex items-start gap-2.5" style={{ transition: 'transform 150ms' }}
                                            onMouseEnter={e => { if (!tier.elevated) { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.color = '#16141A'; } }}
                                            onMouseLeave={e => { if (!tier.elevated) { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.color = '#6B6778'; } }}
                                        >
                                            <Check size={16} color={tier.iconColor} style={{ marginTop: 2, flexShrink: 0 }} />
                                            <span className="font-inter" style={{ fontSize: 14, lineHeight: 1.5, color: tier.elevated ? 'rgba(255,255,255,0.8)' : '#6B6778', transition: 'color 150ms' }}>
                                                {feat}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 5: AGENT COMPARISON ROW */}
            <section style={{ background: "#F7F6F3", padding: "64px 0", position: "relative" }}>
                <div className="max-w-[960px] mx-auto px-6">
                    <div className="text-center mb-12">
                        <div className="font-mono-jb" style={{ fontSize: 11, color: "#1A7F3C", letterSpacing: "0.14em", marginBottom: 16 }}>● WHAT YOU GET</div>
                        <h2 className="font-bask" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 700, color: "#16141A", marginBottom: 16 }}>Every plan includes all three agents.</h2>
                        <p className="font-inter" style={{ fontSize: 17, color: "#6B6778", maxWidth: 500, margin: "0 auto", lineHeight: 1.68 }}>
                            Sentinel, Fortress, and Visual Cortex run on every plan. The difference is scale — how many repos, how many developers, how much throughput.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-5 justify-center mt-12">
                        {[
                            {
                                icon: <Eye size={24} color="#1A7F3C" />, bgIcon: "#F0FDF4", borderIcon: "rgba(26,127,60,0.15)",
                                title: "Sentinel", badge: "CODE REVIEW", badgeColor: "#1A7F3C", badgeBg: "#DCFCE7",
                                body: "Semantic PR review catching security issues, logic errors, and teaching the why behind every comment."
                            },
                            {
                                icon: <Shield size={24} color="#1A56DB" />, bgIcon: "#EFF6FF", borderIcon: "rgba(26,86,219,0.15)",
                                title: "Fortress", badge: "QA ENGINE", badgeColor: "#1A56DB", badgeBg: "#EFF6FF",
                                body: "Zero-touch test generation with a self-healing loop that writes, runs, and fixes failing tests automatically."
                            },
                            {
                                icon: <GitBranch size={24} color="#6D28D9" />, bgIcon: "#F5F3FF", borderIcon: "rgba(109,40,217,0.15)",
                                title: "Visual Cortex", badge: "ARCHITECTURE", badgeColor: "#6D28D9", badgeBg: "#F5F3FF",
                                body: "Live architecture maps that update every time code changes — eliminating stale documentation forever."
                            }
                        ].map((agent, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12 }}
                                className="flex-1 bg-white border border-[#E8E5DF] rounded-[14px] p-6 flex flex-col items-start gap-4"
                                style={{ transition: "all 260ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = agent.badgeColor; e.currentTarget.style.boxShadow = '0 12px 36px rgba(22,20,26,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E8E5DF'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ width: 52, height: 52, borderRadius: 12, background: agent.bgIcon, border: `1px solid ${agent.borderIcon}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {agent.icon}
                                </div>
                                <div className="flex flex-col items-start">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-inter font-bold" style={{ fontSize: 16, color: "#16141A" }}>{agent.title}</h3>
                                        <span className="font-mono-jb" style={{ fontSize: 10, background: agent.badgeBg, color: agent.badgeColor, padding: "2px 6px", borderRadius: 4 }}>{agent.badge}</span>
                                    </div>
                                    <p className="font-inter" style={{ fontSize: 14, color: "#6B6778", lineHeight: 1.6 }}>{agent.body}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 6: FULL COMPARISON TABLE */}
            <section style={{ background: "#FFFFFF", padding: "120px 0", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none" }}>
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs><pattern id="circuit" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M10 10l30 30h40M80 10l-30 30v40" stroke="rgba(26,127,60,0.14)" fill="none" strokeWidth="1" /></pattern></defs>
                        <rect width="100%" height="100%" fill="url(#circuit)" />
                    </svg>
                </div>

                <div className="max-w-[1080px] mx-auto px-6 relative z-10">
                    <div className="text-center mb-12">
                        <div className="font-mono-jb" style={{ fontSize: 11, color: "#1A7F3C", letterSpacing: "0.14em", marginBottom: 16 }}>● COMPARE PLANS</div>
                        <h2 className="font-bask" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, color: "#16141A", marginBottom: 16 }}>Find the right plan.</h2>
                    </div>

                    <div className="max-w-full overflow-x-auto rounded-[16px]" style={{ boxShadow: "0 4px 32px rgba(22,20,26,0.08)", border: "1px solid #E8E5DF" }}>
                        <table className="w-full text-left border-collapse" style={{ minWidth: 800 }}>
                            <thead className="sticky top-[60px] z-20 pricing-table-th border-b-2 border-[#E8E5DF]">
                                <tr>
                                    <th className="font-inter py-5 px-6 w-[35%] bg-white" style={{ fontSize: 13, fontWeight: 600, color: "#9B97A8" }}>Feature</th>
                                    <th className="py-5 px-6 text-center align-top bg-white">
                                        <div className="font-bask" style={{ fontSize: 16, fontWeight: 700, color: "#16141A" }}>Solo</div>
                                        <div className="font-bask mt-1 mb-3" style={{ fontSize: 20, fontWeight: 600, color: "#16141A" }}>Free</div>
                                        <a href="#" className="font-inter" style={{ fontSize: 13, fontWeight: 600, color: "#1A7F3C" }}>Get started</a>
                                    </th>
                                    <th className="py-5 px-6 text-center align-top relative" style={{ background: "#16141A" }}>
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 font-mono-jb" style={{ background: "#DCFCE7", color: "#1A7F3C", fontSize: 9, padding: "2px 6px", borderRadius: 999 }}>MOST POPULAR</div>
                                        <div className="font-bask mt-4" style={{ fontSize: 16, fontWeight: 700, color: "white" }}>Team</div>
                                        <div className="font-bask mt-1 mb-3" style={{ fontSize: 20, fontWeight: 600, color: "white" }}>
                                            {billingCycle === 'monthly' ? '$49' : '$39'}
                                        </div>
                                        <a href="#" className="font-inter" style={{ fontSize: 13, fontWeight: 600, color: "#3FB950" }}>Start trial</a>
                                    </th>
                                    <th className="py-5 px-6 text-center align-top bg-white">
                                        <div className="font-bask" style={{ fontSize: 16, fontWeight: 700, color: "#16141A" }}>Scale</div>
                                        <div className="font-bask mt-1 mb-3" style={{ fontSize: 20, fontWeight: 600, color: "#16141A" }}>
                                            {billingCycle === 'monthly' ? '$149' : '$119'}
                                        </div>
                                        <a href="#" className="font-inter" style={{ fontSize: 13, fontWeight: 600, color: "#1A7F3C" }}>Get started</a>
                                    </th>
                                    <th className="py-5 px-6 text-center align-top bg-white">
                                        <div className="font-bask" style={{ fontSize: 16, fontWeight: 700, color: "#16141A" }}>Enterprise</div>
                                        <div className="font-bask mt-1 mb-3" style={{ fontSize: 20, fontWeight: 600, color: "#16141A" }}>Custom</div>
                                        <a href="#" className="font-inter" style={{ fontSize: 13, fontWeight: 600, color: "#6D28D9" }}>Contact sales</a>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    {
                                        header: "Core Agents", rows: [
                                            { name: "Sentinel code review", vals: [true, true, true, true] },
                                            { name: "Fortress test generation", vals: [true, true, true, true] },
                                            { name: "Visual Cortex architecture maps", vals: [true, true, true, true] },
                                            { name: "Mentorship mode", vals: [false, true, true, true] },
                                            { name: "Security vulnerability detection", vals: [false, true, true, true] },
                                            { name: "Self-healing test loop", vals: ["Basic", "Full", "Full", "Full"] }
                                        ]
                                    },
                                    {
                                        header: "Repository and Team", rows: [
                                            { name: "Connected repositories", vals: ["1", "5", "25", "Unlimited"] },
                                            { name: "Developer seats", vals: ["1", "5", "25", "Unlimited"] }
                                        ]
                                    }
                                ].map((cat, ci) => (
                                    <React.Fragment key={ci}>
                                        <tr>
                                            <td colSpan={5} className="py-3 px-6 bg-[#F7F6F3]">
                                                <span className="font-inter" style={{ fontSize: 12, fontWeight: 700, color: "#16141A", textTransform: "uppercase", letterSpacing: "0.1em" }}>{cat.header}</span>
                                            </td>
                                        </tr>
                                        {cat.rows.map((row, ri) => (
                                            <tr key={ri} className="pricing-table-row border-b border-[#E8E5DF] bg-white">
                                                <td className="py-4 px-6 font-inter" style={{ fontSize: 14, color: "#16141A" }}>{row.name}</td>
                                                {row.vals.map((v, vi) => (
                                                    <td key={vi} className="py-4 px-6 text-center align-middle" style={{ background: vi === 1 ? 'rgba(26,127,60,0.02)' : 'transparent' }}>
                                                        {typeof v === 'boolean' ? (
                                                            v ? <Check size={16} color="#1A7F3C" className="mx-auto" /> : <Minus size={16} color="#E8E5DF" className="mx-auto" />
                                                        ) : (
                                                            <span className="font-inter" style={{ fontSize: 14, fontWeight: 600, color: "#16141A" }}>{v}</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* SECTION 7: TESTIMONIAL STRIP */}
            <section style={{ background: "#F7F6F3", padding: "80px 0", position: "relative" }}>
                <div className="max-w-[900px] mx-auto px-6">
                    <div className="text-center mb-14">
                        <div className="font-mono-jb" style={{ fontSize: 11, color: "#1A7F3C", letterSpacing: "0.14em", marginBottom: 16 }}>● TRUSTED BY ENGINEERS</div>
                        <h2 className="font-bask" style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 700, color: "#16141A", marginBottom: 16 }}>Teams shipping better code, faster.</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                            { quote: "Sentinel caught a SQL injection vulnerability in our payment handler before it ever reached staging. Two lines, one review, crisis averted. Worth every penny.", name: "Alex Kim", role: "Lead Engineer, FinTech startup", badge: "Team", bColor: "#1A7F3C", bBg: "#DCFCE7", ini: "AK" },
                            { quote: "We went from 40% test coverage to 94% in three weeks. Fortress writes better tests than half my team did manually. I never thought I would say that about an AI tool.", name: "Shreya Rao", role: "Engineering Manager", badge: "Scale", bColor: "#1A56DB", bBg: "#EFF6FF", ini: "SR" },
                            { quote: "The architecture maps alone are worth the subscription. Our new developers go from onboarding to productive in two days instead of two weeks. That ROI is immediate.", name: "Marcus Osei", role: "CTO, Series A startup", badge: "Scale", bColor: "#1A56DB", bBg: "#EFF6FF", ini: "MO" },
                            { quote: "Senior engineers used to spend Fridays doing nothing but code review. Now Sentinel handles the first pass and they review Sentinel's findings. Friday mornings are actually productive now.", name: "Priya Lal", role: "VP Engineering", badge: "Team", bColor: "#1A7F3C", bBg: "#DCFCE7", ini: "PL" }
                        ].map((t, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.10 }}
                                className="bg-white border border-[#E8E5DF] rounded-[16px] p-7 relative overflow-hidden"
                                style={{ transition: "all 260ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(26,127,60,0.2)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(22,20,26,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E8E5DF'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div className="absolute top-[-10px] left-2 font-bask text-[72px] leading-none" style={{ color: "rgba(26,127,60,0.06)" }}>❝</div>
                                <div className="flex gap-1 mb-3 relative z-10">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill="#D97706" color="#D97706" />)}
                                </div>
                                <p className="font-bask italic relative z-10" style={{ fontSize: 17, color: "#16141A", lineHeight: 1.7, marginBottom: 20 }}>"{t.quote}"</p>
                                <div className="flex items-center justify-between relative z-10 pt-4 border-t border-[#F0EEE9]">
                                    <div className="flex items-center gap-3">
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #1C1A28, #2A2838)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F0F6FC' }} className="font-bask font-bold text-xs">{t.ini}</div>
                                        <div>
                                            <div className="font-inter font-semibold text-sm" style={{ color: "#16141A" }}>{t.name}</div>
                                            <div className="font-inter text-xs" style={{ color: "#6B6778" }}>{t.role}</div>
                                        </div>
                                    </div>
                                    <div className="font-mono-jb" style={{ fontSize: 9, background: t.bBg, color: t.bColor, padding: "2px 8px", borderRadius: 999 }}>{t.badge}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 8: FAQ ACCORDION */}
            <section style={{ background: "#FFFFFF", padding: "120px 0", position: "relative" }}>
                <div className="max-w-[680px] mx-auto px-6">
                    <div className="text-center mb-14">
                        <div className="font-mono-jb" style={{ fontSize: 11, color: "#1A7F3C", letterSpacing: "0.14em", marginBottom: 16 }}>● PRICING FAQ</div>
                        <h2 className="font-bask" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, color: "#16141A", marginBottom: 16 }}>Pricing questions, answered.</h2>
                        <p className="font-inter" style={{ fontSize: 17, color: "#6B6778", maxWidth: 460, margin: "0 auto", lineHeight: 1.68 }}>
                            Transparent answers to the questions every team asks before committing.
                        </p>
                    </div>

                    <div className="flex flex-col">
                        {[
                            { q: "Do all plans include all three agents?", a: "Yes. Every Velocis plan, including the free Solo tier, includes access to all three agents. Sentinel reviews your PRs, Fortress generates and heals your tests, and Visual Cortex keeps your architecture maps current." },
                            { q: "Can I try a paid plan before committing?", a: "Yes. The Team plan includes a 14-day free trial with no credit card required. You get full access to unlimited reviews, all five repositories, and all five seats during the trial period." },
                            { q: "How does the self-healing test loop work on the free plan?", a: "Free plan users get access to Fortress test generation for up to 20 pull requests per month. The self-healing loop runs up to one iteration on the free plan. Paid plans include full self-healing with up to three iterations per test suite." }
                        ].map((faq, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                                className="border-b border-[#E8E5DF] py-5"
                            >
                                <button className="w-full flex justify-between items-center text-left" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                                    <span className="font-inter font-semibold" style={{ fontSize: 16, color: faqOpen === i ? "#1A7F3C" : "#16141A", transition: "color 150ms" }}>{faq.q}</span>
                                    <ChevronDown size={20} color="#9B97A8" style={{ transform: faqOpen === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 250ms" }} />
                                </button>
                                <AnimatePresence>
                                    {faqOpen === i && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
                                            <p className="font-inter pt-3" style={{ fontSize: 16, color: "#6B6778", lineHeight: 1.72 }}>{faq.a}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 9: ENTERPRISE CALLOUT */}
            <section style={{ background: "#16141A", padding: "100px 0", position: "relative", overflow: "hidden" }}>
                {/* Background glow */}
                <div style={{ position: "absolute", top: "50%", left: "30%", width: 600, height: 600, background: "radial-gradient(circle, rgba(109,40,217,0.15) 0%, rgba(22,20,26,0) 70%)", transform: "translate(-50%, -50%)", pointerEvents: "none" }} />

                <div className="max-w-[1080px] mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1">
                        <div className="font-mono-jb" style={{ fontSize: 11, color: "#9333EA", letterSpacing: "0.14em", marginBottom: 16 }}>● VELOCIS ENTERPRISE</div>
                        <h2 className="font-bask" style={{ fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 700, color: "#FFFFFF", marginBottom: 20, lineHeight: 1.1 }}>
                            Engineered for unprecedented scale.
                        </h2>
                        <p className="font-inter" style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", marginBottom: 32, lineHeight: 1.68 }}>
                            Deploy Velocis on your own infrastructure or single-tenant cloud. Custom fine-tuned models, strict VPC peering, and SSO integration for organizations where security is non-negotiable.
                        </p>

                        <div className="flex flex-col gap-4 mb-10">
                            {[
                                "Custom model fine-tuning on your codebase",
                                "VPC peering and on-premise deployment",
                                "SLA-backed 99.9% uptime guarantee",
                                "Dedicated Customer Success Manager"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: "rgba(109,40,217,0.2)", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={12} color="#A855F7" />
                                    </div>
                                    <span className="font-inter" style={{ fontSize: 15, color: "rgba(255,255,255,0.8)" }}>{item}</span>
                                </div>
                            ))}
                        </div>

                        <button className="font-inter flex items-center justify-center gap-2" style={{ background: "#FFFFFF", color: "#16141A", height: 48, padding: "0 24px", borderRadius: 10, fontWeight: 600, fontSize: 14, transition: "transform 200ms" }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            Contact Enterprise Sales
                        </button>
                    </div>

                    <div className="flex-1 w-full max-w-[500px]">
                        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
                            className="rounded-[16px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#0D0C11", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}
                        >
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[#121016]">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                                <div className="font-mono-jb ml-2" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>enterprise_metrics.sh</div>
                            </div>
                            <div className="p-6 font-mono-jb" style={{ fontSize: 13, color: "#10B981", lineHeight: 1.8 }}>
                                <div style={{ color: "rgba(255,255,255,0.5)" }}>&gt; velocis status --cluster=prod</div>
                                <div className="mt-2 text-white">All systems operational.</div>
                                <div className="mt-4 text-[#A855F7]">Metrics (Last 30 days):</div>
                                <div className="flex justify-between mt-1"><span style={{ color: "rgba(255,255,255,0.6)" }}>PRs Reviewed</span><span>124,502</span></div>
                                <div className="flex justify-between mt-1"><span style={{ color: "rgba(255,255,255,0.6)" }}>Tests Generated</span><span>89,144</span></div>
                                <div className="flex justify-between mt-1"><span style={{ color: "rgba(255,255,255,0.6)" }}>Vulns Prevented</span><span>1,402</span></div>
                                <div className="flex justify-between mt-1"><span style={{ color: "rgba(255,255,255,0.6)" }}>Avg Latency</span><span>240ms</span></div>
                                <div className="mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>_</div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* SECTION 10: CLOSING CTA */}
            <section style={{ background: "#F7F6F3", padding: "120px 0", position: "relative" }}>
                <div className="max-w-[1080px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Dark Card */}
                    <div className="rounded-[20px] p-10 flex flex-col justify-between relative overflow-hidden" style={{ background: "#16141A", color: "white", minHeight: 320 }}>
                        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(26,127,60,0.2) 0%, rgba(26,127,60,0) 70%)" }} />
                        <div className="relative z-10">
                            <h3 className="font-bask" style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Ready to ship faster?</h3>
                            <p className="font-inter" style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", maxWidth: 300, lineHeight: 1.6 }}>
                                Join standard engineering teams automating their code review and testing.
                            </p>
                        </div>
                        <div className="relative z-10 mt-10">
                            <button className="font-inter flex items-center justify-center gap-2" style={{ background: "#2EA44F", color: "white", height: 48, padding: "0 24px", borderRadius: 10, fontWeight: 600, fontSize: 14, transition: "all 200ms" }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(46,164,79,0.35)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                Start free trial <ArrowRight size={16} />
                            </button>
                            <div className="font-inter mt-3" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>14-day free trial · No credit card required</div>
                        </div>
                    </div>

                    {/* Light Card */}
                    <div className="rounded-[20px] p-10 flex flex-col justify-between relative overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E8E5DF", minHeight: 320 }}>
                        <div>
                            <h3 className="font-bask" style={{ fontSize: 32, fontWeight: 700, color: "#16141A", marginBottom: 12 }}>Have an open source project?</h3>
                            <p className="font-inter" style={{ fontSize: 16, color: "#6B6778", maxWidth: 300, lineHeight: 1.6 }}>
                                Velocis is free forever for public repositories. Give back to the community with better code.
                            </p>
                        </div>
                        <div className="mt-10">
                            <button className="font-inter flex items-center justify-center gap-2" style={{ background: "transparent", color: "#16141A", border: "2px solid #16141A", height: 48, padding: "0 24px", borderRadius: 10, fontWeight: 600, fontSize: 14, transition: "all 200ms" }} onMouseEnter={e => { e.currentTarget.style.background = '#16141A'; e.currentTarget.style.color = '#FFFFFF'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#16141A'; }}>
                                Connect public repo <GitBranch size={16} />
                            </button>
                        </div>
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

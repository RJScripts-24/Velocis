import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';
import { useNavigate } from 'react-router';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import {
    Github, Play, Shield, Zap, Map,
    Clock, AlertTriangle, UserX,
    Settings, Search, Edit3, Book, MapPin, AlertCircle, TrendingUp, Cpu,
    Activity, ShieldCheck
} from 'lucide-react';
import heroLeft from '../../assets/landing-page/hero-left.svg?raw';
import heroRight from '../../assets/landing-page/hero-right.svg?raw';
import timelineBridgeRaw from '../../assets/landing-page/timeline-bridge.svg?raw';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

// ─────────────────────────────────────────────
// Inline CSS (previously LogoCarousel.css + TimelineSvg.css)
// ─────────────────────────────────────────────
const LANDING_CSS = `
.logo-carousel-container {
    width: 100%;
    overflow: hidden;
    position: relative;
    padding: 20px 0;
}
.logo-carousel-track {
    display: flex;
    align-items: center;
    width: max-content;
    animation: scrollLogos 25s linear infinite;
    gap: 40px;
}
.logo-carousel-track:hover {
    animation-play-state: paused;
}
@keyframes scrollLogos {
    0%   { transform: translateX(0); }
    100% { transform: translateX(calc(-33.333%)); }
}

.features-section {
    padding: 0 0 28px;
    background-color: #151515 !important;
}
.timeline-bridge-wrapper {
    width: 100%;
    margin-bottom: -30px;
    display: flex;
    justify-content: center;
    position: relative;
    z-index: 10;
}
.timeline-bridge-wrapper svg {
    width: 100%;
    height: auto;
}
.split-feature-container {
    display: flex;
    flex-direction: column;
    margin-bottom: 80px;
    position: relative;
    z-index: 20;
}
@media (min-width: 900px) {
    .split-feature-container { flex-direction: row; }
}
.feature-half {
    flex: 1;
    padding: 64px 48px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
}
.marketer-feature {
    background-color: #F7F7F7;
    color: var(--color-textMain);
    border-radius: 32px;
}
.developer-feature {
    background-color: transparent;
    color: #fff;
}
.scroll-reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.scroll-reveal.visible {
    opacity: 1;
    transform: translateY(0);
}
.setup path[fill="white"], .build path[fill="white"], .ship path[fill="white"],
.create path[fill="white"], .publish path[fill="white"], .automate path[fill="white"] {
    visibility: hidden;
}
.timeline-step-label {
    position: absolute;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.04em;
    white-space: nowrap;
    pointer-events: none;
    font-size: clamp(8px, 1vw, 14px);
    text-shadow: 0 1px 3px rgba(0,0,0,0.6);
}

/* ── CTA Button – lift + ripple-after animation ── */
.cta-btn {
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: visible;
}
.cta-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
.cta-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}
.cta-btn:active {
  transform: translateY(-1px);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
}
.cta-btn::after {
  content: '';
  display: inline-block;
  height: 100%;
  width: 100%;
  border-radius: inherit;
  position: absolute;
  top: 0; left: 0;
  z-index: -1;
  background-color: var(--cta-primary, #6366f1);
  transition: transform 0.4s, opacity 0.4s;
}
.cta-btn:hover::after {
  transform: scaleX(1.4) scaleY(1.6);
  opacity: 0;
}
.cta-btn--blue::after  { background-color: var(--cta-primary, #6366f1); }
.cta-btn--violet::after { background-color: var(--cta-primary, #6366f1); }
`;

// ─────────────────────────────────────────────
// TextGenerate animation
// ─────────────────────────────────────────────
interface TextGenerateProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    stagger?: number;
    duration?: number;
}

function TextGenerate({ children, className = "", delay = 0, stagger = 0.05, duration = 0.5 }: TextGenerateProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const renderWords = () => {
        if (typeof children !== 'string') return children;
        const words = children.split(' ');
        return words.map((word, i) => (
            <span key={i} className="inline-block whitespace-pre">
                {word + (i !== words.length - 1 ? ' ' : '')}
            </span>
        ));
    };

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const spans = element.querySelectorAll('span');
        const targetElements = spans.length > 0 ? Array.from(spans) : element;

        gsap.set(targetElements, { opacity: 0, y: 10, filter: "blur(4px)" });

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                trigger: element,
                start: "top 80%",
                animation: gsap.to(targetElements, {
                    opacity: 1, y: 0, filter: "blur(0px)", duration, delay, stagger, ease: "power2.out"
                }),
                once: true
            });
        }, containerRef);

        return () => ctx.revert();
    }, [delay, duration, stagger]);

    return <span ref={containerRef} className={className}>{renderWords()}</span>;
}

// ─────────────────────────────────────────────
// CardGenerate animation
// ─────────────────────────────────────────────
interface CardGenerateProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    triggerEl?: Element | null;
}

function CardGenerate({ children, className = "", delay = 0, duration = 1.2, triggerEl }: CardGenerateProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        gsap.set(container, { clipPath: 'circle(0% at 0% 0%)', opacity: 0 });
        gsap.set(content, { opacity: 0, y: 20 });

        const ctx = gsap.context(() => {
            const trigger = triggerEl ?? container;
            const tl = gsap.timeline({
                scrollTrigger: { trigger, start: "top 80%", once: true },
                delay
            });
            tl.to(container, { clipPath: 'circle(150% at 0% 0%)', opacity: 1, duration: 0.7, ease: 'power2.out' });
            tl.to(content, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' }, `-=${0.7 * 0.4}`);
        }, containerRef);

        return () => ctx.revert();
    }, [delay, duration, triggerEl]);

    return (
        <div ref={containerRef} className={`${className} relative`}>
            <div ref={contentRef} className="w-full h-full flex flex-col justify-between">
                {children}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────
function Hero() {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.hero-anim',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
            );
            gsap.to('.hero-line-base', { opacity: 1, duration: 0.4, delay: 0.8 });
            gsap.utils.toArray<HTMLElement>('.left-graphic .hero-line-top').forEach(line => {
                const length = parseFloat(line.getAttribute('stroke-dasharray') || '150');
                gsap.fromTo(line, { strokeDashoffset: length }, { strokeDashoffset: -length, duration: 2.5, ease: 'linear', repeat: -1, delay: 0.8 });
            });
            gsap.utils.toArray<HTMLElement>('.right-graphic .hero-line-top').forEach(line => {
                const length = parseFloat(line.getAttribute('stroke-dasharray') || '150');
                gsap.fromTo(line, { strokeDashoffset: -length }, { strokeDashoffset: length, duration: 2.5, ease: 'linear', repeat: -1, delay: 0.8 });
            });
            gsap.to('.cursor-blink', { opacity: 0, ease: "steps(1)", repeat: -1, duration: 0.5 });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="relative pt-[80px] pb-[40px] flex flex-col items-center overflow-hidden pointer-events-none">

            <style>{`.hero-svg-wrapper svg { width: 100%; height: auto; }`}</style>

            <div className="absolute left-0 top-[15%] hidden lg:block hero-anim transition-all duration-500 hover:scale-105 z-0 pointer-events-auto">
                <div className="hero-svg-wrapper left-graphic w-[220px] xl:w-[320px] drop-shadow-2xl" dangerouslySetInnerHTML={{ __html: heroLeft }} />
            </div>
            <div className="absolute right-0 top-[10%] hidden lg:block hero-anim transition-all duration-500 hover:scale-105 z-0 pointer-events-auto">
                <div className="hero-svg-wrapper right-graphic w-[220px] xl:w-[320px] drop-shadow-2xl" dangerouslySetInnerHTML={{ __html: heroRight }} />
            </div>

            <div className="max-w-[1200px] w-full px-8 flex flex-col items-center z-10 text-center pointer-events-auto">
                <div className="hero-anim inline-flex items-center gap-2 bg-surface px-4 py-2 rounded-pill mb-8 border border-borderSubtle">
                    <div className="w-2 h-2 rounded-full bg-primary relative">
                        <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75"></div>
                    </div>
                    <span className="font-mono text-sm tracking-wide font-medium">Always-On · Autonomous · Production-Ready</span>
                </div>

                <h1 className="hero-anim font-display text-[clamp(48px,6vw,80px)] font-bold tracking-[-0.03em] leading-[1.05] mb-6">
                    The AI Senior Engineer.<br />Living in Your Repo.
                </h1>

                <p className="hero-anim max-w-[650px] text-lg text-textMuted mb-10 text-balance leading-relaxed">
                    Velocis acts like a senior engineer working continuously in the background. It proactively improves code quality, testing, security, and architecture—triggered automatically by repository changes, zero prompts required.
                </p>

                <div className="hero-anim flex flex-col sm:flex-row gap-4 mb-24">
                    <button onClick={() => navigate('/auth')} className="cta-btn cta-btn--blue flex items-center gap-2 px-8 py-4 rounded-button font-medium" style={{ backgroundColor: 'var(--cta-primary, #1c1c1c)', color: 'var(--cta-text, #fff)' }}>
                        <Github size={20} /> Connect Repository
                    </button>
                    <button className="flex items-center gap-2 bg-transparent text-textMain border border-borderSubtle px-8 py-4 rounded-button font-medium hover:bg-surface transition-colors duration-300">
                        <Play size={20} /> Watch Demo
                    </button>
                </div>

                <div className="hero-anim w-full max-w-[800px] bg-dark rounded-card p-6 shadow-2xl border border-white/5 text-left font-mono text-sm leading-relaxed overflow-hidden relative">
                    <div className="flex gap-2 mb-6">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                    </div>
                    <div className="text-textInverse/60 flex flex-col gap-2">
                        <div><span className="text-primary mr-2">➜</span><span className="text-tertiary">velocis</span> watch --repo=core-backend</div>
                        <div>[Velocis] Connected to repository tracking HEAD:main</div>
                        <div className="mt-4"><span className="text-purple">● Sentinel</span> analyzing PR #142 (Adding Stripe Integration)</div>
                        <div><span className="text-purple opacity-70 ml-4">↳ Detected unhandled missing idempotency key. Applying fix.</span></div>
                        <div className="mt-2"><span className="text-tertiary">● Fortress</span> auto-generating unit tests...</div>
                        <div><span className="text-tertiary opacity-70 ml-4">↳ 14 tests scaffolded and passing.</span></div>
                        <div className="mt-2"><span className="text-primary">● Visual Cortex</span> updating architecture maps...</div>
                        <div><span className="text-primary opacity-70 ml-4">↳ Dependency graph synchronized successfully.</span></div>
                        <div className="mt-4 flex items-center text-textInverse">
                            <span>Ready for next event.</span><span className="cursor-blink inline-block w-2.5 h-4 bg-primary ml-2 mb-[-2px]"></span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// LogoCarousel
// ─────────────────────────────────────────────
const logos = [
    {
        name: 'AWS Lambda',
        svg: (
            <div className="flex flex-row items-center gap-2 px-6 group cursor-default text-gray-400 hover:text-gray-900 transition-colors">
                <svg viewBox="0 0 40 40" className="h-6 w-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 30 L17 10 L21 10 L17.5 19 L26 30 L22 30 L18.5 23 L15 30 Z" fill="currentColor"/>
                </svg>
                <span className="text-[17px] font-bold whitespace-nowrap">AWS Lambda</span>
            </div>
        )
    },
    {
        name: 'DynamoDB',
        svg: (
            <div className="flex flex-row items-center gap-2 px-6 group cursor-default text-gray-400 hover:text-gray-900 transition-colors">
                <svg viewBox="0 0 40 40" className="h-6 w-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="20" cy="11" rx="10" ry="4" fill="currentColor" fillOpacity="0.9"/>
                    <rect x="10" y="11" width="20" height="14" fill="currentColor" fillOpacity="0.3"/>
                    <ellipse cx="20" cy="25" rx="10" ry="4" fill="currentColor" fillOpacity="0.9"/>
                    <ellipse cx="20" cy="18" rx="10" ry="4" fill="currentColor" fillOpacity="0.6"/>
                </svg>
                <span className="text-[17px] font-bold whitespace-nowrap">DynamoDB</span>
            </div>
        )
    },
    {
        name: 'API Gateway',
        svg: (
            <div className="flex flex-row items-center gap-2 px-6 group cursor-default text-gray-400 hover:text-gray-900 transition-colors">
                <svg viewBox="0 0 40 40" className="h-6 w-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M8 20 H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M20 8 V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M14 14 L26 26M26 14 L14 26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5"/>
                </svg>
                <span className="text-[17px] font-bold whitespace-nowrap">API Gateway</span>
            </div>
        )
    },
    {
        name: 'React',
        svg: (
            <div className="flex flex-row items-center gap-2 px-6 group cursor-default text-gray-400 hover:text-gray-900 transition-colors">
                <svg viewBox="0 0 40 40" className="h-6 w-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="20" cy="20" rx="14" ry="5.5" stroke="currentColor" strokeWidth="1.8" fill="none"/>
                    <ellipse cx="20" cy="20" rx="14" ry="5.5" stroke="currentColor" strokeWidth="1.8" fill="none" transform="rotate(60 20 20)"/>
                    <ellipse cx="20" cy="20" rx="14" ry="5.5" stroke="currentColor" strokeWidth="1.8" fill="none" transform="rotate(120 20 20)"/>
                    <circle cx="20" cy="20" r="2.5" fill="currentColor"/>
                </svg>
                <span className="text-[17px] font-bold whitespace-nowrap">React</span>
            </div>
        )
    },
    {
        name: 'TypeScript',
        svg: (
            <div className="flex flex-row items-center gap-2 px-6 group cursor-default text-gray-400 hover:text-gray-900 transition-colors">
                <svg viewBox="0 0 40 40" className="h-6 w-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="32" height="32" rx="4" fill="currentColor"/>
                    <path d="M11 16.5 H22 M16.5 16.5 V29" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                    <path d="M24 23 C24 21.5 25 20.5 27 20.5 C29 20.5 30 21.5 30 23 C30 25.5 26 26.5 26 29" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                    <circle cx="28" cy="29.5" r="1" fill="white"/>
                </svg>
                <span className="text-[17px] font-bold whitespace-nowrap">TypeScript</span>
            </div>
        )
    },
    {
        name: 'Tailwind CSS',
        svg: (
            <div className="flex flex-row items-center gap-2 px-6 group cursor-default text-gray-400 hover:text-gray-900 transition-colors">
                <svg viewBox="0 0 40 40" className="h-6 w-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 17 C9 13, 13 13, 15 17 C17 21, 21 21, 23 17 C25 13, 29 13, 31 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                    <path d="M7 23 C9 19, 13 19, 15 23 C17 27, 21 27, 23 23 C25 19, 29 19, 31 23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                </svg>
                <span className="text-[17px] font-bold whitespace-nowrap">Tailwind CSS</span>
            </div>
        )
    },
    {
        name: 'Node.js',
        svg: (
            <div className="flex flex-row items-center gap-2 px-6 group cursor-default text-gray-400 hover:text-gray-900 transition-colors">
                <svg viewBox="0 0 40 40" className="h-6 w-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 7 L31 13.5 V26.5 L20 33 L9 26.5 V13.5 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M20 13 L20 27 M15 16 L20 13 L25 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span className="text-[17px] font-bold whitespace-nowrap">Node.js</span>
            </div>
        )
    },
    {
        name: 'GitHub Actions',
        svg: (
            <div className="flex flex-row items-center gap-2 px-6 group cursor-default text-gray-400 hover:text-gray-900 transition-colors">
                <svg viewBox="0 0 40 40" className="h-6 w-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="11" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M17 14.5 L28 20 L17 25.5 Z" fill="currentColor"/>
                </svg>
                <span className="text-[17px] font-bold whitespace-nowrap">GitHub Actions</span>
            </div>
        )
    },
];

function LogoCarousel() {
    const carouselLogos = [...logos, ...logos, ...logos];
    return (
        <section className="w-full bg-white py-6 overflow-hidden">
            <div className="max-w-[1200px] mx-auto px-4 mb-4 text-center reveal">
                <p className="text-[17px] font-semibold text-[#151515]">
                    Engineering teams use Velocis to automate code reviews, testing, and continuous delivery.
                </p>
            </div>
            <div className="logo-carousel-container relative w-full flex overflow-hidden reveal delay-2">
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
                <div className="logo-carousel-track flex items-center min-w-max">
                    {carouselLogos.map((logo, index) => (
                        <div key={index} className="flex-none">{logo.svg}</div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// TimelineSvg  (placed ABOVE Problem)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// TimelineSvg  (placed ABOVE Problem)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// TimelineSvg  (placed ABOVE Problem)
// ─────────────────────────────────────────────
function TimelineSvg() {
    const containerRef = useRef<HTMLElement>(null);
    const sweepTailRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: { trigger: '.timeline-bridge-wrapper', start: 'top 75%', end: 'bottom 40%', scrub: 1 }
            });

            gsap.set('.setup path:first-child, .build path:first-child, .ship path:first-child, .create path:first-child, .publish path:first-child, .automate path:first-child', { fill: 'rgb(80, 80, 80)' });
            gsap.set('.setup path:nth-child(3), .build path:nth-child(3), .ship path:nth-child(3), .create path:nth-child(3), .publish path:nth-child(3), .automate path:nth-child(3)', { fill: 'rgb(164, 164, 164)' });
            gsap.set('.setup path:nth-child(4), .build path:nth-child(4), .ship path:nth-child(4), .create path:nth-child(4), .publish path:nth-child(4), .automate path:nth-child(4)', { fill: '#151515' });

            tl.to('.setup path:first-child', { fill: 'rgb(147, 51, 234)', duration: 1 }, 0).to('.setup path:nth-child(3)', { fill: 'rgb(168, 85, 247)', duration: 1 }, 0).to('.setup path:nth-child(4)', { fill: 'rgb(192, 132, 252)', duration: 1 }, 0);
            tl.to('.build path:first-child', { fill: 'rgb(147, 51, 234)', duration: 1 }, 1).to('.build path:nth-child(3)', { fill: 'rgb(168, 85, 247)', duration: 1 }, 1).to('.build path:nth-child(4)', { fill: 'rgb(192, 132, 252)', duration: 1 }, 1);
            tl.to('.ship path:first-child', { fill: 'rgb(147, 51, 234)', duration: 1 }, 2).to('.ship path:nth-child(3)', { fill: 'rgb(168, 85, 247)', duration: 1 }, 2).to('.ship path:nth-child(4)', { fill: 'rgb(192, 132, 252)', duration: 1 }, 2);
            tl.to('.create path:first-child', { fill: 'rgb(2, 132, 199)', duration: 1 }, 3).to('.create path:nth-child(3)', { fill: 'rgb(56, 189, 248)', duration: 1 }, 3).to('.create path:nth-child(4)', { fill: 'rgb(125, 211, 252)', duration: 1 }, 3);
            tl.to('.publish path:first-child', { fill: 'rgb(37, 99, 235)', duration: 1 }, 4).to('.publish path:nth-child(3)', { fill: 'rgb(59, 130, 246)', duration: 1 }, 4).to('.publish path:nth-child(4)', { fill: 'rgb(96, 165, 250)', duration: 1 }, 4);
            tl.to('.automate path:first-child', { fill: 'rgb(16, 185, 129)', duration: 1 }, 5).to('.automate path:nth-child(3)', { fill: '#000', duration: 1 }, 5).to('.automate path:nth-child(4)', { fill: 'rgb(34, 197, 94)', duration: 1 }, 5);

            tl.to('#timeline-ball', {
                motionPath: { path: '#motion-path', align: '#motion-path', alignOrigin: [0.5, 0.5] },
                duration: 6, ease: "none"
            }, 0);
            tl.to('#timeline-ball', { fill: 'rgb(2, 132, 199)', duration: 0.5 }, 2.5)
                .to('#timeline-ball', { fill: 'rgb(37, 99, 235)', duration: 0.5 }, 3.5)
                .to('#timeline-ball', { fill: 'rgb(16, 185, 129)', duration: 0.5 }, 4.5);

            // Animate sweep tail: 5% solid reveal, trailing edge fades gracefully down
            if (sweepTailRef.current) {
                // We use a proxy object to tween custom values efficiently because GSAP + CSS Custom Properties usually works best this way
                const maskProxy = { top: 0, gradientEnd: 0 };

                gsap.to(maskProxy, {
                    top: 5,        // Top firm wipe drops down to 5% instantly
                    gradientEnd: 150, // The transparent edge pushes all the way past 100% downward slowly
                    duration: 1.5,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        if (sweepTailRef.current) {
                            sweepTailRef.current.style.setProperty('--mask-top', `${maskProxy.top}%`);
                            sweepTailRef.current.style.setProperty('--mask-bot', `${maskProxy.gradientEnd}%`);
                        }
                    },
                    scrollTrigger: {
                        trigger: sweepTailRef.current,
                        start: 'top 80%',
                        toggleActions: "play none none none"
                    }
                });
            }
        }, containerRef);
        return () => { ctx.revert(); };
    }, []);

    return (
        <section className="features-section bg-[#151515] pb-[200px]" ref={containerRef}>
            <div className="timeline-bridge-wrapper w-full flex justify-center" style={{ position: 'relative' }}>
                <div className="w-full" dangerouslySetInnerHTML={{ __html: timelineBridgeRaw }} />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {[
                        { label: 'Connect',  left: '24.7%', top: '58.5%' },
                        { label: 'Analyze',  left: '31.0%', top: '71.2%' },
                        { label: 'Test',     left: '45.6%', top: '76.5%' },
                        { label: 'Map',      left: '61.5%', top: '59.6%' },
                        { label: 'Deploy',   left: '70.8%', top: '72.5%' },
                        { label: 'Monitor',  left: '80.6%', top: '51.2%' },
                    ].map(({ label, left, top }) => (
                        <span key={label} className="timeline-step-label" style={{ left, top }}>{label}</span>
                    ))}
                </div>
            </div>
            <div className="max-w-[1200px] w-full mx-auto px-8">
                <div className="split-feature-container" style={{ marginTop: '-4px' }}>
                    {/* Left Column: Engineering Teams */}
                    <div className="w-[100%] md:w-1/2 mt-0">
                        <div className="feature-half developer-feature pl-4 md:pl-16 pr-8 pt-10 pb-20 bg-transparent flex flex-col items-start justify-start relative z-10 w-full h-full">
                            <h2 className="text-[1.75rem] leading-tight font-bold mb-4 tracking-tight max-w-[400px]">
                                <span className="text-purple-500 font-semibold mb-1 block text-sm tracking-wider uppercase"><TextGenerate delay={0}>Engineering Teams</TextGenerate></span>
                                <span className="text-white"><TextGenerate delay={0.1}>Reclaim your team's engineering velocity</TextGenerate></span>
                            </h2>
                            <p className="text-gray-400 text-lg mb-8 max-w-[400px] leading-relaxed">
                                <TextGenerate delay={0.2}>Stop using your senior engineers as syntax checkers. Velocis automates code reviews and triaging so your team can focus on building features.</TextGenerate>
                            </p>
                            <ul className="text-white space-y-6 mb-10 w-full max-w-[400px]">
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"></path></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={0.3}>Automate repetitive review chores</TextGenerate></span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={0.4}>Catch deep logic flaws before production</TextGenerate></span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={0.5}>Provide instant mentorship to junior devs</TextGenerate></span>
                                </li>
                            </ul>
                            <button className="bg-white text-black hover:bg-gray-100 transition-colors rounded-full px-7 py-3.5 font-semibold text-[15px] inline-flex items-center shadow-lg">
                                <TextGenerate delay={0.6}>Explore Velocis for Teams</TextGenerate>
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Developers */}
                    <div className="w-[100%] md:w-1/2 mt-8 md:mt-32">
                        <div className="feature-half marketer-feature pr-4 md:pr-16 pl-8 pt-10 pb-20 relative z-20 w-full flex flex-col items-start justify-start marketer-tail-card">
                            <h2 className="text-[1.75rem] leading-tight font-bold mb-4 tracking-tight max-w-[400px]">
                                <span className="text-blue-500 font-semibold mb-1 block text-sm tracking-wider uppercase"><TextGenerate delay={0}>Developers</TextGenerate></span>
                                <span className="text-[#151515]"><TextGenerate delay={0.1}>Ship confident code without the wait</TextGenerate></span>
                            </h2>
                            <p className="text-gray-600 text-lg mb-8 max-w-[400px] leading-relaxed">
                                <TextGenerate delay={0.2}>Stop waiting days for a code review. Velocis provides instant feedback, suggests fixes, and helps you merge your PRs in hours instead of days.</TextGenerate>
                            </p>
                            <ul className="text-[#151515] space-y-6 mb-10 w-full max-w-[400px]">
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="5" width="20" height="6" rx="2"></rect><rect x="2" y="13" width="20" height="6" rx="2"></rect></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={0.3}>Reduce merge times with instant AI feedback</TextGenerate></span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9a2 2 0 0 0-2-2H8"></path></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={0.4}>Learn best practices through in-line suggestions</TextGenerate></span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={0.5}>Focus on solving hard problems, not formatting</TextGenerate></span>
                                </li>
                            </ul>
                            <button className="bg-[#151515] text-white hover:bg-black transition-colors rounded-full px-7 py-3.5 font-semibold text-[15px] inline-flex items-center shadow-lg relative z-20">
                                <TextGenerate delay={0.6}>Start moving faster today</TextGenerate>
                            </button>
                            {/* Seamless Sweep Tail */}
                            <div
                                ref={sweepTailRef}
                                className="absolute top-full left-1/2 -translate-x-1/2 w-[250%] h-[200px] -z-10 pointer-events-none translate-y-[-1px]"
                                style={{
                                    '--mask-top': '0%',
                                    '--mask-bot': '0%',
                                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black var(--mask-top), transparent var(--mask-bot), transparent 100%)',
                                    maskImage: 'linear-gradient(to bottom, black 0%, black var(--mask-top), transparent var(--mask-bot), transparent 100%)'
                                } as React.CSSProperties}
                            >
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-[200px] overflow-visible">
                                    <defs>
                                        <linearGradient id="sweepGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#F7F7F7" /><stop offset="60%" stopColor="#F7F7F7" /><stop offset="100%" stopColor="#FFFFFF" />
                                        </linearGradient>
                                        <filter id="sweepShadow" x="-20%" y="-30%" width="140%" height="140%">
                                            <feDropShadow dx="0" dy="8" stdDeviation="20" floodColor="#000000" floodOpacity="0.04" />
                                        </filter>
                                    </defs>
                                    <path d="M 31.65 0 C 62 48, 45 120, 0 100 L 100 100 C 55 120, 38 48, 68.35 0 Z" fill="url(#sweepGradient)" filter="url(#sweepShadow)" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// Problem
// ─────────────────────────────────────────────
const problems = [
    { icon: Clock, title: "Code Reviews Become Bottlenecks", desc: "Seniors spend 40% of their time reviewing rather than building." },
    { icon: Shield, title: "Security Vulnerabilities Slip Through", desc: "Manual checks miss deeply nested logic flaws." },
    { icon: AlertTriangle, title: "Testing Is Always the First Casualty", desc: "Under deadline pressure, test coverage drops." },
    { icon: UserX, title: "Junior Devs Lack Senior Guidance", desc: "No bandwidth for contextual, personalized mentorship." }
];

function Problem() {
    return (
        <section className="py-[120px] bg-background">
            <div className="max-w-[1200px] w-full mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-[64px]">
                {/* Left Column */}
                <div>
                    <span className="font-mono text-sm tracking-widest uppercase text-primary font-bold mb-4 block">
                        The Problem
                    </span>
                    <h2 className="font-display text-[clamp(32px,4.5vw,56px)] font-bold tracking-tight leading-[1.05] mb-12 flex flex-col gap-2">
                        <span>Teams ship bugs.</span>
                        <span>Not features.</span>
                    </h2>
                    <div className="flex flex-col gap-10">
                        {problems.map((prob, i) => (
                            <div key={i} className="flex gap-6">
                                <div className="w-12 h-12 rounded-xl bg-surface flex-shrink-0 flex items-center justify-center text-dark">
                                    <prob.icon size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl mb-2">{prob.title}</h3>
                                    <p className="text-textMuted text-lg leading-relaxed">{prob.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column (Sticky) */}
                <div className="relative">
                    <div className="sticky top-[120px] flex flex-col gap-8">
                        <div>
                            <div className="bg-surface rounded-card p-10 flex flex-col gap-4 transition-transform duration-300 hover:-translate-y-1">
                                <span className="text-textMuted font-medium text-lg">Avg Time to Merge PR</span>
                                <div className="font-display font-bold text-6xl text-dark">4.7 Days</div>
                                <div className="mt-4 bg-primary/10 text-primary font-mono text-sm font-bold uppercase tracking-wide py-2 px-4 rounded-pill self-start overflow-hidden">
                                    With Velocis: &lt; 4 Hours
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="bg-surface rounded-card p-10 transition-transform duration-300 hover:-translate-y-1">
                                <span className="text-textMuted font-medium text-lg mb-6 block">Senior Engineer Time Breakdown</span>
                                <div className="flex flex-col gap-4 w-full">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Code Reviews</span>
                                            <span className="text-textMuted cursor-default">38%</span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden"><div className="h-full bg-dark w-[38%] rounded-pill"></div></div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Bug Triage</span>
                                            <span className="text-textMuted cursor-default">24%</span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden"><div className="h-full bg-dark w-[24%] rounded-pill opacity-80"></div></div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Building Features</span>
                                            <span className="text-textMuted cursor-default text-primary">6%</span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden"><div className="h-full bg-primary w-[6%] rounded-pill"></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// BentoGrid
// ─────────────────────────────────────────────
const agents = [
    { name: "Sentinel", role: "Deep Code Intelligence", color: "#8D5CF6", icon: Shield, desc: "Semantic code review, logic flaws, security checks, and personalized mentorship feedback directly in PR comments.", features: ["Logic Vulnerability Scanning", "Static Code Profiling", "Contextual Refactoring"] },
    { name: "Fortress", role: "Autonomous Test Engine", color: "#38BDF8", icon: Zap, desc: "Auto-generates, executes, and self-heals tests in an infinite loop until pipeline passes.", features: ["Self-Healing Test Suites", "Integration Mocks", "Edge-Case Discovery"] },
    { name: "Visual Cortex", role: "Living Architecture Map", color: "#3BBB96", icon: Map, desc: "Generates live codebase architecture maps, tracks dependencies, and forces documentation to stay in sync.", features: ["Live Dependency Graphs", "Auto-Generated Docs", "Onboarding Visuals"] }
];

function BentoGrid() {
    return (
        <section className="py-[120px] bg-background">
            <div className="max-w-[1200px] w-full mx-auto px-8">
                <div className="text-center mb-16">
                    <h2 className="font-display text-[clamp(28px,4vw,48px)] font-bold tracking-tight leading-[1.05] flex flex-col gap-2">
                        <TextGenerate delay={0}>Three Agents.</TextGenerate>
                        <TextGenerate delay={0.2}>One Unified Team.</TextGenerate>
                    </h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {agents.map((agent, i) => (
                        <CardGenerate key={i} delay={i * 0.15} className="glass-card bg-surface/70 backdrop-blur-sm rounded-card p-10 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:bg-surface/90 overflow-hidden group">
                            <div className="absolute inset- border-[1px] pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-300 rounded-card" style={{ borderColor: agent.color }} />
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-white" style={{ backgroundColor: agent.color }}><agent.icon size={28} /></div>
                            <div className="font-mono text-sm tracking-widest font-bold mb-2 uppercase" style={{ color: agent.color }}>{agent.role}</div>
                            <h3 className="font-display text-3xl font-bold mb-4">{agent.name}</h3>
                            <p className="text-textMuted text-lg mb-8 leading-relaxed flex-grow">{agent.desc}</p>
                            <ul className="flex flex-col gap-3 w-full">
                                {agent.features.map((feat, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.color }}></div>
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                        </CardGenerate>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// HorizontalCarousel
// ─────────────────────────────────────────────
const capabilities = [
    { icon: Cpu, title: "Autonomous Operation", desc: "Webhook-triggered. Zero human prompting." },
    { icon: Search, title: "Semantic Analysis", desc: "Understands intent, not just syntax." },
    { icon: Edit3, title: "Auto Test Generation", desc: "Creates tests before you do." },
    { icon: Book, title: "Continuous Docs", desc: "Inline and wiki updates automatically." },
    { icon: MapPin, title: "Architecture Maps", desc: "Visual dependency tracking instantly." },
    { icon: AlertCircle, title: "Vulnerability Scans", desc: "OWASP & CVE deeply integrated." },
    { icon: TrendingUp, title: "Dev Upskilling", desc: "Mentors juniors in the PR." },
    { icon: Settings, title: "Task Elimination", desc: "Automates boilerplate updates." }
];

function HorizontalCarousel() {
    const sectionRef = useRef<HTMLElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [sectionEl, setSectionEl] = useState<HTMLElement | null>(null);

    const sectionCallbackRef = useCallback((el: HTMLElement | null) => {
        sectionRef.current = el;
        setSectionEl(el);
    }, []);

    useEffect(() => {
        if (!sectionRef.current || !scrollContainerRef.current) return;
        const scrollContainer = scrollContainerRef.current;
        function getScrollAmount() {
            return -(scrollContainer.scrollWidth - window.innerWidth);
        }
        const ctx = gsap.context(() => {
            gsap.to(scrollContainer, {
                x: getScrollAmount,
                ease: "none",
                scrollTrigger: {
                    trigger: sectionRef.current, start: "top top",
                    end: () => `+=${getScrollAmount() * -1}`,
                    pin: true, scrub: 1, invalidateOnRefresh: true,
                }
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionCallbackRef} className="h-screen flex items-center text-white overflow-hidden py-20 relative bg-[#151515]">
            <div className="min-w-[400px] w-[400px] self-stretch z-20 flex flex-col justify-center bg-[#151515] relative">
                <div className="absolute top-0 -right-[200px] bottom-0 w-[200px] bg-gradient-to-r from-[#151515] to-transparent pointer-events-none"></div>
                <div className="px-12 md:px-20 relative z-10">
                    <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-4 block">Platform Capabilities</span>
                    <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1]">
                        Built to Act,<br />Not Wait.
                    </h2>
                    <p className="mt-8 text-lg text-textInverse/60 max-w-sm">
                        A granular look into the features powering Velocis. Keep scrolling to explore the capabilities.
                    </p>
                </div>
            </div>
            <div ref={scrollContainerRef} className="flex gap-6 pl-20 pr-[20vw] relative items-center">
                {capabilities.map((cap, i) => (
                    <CardGenerate key={i} delay={i * 0.1} duration={0.7} triggerEl={sectionEl} className="w-[350px] h-[350px] flex-shrink-0 bg-[#222] border border-white/10 rounded-card p-10 hover:bg-[#2A2A2A] transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-primary mb-6"><cap.icon size={32} /></div>
                        <div>
                            <h3 className="font-display text-2xl font-bold mb-3"><TextGenerate delay={i * 0.1}>{cap.title}</TextGenerate></h3>
                            <p className="text-textInverse/60 text-lg leading-relaxed"><TextGenerate delay={0.15 + i * 0.1}>{cap.desc}</TextGenerate></p>
                        </div>
                        <div className="flex font-mono text-xs opacity-30 mt-4 tracking-widest text-[#FFF]">CAP.0{i + 1}</div>
                    </CardGenerate>
                ))}
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// HowItWorks
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// HowItWorks — Winding Road Timeline
// ─────────────────────────────────────────────
// SVG ViewBox: 0 0 700 1600
// Node SVG coords → CSS %:  left = x/700*100,  top = y/1600*100
// ─────────────────────────────────────────────
const HIW_ROAD_D = `
    M 200 40
    C 200 120 440 140 510 200
    C 580 260 580 430 510 460
    C 440 490 320 490 190 490
    C 60  490 60  660 130 710
    C 200 760 440 770 510 780
    C 580 800 580 980 510 1010
    C 440 1040 320 1060 190 1070
    C 60  1080 60  1240 130 1290
    C 200 1340 440 1350 510 1360
    C 580 1380 568 1490 540 1540
`;

// [left%, top%, 'right'|'left']  (node center in SVG coordinate space)
const HIW_NODES = [
    { xl: 72.86, yt: 12.50, side: 'right' as const },  // (510, 200)
    { xl: 27.14, yt: 30.63, side: 'left' as const },  // (190, 490)
    { xl: 72.86, yt: 48.75, side: 'right' as const },  // (510, 780)
    { xl: 27.14, yt: 66.88, side: 'left' as const },  // (190, 1070)
    { xl: 72.86, yt: 85.00, side: 'right' as const },  // (510, 1360)
];

// Timeline positions (0–10) at which each node should pop in
const HIW_NODE_T = [1.4, 3.1, 4.8, 6.5, 8.2];

function HowItWorks() {
    const sectionRef = useRef<HTMLElement>(null);
    const roadRef = useRef<SVGPathElement>(null);
    const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
    const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
    const startRef = useRef<HTMLDivElement>(null);
    const goalRef = useRef<HTMLDivElement>(null);

    const steps = [
        { Icon: Github, num: '01', title: 'Connect Repository', desc: 'Securely link GitHub, GitLab, or Bitbucket in under 60 seconds via OAuth.' },
        { Icon: Activity, num: '02', title: 'Webhook Listening', desc: 'Velocis quietly observes all commits, branches, and PRs in real time.' },
        { Icon: Cpu, num: '03', title: 'Agents Activate', desc: 'Sentinel, Fortress, and Visual Cortex run concurrently on every push.' },
        { Icon: ShieldCheck, num: '04', title: 'Issues Resolved', desc: 'Bugs are auto-fixed when possible, or flagged with deep context when not.' },
        { Icon: Settings, num: '05', title: 'Artifacts Update', desc: 'Tests, docs, and architecture maps stay perpetually current.' },
    ];

    useEffect(() => {
        if (!sectionRef.current || !roadRef.current) return;

        const road = roadRef.current;
        const totalLen = road.getTotalLength();

        // Hide road completely via dashoffset
        gsap.set(road, { strokeDasharray: totalLen, strokeDashoffset: totalLen });

        // Hide nodes / labels / markers
        nodeRefs.current.forEach(n => n && gsap.set(n, { scale: 0, opacity: 0, transformOrigin: '50% 50%' }));
        labelRefs.current.forEach((l, i) => {
            if (!l) return;
            const dx = HIW_NODES[i].side === 'right' ? -30 : 30;
            gsap.set(l, { opacity: 0, x: dx });
        });
        if (startRef.current) gsap.set(startRef.current, { opacity: 0, xPercent: -50, yPercent: -50 });
        if (goalRef.current) gsap.set(goalRef.current, { opacity: 0, y: 12 });

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 50%',
                    end: 'bottom 85%',
                    scrub: 0.5,
                    onUpdate: (self) => {
                        const prog = self.progress;
                        // Stickman only moves after 15% of the scroll timeline has passed. (1.5 duration out of 10)
                        const startDelay = 0.15;

                        if (prog <= startDelay || prog >= 1) {
                            gsap.set('.stick-walk-leg1, .stick-walk-leg2, .stick-walk-arm1, .stick-walk-arm2', { rotation: 0 });
                            return;
                        }

                        // normalize progress to calculate frequency
                        const activeProg = (prog - startDelay) / (1 - startDelay);
                        const freq = Math.PI * 50;
                        const angleA = Math.sin(activeProg * freq) * 45;
                        const angleB = Math.sin(activeProg * freq + Math.PI) * 45;

                        gsap.set('.stick-walk-leg1', { rotation: angleA, svgOrigin: '23 28' });
                        gsap.set('.stick-walk-leg2', { rotation: angleB, svgOrigin: '23 28' });
                        gsap.set('.stick-walk-arm1', { rotation: angleB, svgOrigin: '23 14' });
                        gsap.set('.stick-walk-arm2', { rotation: angleA, svgOrigin: '23 14' });
                    }
                }
            });

            // START marker
            tl.to(startRef.current, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0);

            // Move marker along the road
            tl.to(startRef.current, {
                motionPath: {
                    path: road,
                    align: road,
                    alignOrigin: [0.5, 0.7],
                    autoRotate: false
                },
                duration: 8.5,
                ease: 'none'
            }, 1.5); // Starts at 1.5s (15% of 10s total)

            // Draw the road along with the marker
            tl.to(road, { strokeDashoffset: 0, duration: 8.5, ease: 'none' }, 1.5);

            // Nodes + labels
            HIW_NODE_T.forEach((t, i) => {
                const n = nodeRefs.current[i];
                const l = labelRefs.current[i];
                if (n) tl.to(n, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' }, t);
                if (l) tl.to(l, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, t + 0.3);
            });

            // GOAL marker
            tl.to(goalRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 9.0);
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="relative bg-[#f5f4f0] py-24 overflow-hidden">

            {/* Section header */}
            <div className="text-center mb-10 relative z-20 px-8">
                <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-4 block">How It Works</span>
                <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1] text-[#151515]">
                    Connect Once.<br />Always Running.
                </h2>
                <p className="mt-4 text-textMuted text-lg max-w-[480px] mx-auto">
                    Five automated steps that fire every time code changes — no human prompting required.
                </p>
            </div>

            {/* Road + overlays container */}
            <div className="relative w-full max-w-[700px] mx-auto px-4 md:px-0">

                {/* ── START marker ── */}
                <div
                    ref={startRef}
                    className="absolute z-30 flex flex-col items-center gap-1 pointer-events-none"
                    style={{ left: 0, top: 0 }}
                >
                    {/* running person */}
                    <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
                        <circle cx="23" cy="6" r="5.5" fill="#FFFFFF" />
                        {/* body */}
                        <line x1="23" y1="12" x2="23" y2="28" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
                        {/* legs */}
                        <line className="stick-walk-leg1" x1="23" y1="28" x2="23" y2="44" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                        <line className="stick-walk-leg2" x1="23" y1="28" x2="23" y2="44" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                        {/* arms */}
                        <line className="stick-walk-arm1" x1="23" y1="14" x2="23" y2="26" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                        <line className="stick-walk-arm2" x1="23" y1="14" x2="23" y2="26" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <span className="font-display font-bold text-[13px] tracking-[0.15em] text-[#FFFFFF]">START</span>
                </div>

                {/* ── SVG Road ── */}
                <svg
                    viewBox="0 0 700 1600"
                    className="w-full"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id="hiw-ng" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#A855F7" />
                            <stop offset="100%" stopColor="#7C3AED" />
                        </linearGradient>
                    </defs>

                    {/* Subtle road shadow */}
                    <path d={HIW_ROAD_D} fill="none" stroke="rgba(0,0,0,0.18)"
                        strokeWidth="76" strokeLinecap="round" strokeLinejoin="round"
                        style={{ filter: 'blur(10px)' }} />

                    {/* Road surface (animated) */}
                    <path ref={roadRef} d={HIW_ROAD_D} fill="none"
                        stroke="#1c1c1c" strokeWidth="66"
                        strokeLinecap="round" strokeLinejoin="round" />

                    {/* Road edge highlight */}
                    <path d={HIW_ROAD_D} fill="none"
                        stroke="rgba(255,255,255,0.06)" strokeWidth="68"
                        strokeLinecap="round" strokeLinejoin="round" />

                    {/* Centre dashes — static, appear with section */}
                    <path d={HIW_ROAD_D} fill="none"
                        stroke="rgba(255,255,255,0.45)" strokeWidth="4"
                        strokeDasharray="28 22" strokeLinecap="round" />
                </svg>

                {/* ── Node circles ── */}
                {steps.map((step, i) => {
                    const p = HIW_NODES[i];
                    return (
                        <div
                            key={`hiw-node-${i}`}
                            ref={el => { nodeRefs.current[i] = el; }}
                            className="absolute z-20 pointer-events-none"
                            style={{ left: `${p.xl}%`, top: `${p.yt}%`, transform: 'translate(-50%,-50%)' }}
                        >
                            {/* outer glow ring */}
                            <div className="absolute inset-0 rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)', transform: 'scale(1.8)' }} />
                            {/* icon circle */}
                            <div
                                className="relative w-[78px] h-[78px] rounded-full flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg,#A855F7 0%,#7C3AED 100%)',
                                    boxShadow: '0 6px 28px rgba(124,58,237,0.5), 0 0 0 5px rgba(168,85,247,0.22)',
                                }}
                            >
                                <step.Icon size={30} className="text-white" strokeWidth={1.8} />
                            </div>
                            {/* step number badge */}
                            <div className="absolute -top-1.5 -right-1.5 w-[22px] h-[22px] rounded-full bg-white border-2 border-primary flex items-center justify-center shadow">
                                <span className="font-mono text-[8px] font-bold text-primary leading-none">{step.num}</span>
                            </div>
                        </div>
                    );
                })}

                {/* ── Text labels ── */}
                {steps.map((step, i) => {
                    const p = HIW_NODES[i];
                    const isRight = p.side === 'right';
                    return (
                        <div
                            key={`hiw-label-${i}`}
                            ref={el => { labelRefs.current[i] = el; }}
                            className="absolute z-10"
                            style={{
                                top: `${p.yt}%`,
                                transform: 'translateY(-50%)',
                                ...(isRight
                                    ? { left: '2%', right: '34%', textAlign: 'right' as const }
                                    : { left: '34%', right: '2%', textAlign: 'left' as const }),
                            }}
                        >
                            <div
                                className="inline-block bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-md border hover:scale-105 hover:shadow-xl transition-all duration-300 relative group"
                                style={{ borderColor: 'rgba(168,85,247,0.15)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                                <h3 className="font-display font-bold text-[15px] leading-snug text-[#151515] mb-1">
                                    {step.title}
                                </h3>
                                <p className="text-[13px] text-gray-500 leading-relaxed">{step.desc}</p>
                            </div>
                        </div>
                    );
                })}

                {/* ── GOAL marker ── */}
                <div
                    ref={goalRef}
                    className="absolute z-30 flex flex-col items-center gap-1 pointer-events-none"
                    style={{ left: '77.1%', top: '97%', transform: 'translate(-50%, -20%)' }}
                >
                    <svg width="34" height="44" viewBox="0 0 34 44" fill="none">
                        <line x1="7" y1="2" x2="7" y2="42" stroke="#151515" strokeWidth="3" strokeLinecap="round" />
                        <path d="M7 3 L31 11 L7 19 Z" fill="#3BBB96" stroke="#151515" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                    <span className="font-display font-bold text-[13px] tracking-[0.15em] text-[#151515]">GOAL</span>
                </div>

            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// TechStack
// ─────────────────────────────────────────────
function TechStack() {
    const chips = [
        "Foundation Models", "Serverless Infrastructure", "Webhook Orchestration",
        "Vector Embeddings", "Secure API Layer", "Real-Time Pipelines",
        "Generative Reasoning", "SOC 2 Compliant", "Zero Config Deployment",
        "GitHub · GitLab · Bitbucket"
    ];
    return (
        <section className="py-[120px] bg-background">
            <div className="max-w-[1200px] w-full mx-auto px-8 flex flex-col items-center text-center">
                <span className="font-mono text-tertiary text-sm tracking-widest uppercase font-bold mb-4 block"><TextGenerate>Under the Hood</TextGenerate></span>
                <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1] mb-8">
                    <TextGenerate delay={0.2}>Built on the Best of</TextGenerate>
                    <TextGenerate delay={0.4}>Modern AI Infrastructure.</TextGenerate>
                </h2>
                <p className="text-lg text-textMuted max-w-[600px] mb-16 leading-relaxed">
                    <TextGenerate delay={0.6}>Velocis combines state-of-the-art foundation models with high-speed serverless task orchestration, ensuring deep vector-embedded understanding of your entire codebase securely.</TextGenerate>
                </p>
                <div className="flex flex-wrap justify-center gap-4 max-w-[900px]">
                    {chips.map((chip, i) => (
                        <CardGenerate key={i} delay={0.8 + (i * 0.05)} duration={0.6} className="bg-surface/50 backdrop-blur-md text-textMain border border-borderSubtle px-6 py-4 rounded-pill font-mono text-sm tracking-wide font-medium transition-all hover:bg-dark hover:text-textInverse hover:scale-105 hover:shadow-lg cursor-default hover:border-primary/50 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="relative z-10">{chip}</span>
                        </CardGenerate>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────
function Stats() {
    const sectionRef = useRef<HTMLElement>(null);
    const numsRef = useRef<(HTMLHeadingElement | null)[]>([]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            numsRef.current.forEach((el) => {
                if (!el) return;
                const target = parseInt(el.getAttribute('data-target') || '0', 10);
                gsap.to(el, {
                    innerText: target, duration: 2, snap: { innerText: 1 }, ease: 'power2.out',
                    scrollTrigger: { trigger: el, start: 'top 80%' },
                    onUpdate: function () {
                        el.innerText = Math.ceil(this.targets()[0].innerText).toString() + (el.getAttribute('data-suffix') || '');
                    }
                });
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="py-[160px] bg-surface relative overflow-hidden">
            <div className="max-w-[1200px] w-full mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-[80px]">
                <div>
                    <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-4 block">What Teams Gain</span>
                    <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1] flex flex-col gap-1">
                        <span>Production Quality.</span>
                        <span>Without the Overhead.</span>
                    </h2>
                    <p className="mt-8 text-lg text-textMuted max-w-sm mb-16 leading-relaxed">
                        Stop waiting on massive PR reviews. Velocis ensures the codebase is always ready to merge.
                    </p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-16">
                        <div><h3 ref={el => { numsRef.current[0] = el }} data-target="80" data-suffix="%" className="font-display text-5xl font-bold text-primary mb-2">0%</h3><p className="font-medium text-textMain">Reduction in manual review time</p></div>
                        <div><h3 ref={el => { numsRef.current[1] = el }} data-target="3" data-suffix="×" className="font-display text-5xl font-bold text-primary mb-2">0×</h3><p className="font-medium text-textMain">Faster junior developer growth</p></div>
                        <div><h3 ref={el => { numsRef.current[2] = el }} data-target="94" data-suffix="%" className="font-display text-5xl font-bold text-primary mb-2">0%</h3><p className="font-medium text-textMain">Vulnerabilities caught pre-production</p></div>
                        <div><h3 ref={el => { numsRef.current[3] = el }} data-target="2" data-suffix="h" className="font-display text-5xl font-bold text-primary mb-2">0</h3><p className="font-medium text-textMain">Average codebase onboarding time</p></div>
                    </div>
                </div>
                <div className="flex flex-col justify-center gap-6">
                    {[
                        { icon: Activity, title: "Free Senior Engineers to Build", desc: "No more babysitting legacy logic." },
                        { icon: Zap, title: "Accelerate Developer Growth", desc: "Actionable, contextual coaching in every PR." },
                        { icon: ShieldCheck, title: "Ship Secure Software automatically", desc: "OWASP-compliant from day one." },
                        { icon: Clock, title: "Ship Features 3x Faster", desc: "Automate tests, docs, and boring chores forever." }
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-6 glass-card bg-background/80 rounded-card p-8 transition-all hover:scale-[1.02] hover:-translate-y-2 hover:shadow-2xl cursor-default group">
                            <div className="w-12 h-12 bg-surface text-primary rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-dark transition-colors duration-300"><item.icon size={24} /></div>
                            <div>
                                <h4 className="font-display font-bold text-xl mb-2">{item.title}</h4>
                                <p className="text-textMuted text-base">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// AnimatedFlagCTA
// ─────────────────────────────────────────────
function AnimatedFlagCTA() {
    const sectionRef = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { setIsVisible(entry.isIntersecting); }, { threshold: 0.3 });
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => { if (sectionRef.current) observer.unobserve(sectionRef.current); };
    }, []);

    return (
        <section ref={sectionRef} className="relative w-full bg-white overflow-hidden pt-10 pb-40 flex flex-col items-center justify-center">
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="none">
                    <clipPath id="mountain-clip">
                        <path d="M0 100 L 250 250 L 500 150 L 650 250 L 720 300 L 850 200 L 1100 350 L 1300 200 L 1440 100 L 1440 0 L 0 0 Z" />
                    </clipPath>
                    <path d="M0 100 L 250 250 L 500 150 L 650 250 L 720 300 L 850 200 L 1100 350 L 1300 200 L 1440 100 L 1440 800 L 0 800 Z" fill="#EAF6F0" />
                    <path d="M0 100 L 250 250 L 500 150 L 650 250 L 720 300 L 850 200 L 1100 350 L 1300 200 L 1440 100" stroke="#252525" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <g transform="translate(0, 18)">
                        <path d="M 690 300 A 30 11 0 0 1 750 300" fill="#0C0C0C" stroke="#151515" strokeWidth="2.5" />
                        <g style={{ transform: isVisible ? 'translateY(0px)' : 'translateY(160px)', transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.25)' }}>
                            <path d="M 720 162 L 720 220 L 763 214 L 720 162 Z" fill="#3BBB96" stroke="#151515" strokeWidth="2.5" strokeLinejoin="round" />
                            <rect x="714" y="156" width="12" height="150" fill="#B382F2" stroke="#151515" strokeWidth="2.5" rx="6" />
                        </g>
                        <path d="M 690 300 A 30 11 0 0 0 750 300" fill="#0C0C0C" stroke="#151515" strokeWidth="2.5" />
                        <path d="M 688 300 A 32 12 0 0 0 752 300 L 752 315 L 688 315 Z" fill="#EAF6F0" />
                    </g>
                </svg>
            </div>
            <div className="relative z-10 flex flex-col items-center max-w-[800px] w-full px-6 text-center mt-[220px]">
                <button className="bg-[#151515] text-white hover:bg-black transition-colors rounded-lg px-8 py-3.5 font-bold text-[15px] shadow-lg mb-8">Try now</button>
                <h2 className="font-display text-[clamp(40px,5vw,56px)] font-bold tracking-tight leading-[1.1] text-[#151515]">
                    <TextGenerate delay={0.2}>Launch in a flash</TextGenerate>
                </h2>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// CTA / Footer
// ─────────────────────────────────────────────
function CTA() {
    const navigate = useNavigate();
    return (
        <footer className="bg-dark text-textInverse pt-[160px] pb-[80px] relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2"></div>
            <div className="max-w-[1200px] w-full mx-auto px-8 pb-[100px] border-b border-borderInv flex flex-col items-center text-center relative z-10">
                <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-6 block"><TextGenerate delay={0}>Get Started</TextGenerate></span>
                <h2 className="font-display text-[clamp(48px,6vw,80px)] font-bold tracking-tight leading-[1] mb-8">
                    <TextGenerate delay={0.2}>Your AI Senior Engineer.</TextGenerate><br />
                    <TextGenerate delay={0.4}>Ready Out The Box.</TextGenerate>
                </h2>
                <p className="text-xl text-textInverse/60 max-w-[500px] mb-12">
                    <TextGenerate delay={0.6}>Free tier available. No credit card required. Connect your first repository in 60 seconds.</TextGenerate>
                </p>
                <TextGenerate delay={0.8}>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={() => navigate('/auth')} className="cta-btn cta-btn--blue px-10 py-5 rounded-button font-bold text-lg cursor-pointer" style={{ backgroundColor: 'var(--cta-primary, #6366f1)', color: 'var(--cta-text, #fff)' }}>Connect Repository Free</button>
                        <button className="bg-transparent text-textInverse border border-borderInv px-10 py-5 rounded-button font-bold text-lg hover:bg-white/5 hover:scale-105 active:scale-95 transition-all cursor-pointer">Read the Docs</button>
                    </div>
                </TextGenerate>
            </div>
            <div className="max-w-[1200px] w-full mx-auto px-8 pt-[80px] grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
                <div className="md:col-span-1">
                    <div className="font-display font-bold text-2xl tracking-tight mb-4">Velocis.</div>
                    <p className="text-textInverse/40 max-w-[250px]">The autonomous AI digital team member embedded inside your code repository.</p>
                </div>
                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-textInverse">Product</h4>
                    {['Sentinel Agent', 'Fortress Agent', 'Visual Cortex', 'Pricing', 'Changelog'].map(l => (
                        <a key={l} href="#" className="text-textInverse/60 hover:text-primary transition-colors">{l}</a>
                    ))}
                </div>
                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-textInverse">Resources</h4>
                    {[{ label: 'Documentation', href: '#' }, { label: 'API Reference', href: '#' }, { label: 'Blog', href: '/blog' }, { label: 'System Status', href: '#' }].map(l => (
                        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-textInverse/60 hover:text-primary transition-colors" onClick={(e) => { if (l.href.startsWith('/')) { e.preventDefault(); window.open(l.href, '_blank', 'noopener,noreferrer'); } }}>{l.label}</a>
                    ))}
                </div>
                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-textInverse">Company</h4>
                    {[{ label: 'About Us', href: '/about' }, { label: 'Careers', href: '/careers' }, { label: 'Contact', href: '/contact' }, { label: 'Security', href: '/security' }].map(l => (
                        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-textInverse/60 hover:text-primary transition-colors" onClick={(e) => { if (l.href.startsWith('/')) { e.preventDefault(); window.open(l.href, '_blank', 'noopener,noreferrer'); } }}>{l.label}</a>
                    ))}
                </div>
            </div>
            <div className="max-w-[1200px] w-full mx-auto px-8 pt-[80px] mt-[80px] border-t border-borderInv flex flex-col sm:flex-row justify-between items-center text-sm text-textInverse/40">
                <p>© 2026 Velocis. All rights reserved.</p>
                <div className="flex gap-6 mt-4 sm:mt-0">
                    {[{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }, { label: 'Security', href: '/security' }].map(l => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-textInverse transition-colors" onClick={(e) => { if (l.href.startsWith('/')) { e.preventDefault(); window.open(l.href, '_blank', 'noopener,noreferrer'); } }}>{l.label}</a>)}
                </div>
            </div>
        </footer>
    );
}

// ─────────────────────────────────────────────
// HomePage (main export)
// ─────────────────────────────────────────────
export function HomePage() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            infinite: false,
        });

        function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);

        const handleScroll = () => { setIsScrolled(window.scrollY > 20); };
        window.addEventListener('scroll', handleScroll);

        const observerOptions = { threshold: 0.15, rootMargin: "0px 0px -50px 0px" };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) { entry.target.classList.add('active'); observer.unobserve(entry.target); }
            });
        }, observerOptions);

        const timeoutId = setTimeout(() => {
            document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
        }, 100);

        return () => {
            lenis.destroy();
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timeoutId);
        };
    }, []);

    return (
        <div className="bg-background min-h-screen font-body flex flex-col text-textMain relative" style={{ backgroundColor: 'var(--color-background)' }}>
            {/* Inject global CSS */}
            <style>{LANDING_CSS}</style>

            {/* Navigation */}
            <header className={`sticky top-0 z-50 border-b transition-all duration-300 ${isScrolled ? 'bg-white/70 backdrop-blur-md border-borderSubtle' : 'bg-transparent border-transparent'}`}>
                <div className="w-full px-8 h-20 flex items-center justify-between">
                    <div className="font-display font-bold text-xl tracking-tight">Velocis.</div>
                    <button className="bg-dark text-textInverse px-5 py-2.5 rounded-button font-medium hover:bg-dark/90 transition-colors">
                        Connect Repository
                    </button>
                </div>
            </header>

            {/* Main Content — TimelineSvg is above Problem */}
            <main className="flex-grow">
                <Hero />
                <LogoCarousel />
                <TimelineSvg />
                <Problem />
                <BentoGrid />
                <HorizontalCarousel />
                <HowItWorks />
                <TechStack />
                <Stats />
            </main>

            <AnimatedFlagCTA />
            <CTA />
        </div>
    );
}

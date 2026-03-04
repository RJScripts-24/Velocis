import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { useNavigate } from 'react-router';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
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
`;

// ─────────────────────────────────────────────
// Aurora (WebGL animated gradient background)
// ─────────────────────────────────────────────
const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \\
  int index = 0;                                            \\
  for (int i = 0; i < 2; i++) {                               \\
     ColorStop currentColor = colors[i];                    \\
     bool isInBetween = currentColor.position <= factor;    \\
     index = int(mix(float(index), float(i), float(isInBetween))); \\
  }                                                         \\
  ColorStop currentColor = colors[index];                   \\
  ColorStop nextColor = colors[index + 1];                  \\
  float range = nextColor.position - currentColor.position; \\
  float lerpFactor = (factor - currentColor.position) / range; \\
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

interface AuroraProps {
    colorStops?: string[];
    amplitude?: number;
    blend?: number;
    time?: number;
    speed?: number;
}

function Aurora(props: AuroraProps) {
    const { colorStops = ['#5227FF', '#7cff67', '#5227FF'], amplitude = 1.0, blend = 0.5 } = props;
    const propsRef = useRef<AuroraProps>(props);
    propsRef.current = props;

    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctn = ctnDom.current;
        if (!ctn) return;

        const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.canvas.style.backgroundColor = 'transparent';

        let program: Program | undefined;

        function resize() {
            if (!ctn) return;
            const width = ctn.offsetWidth;
            const height = ctn.offsetHeight;
            renderer.setSize(width, height);
            if (program) program.uniforms.uResolution.value = [width, height];
        }
        window.addEventListener('resize', resize);

        const geometry = new Triangle(gl);
        if (geometry.attributes.uv) delete geometry.attributes.uv;

        const colorStopsArray = colorStops.map(hex => {
            const c = new Color(hex);
            return [c.r, c.g, c.b];
        });

        program = new Program(gl, {
            vertex: VERT,
            fragment: FRAG,
            uniforms: {
                uTime: { value: 0 },
                uAmplitude: { value: amplitude },
                uColorStops: { value: colorStopsArray },
                uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
                uBlend: { value: blend }
            }
        });

        const mesh = new Mesh(gl, { geometry, program });
        ctn.appendChild(gl.canvas);

        let animateId = 0;
        const update = (t: number) => {
            animateId = requestAnimationFrame(update);
            const { time = t * 0.01, speed = 1.0 } = propsRef.current;
            if (program) {
                program.uniforms.uTime.value = time * speed * 0.1;
                program.uniforms.uAmplitude.value = propsRef.current.amplitude ?? 1.0;
                program.uniforms.uBlend.value = propsRef.current.blend ?? blend;
                const stops = propsRef.current.colorStops ?? colorStops;
                program.uniforms.uColorStops.value = stops.map((hex: string) => {
                    const c = new Color(hex);
                    return [c.r, c.g, c.b];
                });
                renderer.render({ scene: mesh });
            }
        };
        animateId = requestAnimationFrame(update);
        resize();

        return () => {
            cancelAnimationFrame(animateId);
            window.removeEventListener('resize', resize);
            if (ctn && gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
    }, [amplitude]);

    return <div ref={ctnDom} className="w-full h-full" />;
}

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

    return <div ref={containerRef} className={className}>{renderWords()}</div>;
}

// ─────────────────────────────────────────────
// CardGenerate animation
// ─────────────────────────────────────────────
interface CardGenerateProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
}

function CardGenerate({ children, className = "", delay = 0, duration = 1.2 }: CardGenerateProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        gsap.set(container, { clipPath: 'circle(0% at 0% 0%)', opacity: 0 });
        gsap.set(content, { opacity: 0, y: 20 });

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: { trigger: container, start: "top 80%", once: true },
                delay
            });
            tl.to(container, { clipPath: 'circle(150% at 0% 0%)', opacity: 1, duration, ease: 'power2.out' });
            tl.to(content, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, `-=${duration * 0.4}`);
        }, containerRef);

        return () => ctx.revert();
    }, [delay, duration]);

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
        <section ref={containerRef} className="relative pt-[80px] pb-[40px] flex flex-col items-center overflow-hidden">
            <style>{`.hero-svg-wrapper svg { width: 100%; height: auto; }`}</style>

            <div className="absolute left-0 top-[15%] hidden lg:block hero-anim transition-all duration-500 hover:scale-105 z-0">
                <div className="hero-svg-wrapper left-graphic w-[320px] xl:w-[450px] drop-shadow-2xl" dangerouslySetInnerHTML={{ __html: heroLeft }} />
            </div>
            <div className="absolute right-0 top-[10%] hidden lg:block hero-anim transition-all duration-500 hover:scale-105 z-0">
                <div className="hero-svg-wrapper right-graphic w-[320px] xl:w-[450px] drop-shadow-2xl" dangerouslySetInnerHTML={{ __html: heroRight }} />
            </div>

            <div className="max-w-[1200px] w-full px-8 flex flex-col items-center z-10 text-center">
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
                    <button onClick={() => navigate('/auth')} className="flex items-center gap-2 bg-dark text-textInverse px-8 py-4 rounded-button font-medium hover:bg-dark/80 transition-opacity duration-300">
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
    { name: 'Unmind', svg: (<svg viewBox="0 0 120 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors"><text x="0" y="28" fontFamily="serif" fontSize="26" fontWeight="bold">Unmind</text></svg>) },
    { name: 'Glovo', svg: (<svg viewBox="0 0 100 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors"><text x="0" y="28" fontFamily="sans-serif" fontSize="26" fontWeight="bold" letterSpacing="-1">Glovo</text><circle cx="85" cy="12" r="4" fill="currentColor" /></svg>) },
    { name: 'texthelp', svg: (<svg viewBox="0 0 130 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors"><path d="M5 10 h15 v12 h-15 z" fill="currentColor" /><text x="25" y="26" fontFamily="sans-serif" fontSize="24" fontWeight="600" letterSpacing="-0.5">texthelp</text></svg>) },
    { name: 'paddle', svg: (<svg viewBox="0 0 110 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors"><text x="0" y="28" fontFamily="sans-serif" fontSize="25" fontWeight="500">paddle</text></svg>) },
    { name: 'Qonto', svg: (<svg viewBox="0 0 100 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors"><text x="0" y="28" fontFamily="sans-serif" fontSize="26" fontWeight="bold">Qonto</text></svg>) },
];

function LogoCarousel() {
    const carouselLogos = [...logos, ...logos, ...logos];
    return (
        <section className="w-full bg-white py-6 overflow-hidden">
            <div className="max-w-[1200px] mx-auto px-4 mb-4 text-center reveal">
                <p className="text-[17px] font-semibold text-[#151515]">
                    Teams use Prismic's headless CMS and landing page builder to build and automate websites that convert.
                </p>
            </div>
            <div className="logo-carousel-container relative w-full flex overflow-hidden reveal delay-2">
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
                <div className="logo-carousel-track flex items-center min-w-max">
                    {carouselLogos.map((logo, index) => (
                        <div key={index} className="flex-none mx-5 transition-transform duration-300 hover:scale-105">{logo.svg}</div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─────────────────────────────────────────────
// TimelineSvg  (placed ABOVE Problem)
// ─────────────────────────────────────────────
function TimelineSvg() {
    const containerRef = useRef<HTMLElement>(null);

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
        }, containerRef);
        return () => { ctx.revert(); };
    }, []);

    return (
        <section className="features-section bg-[#151515]" ref={containerRef}>
            <div className="timeline-bridge-wrapper w-full flex justify-center" dangerouslySetInnerHTML={{ __html: timelineBridgeRaw }} />
            <div className="max-w-[1200px] w-full mx-auto px-8">
                <div className="split-feature-container" style={{ marginTop: '-4px' }}>
                    {/* Left Column: Engineering Teams */}
                    <CardGenerate delay={0} duration={2.0} className="w-[100%] md:w-1/2 mt-0">
                        <div className="feature-half developer-feature pl-4 md:pl-16 pr-8 pt-10 pb-20 bg-transparent flex flex-col items-start justify-start relative z-10 w-full h-full">
                            <h2 className="text-[1.75rem] leading-tight font-bold mb-4 tracking-tight max-w-[400px]">
                                <span className="text-purple-500 font-semibold mb-1 block text-sm tracking-wider uppercase"><TextGenerate delay={1.2}>Engineering Teams</TextGenerate></span>
                                <span className="text-white"><TextGenerate delay={1.4}>Reclaim your team's engineering velocity</TextGenerate></span>
                            </h2>
                            <p className="text-gray-400 text-lg mb-8 max-w-[400px] leading-relaxed">
                                <TextGenerate delay={1.5}>Stop using your senior engineers as syntax checkers. Velocis automates code reviews and triaging so your team can focus on building features.</TextGenerate>
                            </p>
                            <ul className="text-white space-y-6 mb-10 w-full max-w-[400px]">
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"></path></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={1.6}>Automate repetitive review chores</TextGenerate></span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={1.7}>Catch deep logic flaws before production</TextGenerate></span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={1.8}>Provide instant mentorship to junior devs</TextGenerate></span>
                                </li>
                            </ul>
                            <button className="bg-white text-black hover:bg-gray-100 transition-colors rounded-full px-7 py-3.5 font-semibold text-[15px] inline-flex items-center shadow-lg">
                                <TextGenerate delay={1.9}>Explore Velocis for Teams</TextGenerate>
                            </button>
                        </div>
                    </CardGenerate>

                    {/* Right Column: Developers */}
                    <CardGenerate delay={0.6} duration={2.0} className="w-[100%] md:w-1/2 mt-8 md:mt-32">
                        <div className="feature-half marketer-feature pr-4 md:pr-16 pl-8 pt-10 pb-20 relative z-20 w-full flex flex-col items-start justify-start marketer-tail-card">
                            <h2 className="text-[1.75rem] leading-tight font-bold mb-4 tracking-tight max-w-[400px]">
                                <span className="text-blue-500 font-semibold mb-1 block text-sm tracking-wider uppercase"><TextGenerate delay={1.8}>Developers</TextGenerate></span>
                                <span className="text-[#151515]"><TextGenerate delay={2.0}>Ship confident code without the wait</TextGenerate></span>
                            </h2>
                            <p className="text-gray-600 text-lg mb-8 max-w-[400px] leading-relaxed">
                                <TextGenerate delay={2.1}>Stop waiting days for a code review. Velocis provides instant feedback, suggests fixes, and helps you merge your PRs in hours instead of days.</TextGenerate>
                            </p>
                            <ul className="text-[#151515] space-y-6 mb-10 w-full max-w-[400px]">
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="5" width="20" height="6" rx="2"></rect><rect x="2" y="13" width="20" height="6" rx="2"></rect></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={2.2}>Reduce merge times with instant AI feedback</TextGenerate></span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9a2 2 0 0 0-2-2H8"></path></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={2.3}>Learn best practices through in-line suggestions</TextGenerate></span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                                    <span className="font-medium text-lg leading-snug"><TextGenerate delay={2}>Focus on solving hard problems, not formatting</TextGenerate></span>
                                </li>
                            </ul>
                            <button className="bg-[#151515] text-white hover:bg-black transition-colors rounded-full px-7 py-3.5 font-semibold text-[15px] inline-flex items-center shadow-lg relative z-20">
                                <TextGenerate delay={2.39}>Start moving faster today</TextGenerate>
                            </button>
                            {/* Seamless Sweep Tail */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-[250%] h-[200px] -z-10 pointer-events-none translate-y-[-1px]">
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="sweepGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#F7F7F7" /><stop offset="60%" stopColor="#FFFFFF" /><stop offset="100%" stopColor="#FFFFFF" />
                                        </linearGradient>
                                        <filter id="sweepShadow" x="-20%" y="-30%" width="140%" height="140%">
                                            <feDropShadow dx="0" dy="8" stdDeviation="20" floodColor="#000000" floodOpacity="0.04" />
                                        </filter>
                                    </defs>
                                    <path d="M 31.65 0 C 62 48, 45 120, 0 100 L 100 100 C 55 120, 38 48, 68.35 0 Z" fill="url(#sweepGradient)" filter="url(#sweepShadow)" />
                                </svg>
                            </div>
                        </div>
                    </CardGenerate>
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
                        <TextGenerate>The Problem</TextGenerate>
                    </span>
                    <h2 className="font-display text-[clamp(32px,4.5vw,56px)] font-bold tracking-tight leading-[1.05] mb-12">
                        <TextGenerate delay={0.2}>Teams ship bugs.</TextGenerate>
                        <TextGenerate delay={0.4}>Not features.</TextGenerate>
                    </h2>
                    <div className="flex flex-col gap-10">
                        {problems.map((prob, i) => (
                            <CardGenerate key={i} delay={0.4} duration={2.0} className="flex gap-6">
                                <div className="w-12 h-12 rounded-xl bg-surface flex-shrink-0 flex items-center justify-center text-dark">
                                    <prob.icon size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl mb-2"><TextGenerate delay={1.4}>{prob.title}</TextGenerate></h3>
                                    <p className="text-textMuted text-lg leading-relaxed"><TextGenerate delay={1.6}>{prob.desc}</TextGenerate></p>
                                </div>
                            </CardGenerate>
                        ))}
                    </div>
                </div>

                {/* Right Column (Sticky) */}
                <div className="relative">
                    <div className="sticky top-[120px] flex flex-col gap-8">
                        <CardGenerate delay={0.4} duration={2.0}>
                            <div className="bg-surface rounded-card p-10 flex flex-col gap-4 transition-transform duration-300 hover:-translate-y-1">
                                <span className="text-textMuted font-medium text-lg"><TextGenerate delay={1.4}>Avg Time to Merge PR</TextGenerate></span>
                                <div className="font-display font-bold text-6xl text-dark"><TextGenerate delay={1.6}>4.7 Days</TextGenerate></div>
                                <div className="mt-4 bg-primary/10 text-primary font-mono text-sm font-bold uppercase tracking-wide py-2 px-4 rounded-pill self-start overflow-hidden">
                                    <TextGenerate delay={1.8}>With Velocis: &lt; 4 Hours</TextGenerate>
                                </div>
                            </div>
                        </CardGenerate>

                        <CardGenerate delay={0.8} duration={2.0}>
                            <div className="bg-surface rounded-card p-10 transition-transform duration-300 hover:-translate-y-1">
                                <span className="text-textMuted font-medium text-lg mb-6 block"><TextGenerate delay={1.8}>Senior Engineer Time Breakdown</TextGenerate></span>
                                <div className="flex flex-col gap-4 w-full">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <TextGenerate delay={2.0}>Code Reviews</TextGenerate>
                                            <span className="text-textMuted cursor-default"><TextGenerate delay={2.0}>38%</TextGenerate></span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden"><div className="h-full bg-dark w-[38%] rounded-pill"></div></div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <TextGenerate delay={2.2}>Bug Triage</TextGenerate>
                                            <span className="text-textMuted cursor-default"><TextGenerate delay={2.2}>24%</TextGenerate></span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden"><div className="h-full bg-dark w-[24%] rounded-pill opacity-80"></div></div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <TextGenerate delay={2.4}>Building Features</TextGenerate>
                                            <span className="text-textMuted cursor-default text-primary"><TextGenerate delay={2.4}>6%</TextGenerate></span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden"><div className="h-full bg-primary w-[6%] rounded-pill"></div></div>
                                    </div>
                                </div>
                            </div>
                        </CardGenerate>
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
                    <h2 className="font-display text-[clamp(28px,4vw,48px)] font-bold tracking-tight leading-[1.05]">
                        <TextGenerate>Three Agents.</TextGenerate>
                        <TextGenerate delay={0.2}>One Unified Team.</TextGenerate>
                    </h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {agents.map((agent, i) => (
                        <CardGenerate key={i} delay={-0.15 + (i * 0.15)} duration={1} className="bg-surface rounded-card p-10 flex flex-col items-start transition-all duration-300 hover:-translate-y-2 hover:shadow-xl relative overflow-hidden group">
                            <div className="absolute inset- border-[1px] pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-300 rounded-card" style={{ borderColor: agent.color }} />
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-white" style={{ backgroundColor: agent.color }}><agent.icon size={28} /></div>
                            <div className="font-mono text-sm tracking-widest font-bold mb-2 uppercase" style={{ color: agent.color }}>{agent.role}</div>
                            <h3 className="font-display text-3xl font-bold mb-4"><TextGenerate delay={0.8 + (i * 0.15)}>{agent.name}</TextGenerate></h3>
                            <p className="text-textMuted text-lg mb-8 leading-relaxed flex-grow"><TextGenerate delay={1.0 + (i * 0.15)}>{agent.desc}</TextGenerate></p>
                            <ul className="flex flex-col gap-3 w-full">
                                {agent.features.map((feat, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.color }}></div>
                                        <TextGenerate delay={1.1 + (i * 0.15) + (j * 0.1)}>{feat}</TextGenerate>
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
        <section ref={sectionRef} className="h-screen flex items-center text-white overflow-hidden py-20 relative bg-[#151515]">
            <div className="min-w-[400px] w-[400px] self-stretch z-20 flex flex-col justify-center bg-[#151515] relative">
                <div className="absolute top-0 -right-[200px] bottom-0 w-[200px] bg-gradient-to-r from-[#151515] to-transparent pointer-events-none"></div>
                <div className="px-12 md:px-20 relative z-10">
                    <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-4 block"><TextGenerate>Platform Capabilities</TextGenerate></span>
                    <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1]">
                        <TextGenerate delay={0.2}>Built to Act,</TextGenerate><br /><TextGenerate delay={0.4}>Not Wait.</TextGenerate>
                    </h2>
                    <p className="mt-8 text-lg text-textInverse/60 max-w-sm">
                        <TextGenerate delay={0.6}>A granular look into the features powering Velocis. Keep scrolling to explore the capabilities.</TextGenerate>
                    </p>
                </div>
            </div>
            <div ref={scrollContainerRef} className="flex gap-6 pl-20 pr-[20vw] relative items-center">
                {capabilities.map((cap, i) => (
                    <CardGenerate key={i} delay={0.6 + (i * 0.1)} duration={0.7} className="w-[350px] h-[350px] flex-shrink-0 bg-[#222] border border-white/10 rounded-card p-10 hover:bg-[#2A2A2A] transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-primary mb-6"><cap.icon size={32} /></div>
                        <div>
                            <h3 className="font-display text-2xl font-bold mb-3"><TextGenerate delay={0.8 + (i * 0.1)}>{cap.title}</TextGenerate></h3>
                            <p className="text-textInverse/60 text-lg leading-relaxed"><TextGenerate delay={1.0 + (i * 0.1)}>{cap.desc}</TextGenerate></p>
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
    { xl: 27.14, yt: 30.63, side: 'left'  as const },  // (190, 490)
    { xl: 72.86, yt: 48.75, side: 'right' as const },  // (510, 780)
    { xl: 27.14, yt: 66.88, side: 'left'  as const },  // (190, 1070)
    { xl: 72.86, yt: 85.00, side: 'right' as const },  // (510, 1360)
];

// Timeline positions (0–10) at which each node should pop in
const HIW_NODE_T = [1.4, 3.1, 4.8, 6.5, 8.2];

function HowItWorks() {
    const sectionRef  = useRef<HTMLElement>(null);
    const roadRef     = useRef<SVGPathElement>(null);
    const nodeRefs    = useRef<(HTMLDivElement | null)[]>([]);
    const labelRefs   = useRef<(HTMLDivElement | null)[]>([]);
    const startRef    = useRef<HTMLDivElement>(null);
    const goalRef     = useRef<HTMLDivElement>(null);

    const steps = [
        { Icon: Github,      num: '01', title: 'Connect Repository', desc: 'Securely link GitHub, GitLab, or Bitbucket in under 60 seconds via OAuth.' },
        { Icon: Activity,    num: '02', title: 'Webhook Listening',  desc: 'Velocis quietly observes all commits, branches, and PRs in real time.' },
        { Icon: Cpu,         num: '03', title: 'Agents Activate',    desc: 'Sentinel, Fortress, and Visual Cortex run concurrently on every push.' },
        { Icon: ShieldCheck, num: '04', title: 'Issues Resolved',    desc: 'Bugs are auto-fixed when possible, or flagged with deep context when not.' },
        { Icon: Settings,    num: '05', title: 'Artifacts Update',   desc: 'Tests, docs, and architecture maps stay perpetually current.' },
    ];

    useEffect(() => {
        if (!sectionRef.current || !roadRef.current) return;

        const road     = roadRef.current;
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
        if (startRef.current) gsap.set(startRef.current, { opacity: 0, y: -12 });
        if (goalRef.current)  gsap.set(goalRef.current,  { opacity: 0, y:  12 });

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 65%',
                    end:   'bottom 35%',
                    scrub: 2,
                },
            });

            // START marker
            tl.to(startRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0);

            // Draw the road
            tl.to(road, { strokeDashoffset: 0, duration: 10, ease: 'none' }, 0);

            // Nodes + labels
            HIW_NODE_T.forEach((t, i) => {
                const n = nodeRefs.current[i];
                const l = labelRefs.current[i];
                if (n) tl.to(n, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' }, t);
                if (l) tl.to(l, { opacity: 1, x: 0,  duration: 0.4,  ease: 'power3.out' },       t + 0.3);
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
                    style={{ left: '28.6%', top: '0%', transform: 'translate(-50%, -80%)' }}
                >
                    {/* running person */}
                    <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
                        <circle cx="23" cy="6" r="5.5" fill="#151515"/>
                        {/* body */}
                        <line x1="23" y1="12" x2="23" y2="28" stroke="#151515" strokeWidth="3.5" strokeLinecap="round"/>
                        {/* legs */}
                        <line x1="23" y1="22" x2="12" y2="38" stroke="#151515" strokeWidth="3"   strokeLinecap="round"/>
                        <line x1="23" y1="22" x2="34" y2="32" stroke="#151515" strokeWidth="3"   strokeLinecap="round"/>
                        {/* arms */}
                        <line x1="10" y1="17" x2="25" y2="13" stroke="#151515" strokeWidth="3"   strokeLinecap="round"/>
                    </svg>
                    <span className="font-display font-bold text-[13px] tracking-[0.15em] text-[#151515]">START</span>
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
                            <stop offset="0%"   stopColor="#A855F7"/>
                            <stop offset="100%" stopColor="#7C3AED"/>
                        </linearGradient>
                    </defs>

                    {/* Subtle road shadow */}
                    <path d={HIW_ROAD_D} fill="none" stroke="rgba(0,0,0,0.18)"
                          strokeWidth="76" strokeLinecap="round" strokeLinejoin="round"
                          style={{ filter: 'blur(10px)' }}/>

                    {/* Road surface (animated) */}
                    <path ref={roadRef} d={HIW_ROAD_D} fill="none"
                          stroke="#1c1c1c" strokeWidth="66"
                          strokeLinecap="round" strokeLinejoin="round"/>

                    {/* Road edge highlight */}
                    <path d={HIW_ROAD_D} fill="none"
                          stroke="rgba(255,255,255,0.06)" strokeWidth="68"
                          strokeLinecap="round" strokeLinejoin="round"/>

                    {/* Centre dashes — static, appear with section */}
                    <path d={HIW_ROAD_D} fill="none"
                          stroke="rgba(255,255,255,0.45)" strokeWidth="4"
                          strokeDasharray="28 22" strokeLinecap="round"/>
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
                                <step.Icon size={30} className="text-white" strokeWidth={1.8}/>
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
                                    : { left: '34%', right: '2%', textAlign: 'left'  as const }),
                            }}
                        >
                            <div
                                className="inline-block bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-md border border-white"
                                style={{ borderColor: 'rgba(168,85,247,0.15)' }}
                            >
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
                        <line x1="7" y1="2" x2="7" y2="42" stroke="#151515" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M7 3 L31 11 L7 19 Z" fill="#3BBB96" stroke="#151515" strokeWidth="1.5" strokeLinejoin="round"/>
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
                        <CardGenerate key={i} delay={0.8 + (i * 0.05)} duration={0.6} className="bg-surface text-textMain border border-borderSubtle px-6 py-4 rounded-pill font-mono text-sm tracking-wide font-medium transition-colors hover:bg-dark hover:text-textInverse cursor-default">
                            {chip}
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
                    <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-4 block"><TextGenerate>What Teams Gain</TextGenerate></span>
                    <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1]">
                        <TextGenerate delay={0.2}>Production Quality.</TextGenerate><br />
                        <TextGenerate delay={0.4}>Without the Overhead.</TextGenerate>
                    </h2>
                    <p className="mt-8 text-lg text-textMuted max-w-sm mb-16 leading-relaxed">
                        <TextGenerate delay={0.6}>Stop waiting on massive PR reviews. Velocis ensures the codebase is always ready to merge.</TextGenerate>
                    </p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-16">
                        <div><h3 ref={el => { numsRef.current[0] = el }} data-target="80" data-suffix="%" className="font-display text-5xl font-bold text-primary mb-2">0%</h3><p className="font-medium text-textMain"><TextGenerate delay={0.8}>Reduction in manual review time</TextGenerate></p></div>
                        <div><h3 ref={el => { numsRef.current[1] = el }} data-target="3" data-suffix="×" className="font-display text-5xl font-bold text-primary mb-2">0×</h3><p className="font-medium text-textMain"><TextGenerate delay={0.9}>Faster junior developer growth</TextGenerate></p></div>
                        <div><h3 ref={el => { numsRef.current[2] = el }} data-target="94" data-suffix="%" className="font-display text-5xl font-bold text-primary mb-2">0%</h3><p className="font-medium text-textMain"><TextGenerate delay={1.0}>Vulnerabilities caught pre-production</TextGenerate></p></div>
                        <div><h3 ref={el => { numsRef.current[3] = el }} data-target="2" data-suffix="h" className="font-display text-5xl font-bold text-primary mb-2">0</h3><p className="font-medium text-textMain"><TextGenerate delay={1.1}>Average codebase onboarding time</TextGenerate></p></div>
                    </div>
                </div>
                <div className="flex flex-col justify-center gap-6">
                    {[
                        { icon: Activity, title: "Free Senior Engineers to Build", desc: "No more babysitting legacy logic." },
                        { icon: Zap, title: "Accelerate Developer Growth", desc: "Actionable, contextual coaching in every PR." },
                        { icon: ShieldCheck, title: "Ship Secure Software automatically", desc: "OWASP-compliant from day one." },
                        { icon: Clock, title: "Ship Features 3x Faster", desc: "Automate tests, docs, and boring chores forever." }
                    ].map((item, i) => (
                        <CardGenerate key={i} delay={1.2 + (i * 0.2)} duration={1.2} className="flex items-start gap-6 bg-background rounded-card p-8 transition-transform hover:-translate-y-1 shadow-sm">
                            <div className="w-12 h-12 bg-surface text-primary rounded-full flex items-center justify-center flex-shrink-0"><item.icon size={24} /></div>
                            <div>
                                <h4 className="font-display font-bold text-xl mb-2"><TextGenerate delay={1.4 + (i * 0.2)}>{item.title}</TextGenerate></h4>
                                <p className="text-textMuted text-base"><TextGenerate delay={1.6 + (i * 0.2)}>{item.desc}</TextGenerate></p>
                            </div>
                        </CardGenerate>
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
                        <button onClick={() => navigate('/auth')} className="bg-primary text-dark px-10 py-5 rounded-button font-bold text-lg hover:bg-primary/90 transition-colors">Connect Repository Free</button>
                        <button className="bg-transparent text-textInverse border border-borderInv px-10 py-5 rounded-button font-bold text-lg hover:bg-white/5 transition-colors">Read the Docs</button>
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
                    {['Documentation', 'API Reference', 'Blog', 'System Status'].map(l => (
                        <a key={l} href="#" className="text-textInverse/60 hover:text-primary transition-colors">{l}</a>
                    ))}
                </div>
                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-textInverse">Company</h4>
                    {['About Us', 'Careers', 'Contact', 'Security'].map(l => (
                        <a key={l} href="#" className="text-textInverse/60 hover:text-primary transition-colors">{l}</a>
                    ))}
                </div>
            </div>
            <div className="max-w-[1200px] w-full mx-auto px-8 pt-[80px] mt-[80px] border-t border-borderInv flex flex-col sm:flex-row justify-between items-center text-sm text-textInverse/40">
                <p>© 2026 Velocis. All rights reserved.</p>
                <div className="flex gap-6 mt-4 sm:mt-0">
                    {['Privacy', 'Terms', 'Security'].map(l => <a key={l} href="#" className="hover:text-textInverse transition-colors">{l}</a>)}
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

            {/* Aurora Background glow */}
            <div
                className="absolute top-0 left-0 w-full h-[350px] z-0 pointer-events-none opacity-70"
                style={{
                    maskImage: 'linear-gradient(to bottom, white 0%, white 50%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 50%, transparent 100%)'
                }}
            >
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <Aurora colorStops={["#8d5cf6", "#38bdf8", "#3bbb96"]} amplitude={1.5} blend={0.8} />
                </div>
            </div>

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

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { Github, Play } from 'lucide-react';
import heroLeft from '../../../assets/landing-page/hero-left.svg?raw';
import heroRight from '../../../assets/landing-page/hero-right.svg?raw';
import Aurora from './Aurora';

export default function Hero() {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Staggered fade up for hero elements
            gsap.fromTo('.hero-anim',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
            );

            // Animate hero SVG lines drawing
            gsap.to('.hero-line-base', { opacity: 1, duration: 0.4, delay: 0.8 });
            // Left graphic (Green) needs length -> -length to project outwards
            gsap.utils.toArray<HTMLElement>('.left-graphic .hero-line-top').forEach(line => {
                const length = parseFloat(line.getAttribute('stroke-dasharray') || '150');
                gsap.fromTo(line,
                    { strokeDashoffset: length },
                    {
                        strokeDashoffset: -length,
                        duration: 2.5,
                        ease: 'linear',
                        repeat: -1,
                        delay: 0.8
                    }
                );
            });

            // Right graphic (Blue) needs -length -> length to project outwards
            gsap.utils.toArray<HTMLElement>('.right-graphic .hero-line-top').forEach(line => {
                const length = parseFloat(line.getAttribute('stroke-dasharray') || '150');
                gsap.fromTo(line,
                    { strokeDashoffset: -length },
                    {
                        strokeDashoffset: length,
                        duration: 2.5,
                        ease: 'linear',
                        repeat: -1,
                        delay: 0.8
                    }
                );
            });

            // Terminal blinking cursor
            gsap.to('.cursor-blink', {
                opacity: 0,
                ease: "steps(1)",
                repeat: -1,
                duration: 0.5
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="relative pt-[160px] pb-[100px] flex flex-col items-center overflow-hidden">
            <style>{`
                .hero-svg-wrapper svg {
                    width: 100%;
                    height: auto;
                }
            `}</style>

            {/* Abstract Floating Hero Graphics */}
            <div className="absolute left-0 top-[15%] hidden lg:block hero-anim transition-all duration-500 hover:scale-105 z-0">
                <div className="hero-svg-wrapper left-graphic w-[320px] xl:w-[450px] drop-shadow-2xl" dangerouslySetInnerHTML={{ __html: heroLeft }} />
            </div>

            <div className="absolute right-0 top-[10%] hidden lg:block hero-anim transition-all duration-500 hover:scale-105 z-0">
                <div className="hero-svg-wrapper right-graphic w-[320px] xl:w-[450px] drop-shadow-2xl" dangerouslySetInnerHTML={{ __html: heroRight }} />
            </div>


            <div className="max-w-[1200px] w-full px-8 flex flex-col items-center z-10 text-center">
                {/* Label Pill */}
                <div className="hero-anim inline-flex items-center gap-2 bg-surface px-4 py-2 rounded-pill mb-8 border border-borderSubtle">
                    <div className="w-2 h-2 rounded-full bg-primary relative">
                        <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75"></div>
                    </div>
                    <span className="font-mono text-sm tracking-wide font-medium">Always-On · Autonomous · Production-Ready</span>
                </div>

                {/* Display Headline */}
                <h1 className="hero-anim font-display text-[clamp(48px,6vw,80px)] font-bold tracking-[-0.03em] leading-[1.05] mb-6">
                    The AI Senior Engineer.<br />
                    Living in Your Repo.
                </h1>

                {/* Subheadline */}
                <p className="hero-anim max-w-[650px] text-lg text-textMuted mb-10 text-balance leading-relaxed">
                    Velocis acts like a senior engineer working continuously in the background. It proactively improves code quality, testing, security, and architecture—triggered automatically by repository changes, zero prompts required.
                </p>

                {/* CTA Row */}
                <div className="hero-anim flex flex-col sm:flex-row gap-4 mb-24">
                    <button onClick={() => navigate('/auth')} className="flex items-center gap-2 bg-dark text-textInverse px-8 py-4 rounded-button font-medium hover:bg-dark/80 transition-opacity duration-300">
                        <Github size={20} />
                        Connect Repository
                    </button>
                    <button className="flex items-center gap-2 bg-transparent text-textMain border border-borderSubtle px-8 py-4 rounded-button font-medium hover:bg-surface transition-colors duration-300">
                        <Play size={20} />
                        Watch Demo
                    </button>
                </div>

                {/* Terminal Window */}
                <div className="hero-anim w-full max-w-[800px] bg-dark rounded-card p-6 shadow-2xl border border-white/5 text-left font-mono text-sm leading-relaxed overflow-hidden relative">
                    {/* Header dots */}
                    <div className="flex gap-2 mb-6">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                    </div>

                    <div className="text-textInverse/60 flex flex-col gap-2">
                        <div>
                            <span className="text-primary mr-2">➜</span>
                            <span className="text-tertiary">velocis</span> watch --repo=core-backend
                        </div>
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

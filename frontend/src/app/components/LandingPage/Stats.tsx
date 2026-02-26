import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Activity, ShieldCheck, Clock, Zap } from 'lucide-react';
import TextGenerate from './animations/TextGenerate';
import CardGenerate from './animations/CardGenerate';

gsap.registerPlugin(ScrollTrigger);

export default function Stats() {
    const sectionRef = useRef<HTMLElement>(null);
    const numsRef = useRef<(HTMLHeadingElement | null)[]>([]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Count up animation for stats
            numsRef.current.forEach((el) => {
                if (!el) return;
                const target = parseInt(el.getAttribute('data-target') || '0', 10);

                gsap.to(el, {
                    innerText: target,
                    duration: 2,
                    snap: { innerText: 1 },
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 80%',
                    },
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

                {/* Left Column (Stats) */}
                <div>
                    <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-4 block">
                        <TextGenerate>What Teams Gain</TextGenerate>
                    </span>
                    <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1]">
                        <TextGenerate delay={0.2}>Production Quality.</TextGenerate><br />
                        <TextGenerate delay={0.4}>Without the Overhead.</TextGenerate>
                    </h2>
                    <p className="mt-8 text-lg text-textMuted max-w-sm mb-16 leading-relaxed">
                        <TextGenerate delay={0.6}>
                            Stop waiting on massive PR reviews. Velocis ensures the codebase is always ready to merge.
                        </TextGenerate>
                    </p>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-16">
                        <div>
                            <h3
                                ref={el => { numsRef.current[0] = el }}
                                data-target="80"
                                data-suffix="%"
                                className="font-display text-5xl font-bold text-primary mb-2"
                            >
                                0%
                            </h3>
                            <p className="font-medium text-textMain">
                                <TextGenerate delay={0.8}>Reduction in manual review time</TextGenerate>
                            </p>
                        </div>
                        <div>
                            <h3
                                ref={el => { numsRef.current[1] = el }}
                                data-target="3"
                                data-suffix="×"
                                className="font-display text-5xl font-bold text-primary mb-2"
                            >
                                0×
                            </h3>
                            <p className="font-medium text-textMain">
                                <TextGenerate delay={0.9}>Faster junior developer growth</TextGenerate>
                            </p>
                        </div>
                        <div>
                            <h3
                                ref={el => { numsRef.current[2] = el }}
                                data-target="94"
                                data-suffix="%"
                                className="font-display text-5xl font-bold text-primary mb-2"
                            >
                                0%
                            </h3>
                            <p className="font-medium text-textMain">
                                <TextGenerate delay={1.0}>Vulnerabilities caught pre-production</TextGenerate>
                            </p>
                        </div>
                        <div>
                            <h3
                                ref={el => { numsRef.current[3] = el }}
                                data-target="2"
                                data-suffix="h"
                                className="font-display text-5xl font-bold text-primary mb-2"
                            >
                                0
                            </h3>
                            <p className="font-medium text-textMain">
                                <TextGenerate delay={1.1}>Average codebase onboarding time</TextGenerate>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column (Benefits Rows) */}
                <div className="flex flex-col justify-center gap-6">
                    {[
                        { icon: Activity, title: "Free Senior Engineers to Build", desc: "No more babysitting legacy logic." },
                        { icon: Zap, title: "Accelerate Developer Growth", desc: "Actionable, contextual coaching in every PR." },
                        { icon: ShieldCheck, title: "Ship Secure Software automatically", desc: "OWASP-compliant from day one." },
                        { icon: Clock, title: "Ship Features 3x Faster", desc: "Automate tests, docs, and boring chores forever." }
                    ].map((item, i) => (
                        <CardGenerate key={i} delay={1.2 + (i * 0.2)} duration={1.2} className="flex items-start gap-6 bg-background rounded-card p-8 transition-transform hover:-translate-y-1 shadow-sm">
                            <div className="w-12 h-12 bg-surface text-primary rounded-full flex items-center justify-center flex-shrink-0">
                                <item.icon size={24} />
                            </div>
                            <div>
                                <h4 className="font-display font-bold text-xl mb-2">
                                    <TextGenerate delay={1.4 + (i * 0.2)}>{item.title}</TextGenerate>
                                </h4>
                                <p className="text-textMuted text-base">
                                    <TextGenerate delay={1.6 + (i * 0.2)}>{item.desc}</TextGenerate>
                                </p>
                            </div>
                        </CardGenerate>
                    ))}
                </div>

            </div>
        </section>
    );
}

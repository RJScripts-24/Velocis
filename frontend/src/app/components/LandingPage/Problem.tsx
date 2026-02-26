import { Clock, Shield, AlertTriangle, UserX } from 'lucide-react';

import TextGenerate from './animations/TextGenerate';
import CardGenerate from './animations/CardGenerate';

const problems = [
    { icon: Clock, title: "Code Reviews Become Bottlenecks", desc: "Seniors spend 40% of their time reviewing rather than building." },
    { icon: Shield, title: "Security Vulnerabilities Slip Through", desc: "Manual checks miss deeply nested logic flaws." },
    { icon: AlertTriangle, title: "Testing Is Always the First Casualty", desc: "Under deadline pressure, test coverage drops." },
    { icon: UserX, title: "Junior Devs Lack Senior Guidance", desc: "No bandwidth for contextual, personalized mentorship." }
];

export default function Problem() {
    return (
        <section className="py-[120px] bg-background">
            <div className="max-w-[1200px] w-full mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-[64px]">

                {/* Left Column (Scrolls) */}
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
                                    <h3 className="font-bold text-xl mb-2">
                                        <TextGenerate delay={1.4}>{prob.title}</TextGenerate>
                                    </h3>
                                    <p className="text-textMuted text-lg leading-relaxed">
                                        <TextGenerate delay={1.6}>{prob.desc}</TextGenerate>
                                    </p>
                                </div>
                            </CardGenerate>
                        ))}
                    </div>
                </div>

                {/* Right Column (Sticky) */}
                <div className="relative">
                    <div className="sticky top-[120px] flex flex-col gap-8">

                        {/* Stat Card */}
                        <CardGenerate delay={0.4} duration={2.0}>
                            <div className="bg-surface rounded-card p-10 flex flex-col gap-4 transition-transform duration-300 hover:-translate-y-1">
                                <span className="text-textMuted font-medium text-lg">
                                    {/* Delay = Card Delay (0.4) + Card Pop Time (1.0) = 1.4 */}
                                    <TextGenerate delay={1.4}>Avg Time to Merge PR</TextGenerate>
                                </span>
                                <div className="font-display font-bold text-6xl text-dark">
                                    <TextGenerate delay={1.6}>4.7 Days</TextGenerate>
                                </div>
                                <div className="mt-4 bg-primary/10 text-primary font-mono text-sm font-bold uppercase tracking-wide py-2 px-4 rounded-pill self-start overflow-hidden">
                                    <TextGenerate delay={1.8}>With Velocis: &lt; 4 Hours</TextGenerate>
                                </div>
                            </div>
                        </CardGenerate>

                        {/* Chart Card */}
                        <CardGenerate delay={0.8} duration={2.0}>
                            <div className="bg-surface rounded-card p-10 transition-transform duration-300 hover:-translate-y-1">
                                <span className="text-textMuted font-medium text-lg mb-6 block">
                                    {/* Delay = Card Delay (0.8) + Card Pop Time (1.0) = 1.8 */}
                                    <TextGenerate delay={1.8}>Senior Engineer Time Breakdown</TextGenerate>
                                </span>
                                <div className="flex flex-col gap-4 w-full">

                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <TextGenerate delay={2.0}>Code Reviews</TextGenerate>
                                            <span className="text-textMuted cursor-default"><TextGenerate delay={2.0}>38%</TextGenerate></span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden">
                                            <div className="h-full bg-dark w-[38%] rounded-pill"></div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <TextGenerate delay={2.2}>Bug Triage</TextGenerate>
                                            <span className="text-textMuted cursor-default"><TextGenerate delay={2.2}>24%</TextGenerate></span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden">
                                            <div className="h-full bg-dark w-[24%] rounded-pill opacity-80"></div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <TextGenerate delay={2.4}>Building Features</TextGenerate>
                                            <span className="text-textMuted cursor-default text-primary"><TextGenerate delay={2.4}>6%</TextGenerate></span>
                                        </div>
                                        <div className="h-4 w-full bg-borderSubtle rounded-pill overflow-hidden">
                                            <div className="h-full bg-primary w-[6%] rounded-pill"></div>
                                        </div>
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

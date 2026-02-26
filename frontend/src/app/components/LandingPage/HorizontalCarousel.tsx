import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Settings, Search, Edit3, Book, MapPin, AlertCircle, TrendingUp, Cpu } from 'lucide-react';
import TextGenerate from './animations/TextGenerate';
import CardGenerate from './animations/CardGenerate';

gsap.registerPlugin(ScrollTrigger);

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

export default function HorizontalCarousel() {
    const sectionRef = useRef<HTMLElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sectionRef.current || !scrollContainerRef.current) return;

        // Prismic locking scroll simulation
        const scrollContainer = scrollContainerRef.current;

        // We want to translate the horizontal element left
        // by the amount it overflows the screen width
        function getScrollAmount() {
            const scrollWidth = scrollContainer.scrollWidth;
            const viewportWidth = window.innerWidth;
            return -(scrollWidth - viewportWidth);
        }

        const ctx = gsap.context(() => {
            // Pin the section and animate horizontal scroll
            gsap.to(scrollContainer, {
                x: getScrollAmount,
                ease: "none",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: () => `+=${getScrollAmount() * -1}`, // The scroll duration depends on how wide the content is
                    pin: true,
                    scrub: 1, // Smooth scrolling effect
                    invalidateOnRefresh: true, // Recalculate on window resize
                }
            });

        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="h-screen flex items-center text-white overflow-hidden py-20 relative bg-[#151515]">

            {/* Intro Hook fixed to the side while content scrolls past */}
            <div className="min-w-[400px] w-[400px] self-stretch z-20 flex flex-col justify-center bg-[#151515] relative">

                {/* Fade gradient extending out to the right */}
                {/* Fade gradient extending out to the right */}
                <div className="absolute top-0 -right-[200px] bottom-0 w-[200px] bg-gradient-to-r from-[#151515] to-transparent pointer-events-none"></div>

                <div className="px-12 md:px-20 relative z-10">
                    <span className="font-mono text-primary text-sm tracking-widest uppercase font-bold mb-4 block">
                        <TextGenerate>Platform Capabilities</TextGenerate>
                    </span>
                    <h2 className="font-display text-[clamp(40px,5vw,64px)] font-bold tracking-tight leading-[1]">
                        <TextGenerate delay={0.2}>Built to Act,</TextGenerate><br />
                        <TextGenerate delay={0.4}>Not Wait.</TextGenerate>
                    </h2>
                    <p className="mt-8 text-lg text-textInverse/60 max-w-sm">
                        <TextGenerate delay={0.6}>
                            A granular look into the features powering Velocis. Keep scrolling to explore the capabilities.
                        </TextGenerate>
                    </p>
                </div>
            </div>

            {/* The horizontally translating container */}
            <div ref={scrollContainerRef} className="flex gap-6 pl-20 pr-[20vw] relative items-center">
                {capabilities.map((cap, i) => (
                    <CardGenerate
                        key={i}
                        delay={0.6 + (i * 0.1)} // Start generating cards slightly after text finishes, sweeping across
                        duration={0.7}
                        className="w-[350px] h-[350px] flex-shrink-0 bg-[#222] border border-white/10 rounded-card p-10 hover:bg-[#2A2A2A] transition-colors"
                    >
                        {/* We removed the flex col from the wrapper and let CardGenerate handle the inner wrapper */}
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-primary mb-6">
                            <cap.icon size={32} />
                        </div>

                        <div>
                            <h3 className="font-display text-2xl font-bold mb-3">
                                <TextGenerate delay={0.8 + (i * 0.1)}>{cap.title}</TextGenerate>
                            </h3>
                            <p className="text-textInverse/60 text-lg leading-relaxed">
                                <TextGenerate delay={1.0 + (i * 0.1)}>{cap.desc}</TextGenerate>
                            </p>
                        </div>

                        <div className="flex font-mono text-xs opacity-30 mt-4 tracking-widest text-[#FFF]">
                            CAP.0{i + 1}
                        </div>
                    </CardGenerate>
                ))}
            </div>

        </section>
    );
}

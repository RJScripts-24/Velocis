import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import timelineBridgeRaw from '../../../assets/landing-page/timeline-bridge.svg?raw';
import './TimelineSvg.css';

import TextGenerate from './animations/TextGenerate';
import CardGenerate from './animations/CardGenerate';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

export default function TimelineSvg() {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: '.timeline-bridge-wrapper',
                    start: 'top 75%',
                    end: 'bottom 40%',
                    scrub: 1,
                }
            });

            // Set initial muted gray states
            gsap.set('.setup path:first-child, .build path:first-child, .ship path:first-child, .create path:first-child, .publish path:first-child, .automate path:first-child', { fill: 'rgb(80, 80, 80)' });
            gsap.set('.setup path:nth-child(3), .build path:nth-child(3), .ship path:nth-child(3), .create path:nth-child(3), .publish path:nth-child(3), .automate path:nth-child(3)', { fill: 'rgb(164, 164, 164)' });
            gsap.set('.setup path:nth-child(4), .build path:nth-child(4), .ship path:nth-child(4), .create path:nth-child(4), .publish path:nth-child(4), .automate path:nth-child(4)', { fill: '#151515' });

            // Step 1: Set up (Purple)
            tl.to('.setup path:first-child', { fill: 'rgb(147, 51, 234)', duration: 1 }, 0)
                .to('.setup path:nth-child(3)', { fill: 'rgb(168, 85, 247)', duration: 1 }, 0)
                .to('.setup path:nth-child(4)', { fill: 'rgb(192, 132, 252)', duration: 1 }, 0);

            // Step 2: Build (Purple)
            tl.to('.build path:first-child', { fill: 'rgb(147, 51, 234)', duration: 1 }, 1)
                .to('.build path:nth-child(3)', { fill: 'rgb(168, 85, 247)', duration: 1 }, 1)
                .to('.build path:nth-child(4)', { fill: 'rgb(192, 132, 252)', duration: 1 }, 1);

            // Step 3: Ship (Purple)
            tl.to('.ship path:first-child', { fill: 'rgb(147, 51, 234)', duration: 1 }, 2)
                .to('.ship path:nth-child(3)', { fill: 'rgb(168, 85, 247)', duration: 1 }, 2)
                .to('.ship path:nth-child(4)', { fill: 'rgb(192, 132, 252)', duration: 1 }, 2);

            // Step 4: Create (Blue)
            tl.to('.create path:first-child', { fill: 'rgb(2, 132, 199)', duration: 1 }, 3)
                .to('.create path:nth-child(3)', { fill: 'rgb(56, 189, 248)', duration: 1 }, 3)
                .to('.create path:nth-child(4)', { fill: 'rgb(125, 211, 252)', duration: 1 }, 3);

            // Step 5: Publish (Dark Blue)
            tl.to('.publish path:first-child', { fill: 'rgb(37, 99, 235)', duration: 1 }, 4)
                .to('.publish path:nth-child(3)', { fill: 'rgb(59, 130, 246)', duration: 1 }, 4)
                .to('.publish path:nth-child(4)', { fill: 'rgb(96, 165, 250)', duration: 1 }, 4);

            // Step 6: Automate (Green)
            tl.to('.automate path:first-child', { fill: 'rgb(16, 185, 129)', duration: 1 }, 5)
                .to('.automate path:nth-child(3)', { fill: '#000', duration: 1 }, 5)
                .to('.automate path:nth-child(4)', { fill: 'rgb(34, 197, 94)', duration: 1 }, 5);

            // Move the Ball!
            tl.to('#timeline-ball', {
                motionPath: {
                    path: '#motion-path',
                    align: '#motion-path',
                    alignOrigin: [0.5, 0.5],
                },
                duration: 6,
                ease: "none"
            }, 0);

            // Change ball colors roughly midway between stations
            tl.to('#timeline-ball', { fill: 'rgb(2, 132, 199)', duration: 0.5 }, 2.5)
                .to('#timeline-ball', { fill: 'rgb(37, 99, 235)', duration: 0.5 }, 3.5)
                .to('#timeline-ball', { fill: 'rgb(16, 185, 129)', duration: 0.5 }, 4.5);

        }, containerRef);

        return () => {
            ctx.revert();
        };
    }, []);

    return (
        <section className="features-section bg-[#151515]" ref={containerRef}>
            {/* The Bridge / Timeline Graphic separating sections, parsed natively for GSAP path animation */}
            <div
                className="timeline-bridge-wrapper w-full overflow-hidden flex justify-center"
                dangerouslySetInnerHTML={{ __html: timelineBridgeRaw }}
            />

            <div className="max-w-[1200px] w-full mx-auto px-8">
                {/* Split Section: Marketer / Developer */}
                <div className="split-feature-container" style={{ marginTop: '-4px' }}>
                    {/* Left Column: Developers (Dark) */}
                    <CardGenerate delay={0} duration={2.0} className="w-[100%] md:w-1/2 mt-0">
                        <div className="feature-half developer-feature pl-4 md:pl-16 pr-8 pt-10 pb-20 bg-transparent flex flex-col items-start justify-start relative z-10 w-full h-full">
                            <h2 className="text-[1.75rem] leading-tight font-bold mb-4 tracking-tight max-w-[400px]">
                                <span className="text-purple-500 font-semibold mb-1 block text-sm tracking-wider uppercase">
                                    <TextGenerate delay={1.2}>Engineering Teams</TextGenerate>
                                </span>
                                <span className="text-white">
                                    <TextGenerate delay={1.4}>Reclaim your team's engineering velocity</TextGenerate>
                                </span>
                            </h2>
                            <p className="text-gray-400 text-lg mb-8 max-w-[400px] leading-relaxed">
                                <TextGenerate delay={1.5}>
                                    Stop using your senior engineers as syntax checkers. Velocis automates code reviews and triaging so your team can focus on building features.
                                </TextGenerate>
                            </p>

                            <ul className="text-white space-y-6 mb-10 w-full max-w-[400px]">
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"></path></svg>
                                    </div>
                                    <span className="font-medium text-lg leading-snug">
                                        <TextGenerate delay={1.6}>Automate repetitive review chores</TextGenerate>
                                    </span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    </div>
                                    <span className="font-medium text-lg leading-snug">
                                        <TextGenerate delay={1.7}>Catch deep logic flaws before production</TextGenerate>
                                    </span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-purple-500 mt-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </div>
                                    <span className="font-medium text-lg leading-snug">
                                        <TextGenerate delay={1.8}>Provide instant mentorship to junior devs</TextGenerate>
                                    </span>
                                </li>
                            </ul>

                            <button className="bg-white text-black hover:bg-gray-100 transition-colors rounded-full px-7 py-3.5 font-semibold text-[15px] inline-flex items-center shadow-lg">
                                <TextGenerate delay={1.9}>Explore Velocis for Teams</TextGenerate>
                            </button>
                        </div>
                    </CardGenerate>

                    {/* Right Column: Marketers (White Card) */}
                    <CardGenerate delay={0.6} duration={2.0} className="w-[100%] md:w-1/2 mt-8 md:mt-32">
                        <div className="feature-half marketer-feature pr-4 md:pr-16 pl-8 pt-10 pb-20 relative z-20 w-full flex flex-col items-start justify-start marketer-tail-card">
                            <h2 className="text-[1.75rem] leading-tight font-bold mb-4 tracking-tight max-w-[400px]">
                                <span className="text-blue-500 font-semibold mb-1 block text-sm tracking-wider uppercase">
                                    <TextGenerate delay={1.8}>Developers</TextGenerate>
                                </span>
                                <span className="text-[#151515]">
                                    <TextGenerate delay={2.0}>Ship confident code without the wait</TextGenerate>
                                </span>
                            </h2>
                            <p className="text-gray-600 text-lg mb-8 max-w-[400px] leading-relaxed">
                                <TextGenerate delay={2.1}>
                                    Stop waiting days for a code review. Velocis provides instant feedback, suggests fixes, and helps you merge your PRs in hours instead of days.
                                </TextGenerate>
                            </p>

                            <ul className="text-[#151515] space-y-6 mb-10 w-full max-w-[400px]">
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="5" width="20" height="6" rx="2"></rect><rect x="2" y="13" width="20" height="6" rx="2"></rect></svg>
                                    </div>
                                    <span className="font-medium text-lg leading-snug">
                                        <TextGenerate delay={2.2}>Reduce merge times with instant AI feedback</TextGenerate>
                                    </span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9a2 2 0 0 0-2-2H8"></path></svg>
                                    </div>
                                    <span className="font-medium text-lg leading-snug">
                                        <TextGenerate delay={2.3}>Learn best practices through in-line suggestions</TextGenerate>
                                    </span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="text-blue-500 mt-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    </div>
                                    <span className="font-medium text-lg leading-snug">
                                        <TextGenerate delay={2.4}>Focus on solving hard problems, not formatting</TextGenerate>
                                    </span>
                                </li>
                            </ul>

                            <button className="bg-[#151515] text-white hover:bg-black transition-colors rounded-full px-7 py-3.5 font-semibold text-[15px] inline-flex items-center shadow-lg relative z-20">
                                <TextGenerate delay={2.4}>Start moving faster today</TextGenerate>
                            </button>

                            {/* Seamless Extra Curvy Hourglass Sweep Tail */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-[250%] h-[200px] -z-10 pointer-events-none translate-y-[-1px]">
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="sweepGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#F7F7F7" />
                                            <stop offset="60%" stopColor="#FFFFFF" />
                                            <stop offset="100%" stopColor="#FFFFFF" />
                                        </linearGradient>
                                        <filter id="sweepShadow" x="-20%" y="-30%" width="140%" height="140%">
                                            <feDropShadow dx="0" dy="8" stdDeviation="20" floodColor="#000000" floodOpacity="0.04" />
                                        </filter>
                                    </defs>
                                    {/* 
                                    Sweep path:
                                    Starts perfectly behind the card's vertical edges at X=30 and X=70 by overlapping upwards 40px.
                                    Maintains a perfectly vertical tangent initially to flawlessly continue the card's straight sides, 
                                    then swoops intensely inward before flaring dramatically wide at the bottom.
                                    This perfectly unifies the card with the massive white section below.
                                */}
                                    <path
                                        d="M 31.65 0 C 62 48, 45 120, 0 100 L 100 100 C 55 120, 38 48, 68.35 0 Z"
                                        fill="url(#sweepGradient)"
                                        filter="url(#sweepShadow)"
                                    />
                                </svg>
                            </div>
                        </div>
                    </CardGenerate>
                </div>
            </div>
        </section>
    );
}

import React, { useRef, useEffect, useState } from 'react';
import TextGenerate from './animations/TextGenerate';

export default function AnimatedFlagCTA() {
    const sectionRef = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Optional: Unobserve if we only want it to pop once
                    // if (sectionRef.current) observer.unobserve(sectionRef.current);
                } else {
                    // Reset animation when out of view so it plays again when scrolling back down
                    setIsVisible(false);
                }
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, []);

    return (
        <section ref={sectionRef} className="relative w-full bg-white overflow-hidden pt-10 pb-40 flex flex-col items-center justify-center">

            {/* Background shape mimicking the mountain/curve and the SVG Flag animation */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="none">

                    {/* Definition for the clip path to hide the flag below the mountain line if needed, 
                        though the translation naturally hides it behind the white background usually. 
                        We will clip against the mountain. */}
                    <clipPath id="mountain-clip">
                        <path d="M0 100 L 250 250 L 500 150 L 650 250 L 720 300 L 850 200 L 1100 350 L 1300 200 L 1440 100 L 1440 0 L 0 0 Z" />
                    </clipPath>

                    {/* Mint Green Fill */}
                    <path d="M0 100 L 250 250 L 500 150 L 650 250 L 720 300 L 850 200 L 1100 350 L 1300 200 L 1440 100 L 1440 800 L 0 800 Z" fill="#EAF6F0" />

                    {/* The Dark Mountain Stroke Line */}
                    <path d="M0 100 L 250 250 L 500 150 L 650 250 L 720 300 L 850 200 L 1100 350 L 1300 200 L 1440 100" stroke="#252525" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round" />


                    {/* --- FLAG ANIMATION GROUP --- */}
                    <g transform="translate(0, 18)">

                        {/* The Hole Back Lip (Behind the flag) */}
                        <path d="M 690 300 A 30 11 0 0 1 750 300" fill="#0C0C0C" stroke="#151515" strokeWidth="2.5" />

                        {/* Animated Flag & Pole */}
                        <g
                            style={{
                                transform: isVisible ? 'translateY(0px)' : 'translateY(160px)',
                                transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.25)' // Clean pop effect
                            }}
                        >
                            {/* Flag Canvas (Rendered behind the pole) */}
                            <path d="M 720 162 L 720 220 L 763 214 L 720 162 Z" fill="#3BBB96" stroke="#151515" strokeWidth="2.5" strokeLinejoin="round" />

                            {/* Pole */}
                            <rect x="714" y="156" width="12" height="150" fill="#B382F2" stroke="#151515" strokeWidth="2.5" rx="6" />
                        </g>

                        {/* The Hole Front Lip (In front of the flag) */}
                        <path d="M 690 300 A 30 11 0 0 0 750 300" fill="#0C0C0C" stroke="#151515" strokeWidth="2.5" />

                        {/* A tiny bit of the inner mountain fill to patch over any gap below the stroke */}
                        <path d="M 688 300 A 32 12 0 0 0 752 300 L 752 315 L 688 315 Z" fill="#EAF6F0" />

                    </g>

                </svg>
            </div>

            {/* Content Container positioned below the 'dip' */}
            <div className="relative z-10 flex flex-col items-center max-w-[800px] w-full px-6 text-center mt-[220px]">

                {/* Call to Action Content */}
                <button className="bg-[#151515] text-white hover:bg-black transition-colors rounded-lg px-8 py-3.5 font-bold text-[15px] shadow-lg mb-8">
                    Try now
                </button>

                <h2 className="font-display text-[clamp(40px,5vw,56px)] font-bold tracking-tight leading-[1.1] text-[#151515]">
                    <TextGenerate delay={0.2}>Launch in a flash</TextGenerate>
                </h2>
            </div>
        </section>
    );
}

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    yOffset?: number;
}

export default function ScrollReveal({
    children,
    className = "",
    delay = 0,
    duration = 0.8,
    yOffset = 40
}: ScrollRevealProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        // Set initial state
        gsap.set(element, {
            opacity: 0,
            y: yOffset
        });

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                trigger: element,
                start: "top 85%", // Trigger when the top of the element hits 85% down the viewport
                animation: gsap.to(element, {
                    opacity: 1,
                    y: 0,
                    duration: duration,
                    delay: delay,
                    ease: "power3.out",
                }),
                once: true // Only animate once
            });
        }, containerRef);

        return () => ctx.revert();
    }, [delay, duration, yOffset]);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}

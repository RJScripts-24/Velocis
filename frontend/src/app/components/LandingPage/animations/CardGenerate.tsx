import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface CardGenerateProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
}

export default function CardGenerate({
    children,
    className = "",
    delay = 0,
    duration = 1.2
}: CardGenerateProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        // The card container starts clipped entirely from the top-left. 
        // We'll use a circular wipe from top-left to bottom-right for a diagonal materializing effect.
        gsap.set(container, {
            clipPath: 'circle(0% at 0% 0%)', // Fully closed at top-left
            opacity: 0 // Fade in as it generates
        });

        // The internal content starts faded and slightly shifted so it "pops" after the card frame is generated
        gsap.set(content, {
            opacity: 0,
            y: 20
        });

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: container,
                    start: "top 80%", // Trigger slightly lower down
                    once: true
                },
                delay: delay
            });

            // Step 1: Sweep the card background into existence diagonally from top-left
            tl.to(container, {
                clipPath: 'circle(150% at 0% 0%)', // Expand circle to cover entire element
                opacity: 1,
                duration: duration,
                ease: 'power2.out'
            });

            // Step 2: Fade the internal content up sharply right as the sweep completes
            tl.to(content, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: 'back.out(1.5)' // Give it a slight pop/bounce into place
            }, `-=${duration * 0.4}`); // Overlap: Start popping the content before the sweep fully finishes

        }, containerRef);

        return () => ctx.revert();
    }, [delay, duration]);

    return (
        <div ref={containerRef} className={`${className} relative`}>
            {/* 
                We wrap the children in an inner div that we animate separately. 
                This ensures the background (if part of className) generates first, 
                then the text/icons appear inside it. 
            */}
            <div ref={contentRef} className="w-full h-full flex flex-col justify-between">
                {children}
            </div>
        </div>
    );
}

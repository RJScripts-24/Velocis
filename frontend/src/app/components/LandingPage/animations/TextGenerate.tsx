import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface TextGenerateProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    stagger?: number;
    duration?: number;
}

export default function TextGenerate({
    children,
    className = "",
    delay = 0,
    stagger = 0.05, // Very fast stagger per word to simulate typing
    duration = 0.5
}: TextGenerateProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Helper to safely split text into words while keeping spaces
    const renderWords = () => {
        if (typeof children !== 'string') {
            return children; // If it's not a pure string (e.g., spans inside), we can't easily split it. It will just fade in as one block.
        }

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

        // If the children were strings and successfully split into spans
        const spans = element.querySelectorAll('span');
        const targetElements = spans.length > 0 ? Array.from(spans) : element;

        // Initial invisible state
        gsap.set(targetElements, {
            opacity: 0,
            y: 10, // Slight drop-in effect per word
            filter: "blur(4px)" // Terminal phosphor generation feel
        });

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                trigger: element,
                start: "top 80%", // Match CardGenerate trigger point
                animation: gsap.to(targetElements, {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    duration: duration,
                    delay: delay,
                    stagger: stagger,
                    ease: "power2.out"
                }),
                once: true
            });
        }, containerRef);

        return () => ctx.revert();
    }, [delay, duration, stagger]);

    return (
        <div ref={containerRef} className={className}>
            {renderWords()}
        </div>
    );
}

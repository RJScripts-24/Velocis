import React, { useEffect, useRef } from 'react';

/**
 * Antigravity-style Particle Vortex Background
 * An interactive canvas component that renders thousands of tangential strokes
 * orbiting a central point, matching the aesthetic of the target reference.
 */

// Math helpers
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
// Color palette matching the screenshot: Blue -> Purple -> Orange/Red
const THEME_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E', '#F97316', '#F59E0B', '#EAB308'];

interface Particle {
    r: number;        // Radius from center
    theta: number;    // Angle around center
    velocity: number; // Orbital velocity
    length: number;   // Length of the stroke
    width: number;    // Thickness of the stroke
    color: string;    // Precomputed color
    alpha: number;    // Base opacity
}

export function AntigravityBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let cx = 0;
        let cy = 0;

        let particles: Particle[] = [];
        const numParticles = 800; // Adjust for density

        // Mouse interaction state
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const initParticles = () => {
            particles = [];
            const maxRadius = Math.max(width, height) * 0.8;
            const minRadius = Math.min(width, height) * 0.25; // Create a hollow center

            for (let i = 0; i < numParticles; i++) {
                // Skew distribution slightly towards the center
                const radius = minRadius + Math.pow(Math.random(), 1.5) * (maxRadius - minRadius);
                const angle = Math.random() * Math.PI * 2;

                // Color is selected based on the angle to create distinct colored "sectors"
                const colorIndex = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * THEME_COLORS.length) % THEME_COLORS.length;

                particles.push({
                    r: radius,
                    theta: angle,
                    velocity: (Math.random() > 0.5 ? 1 : -1) * rand(0.0002, 0.001),
                    length: rand(4, 12),
                    width: rand(1.5, 3.5),
                    color: THEME_COLORS[colorIndex],
                    alpha: rand(0.2, 0.8)
                });
            }
        };

        const resize = () => {
            if (!canvas) return;
            width = canvas.parentElement?.clientWidth || window.innerWidth;
            height = canvas.parentElement?.clientHeight || window.innerHeight;
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            cx = width / 2;
            cy = height / 2;
            // Preset target to center
            targetX = cx;
            targetY = cy;
            mouseX = cx;
            mouseY = cy;

            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            initParticles();
        };

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            targetX = e.clientX - rect.left;
            targetY = e.clientY - rect.top;
        };

        const draw = () => {
            // Clear canvas cleanly instead of trailing to keep it sharp
            ctx.clearRect(0, 0, width, height);

            // Easing mouse follow
            mouseX += (targetX - mouseX) * 0.05;
            mouseY += (targetY - mouseY) * 0.05;

            // Calculate a global offset based on mouse position from center to give a parallax feeling
            const parallaxX = (mouseX - cx) * 0.1;
            const parallaxY = (mouseY - cy) * 0.1;

            ctx.lineCap = 'round';

            particles.forEach(p => {
                // Update position
                p.theta += p.velocity;

                // Calculate screen coords
                // Apply a slight distortion based on parallax
                const x = cx + Math.cos(p.theta) * p.r + parallaxX * (p.r / cx);
                const y = cy + Math.sin(p.theta) * p.r + parallaxY * (p.r / cy);

                // Calculate the tangent angle so the stroke always points along its orbit
                const tangent = p.theta + Math.PI / 2;

                // Draw stroke
                ctx.beginPath();
                // Move back half length, then draw forward full length
                ctx.moveTo(
                    x - Math.cos(tangent) * (p.length / 2),
                    y - Math.sin(tangent) * (p.length / 2)
                );
                ctx.lineTo(
                    x + Math.cos(tangent) * (p.length / 2),
                    y + Math.sin(tangent) * (p.length / 2)
                );

                ctx.strokeStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.lineWidth = p.width;
                ctx.stroke();
            });

            animationRef.current = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMouseMove);

        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
        />
    );
}

export default AntigravityBackground;

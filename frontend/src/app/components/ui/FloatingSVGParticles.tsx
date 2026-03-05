import React, { useEffect, useRef } from 'react';

const COLORS = ['#8d5cf6', '#38bdf8', '#3bbb96'];

export function AntigravityCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const parent = canvas.parentElement;
        if (!parent) return;

        let particlesArray: Particle[] = [];
        let centerX = parent.clientWidth / 2;
        let centerY = parent.clientHeight / 2;
        let animationFrameId: number;

        // Global mouse tracker relative to canvas
        const mouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };
        const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };

        // Bind directly to window to guarantee catch over overlapping hero divs
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        class Particle {
            angle: number;
            radius: number;
            speed: number;
            drift: number;
            size: number;
            color: string;
            x: number;
            y: number;

            constructor() {
                this.angle = Math.random() * Math.PI * 2;
                // Don't spawn randomly across the whole infinite screen, cluster them radially
                let maxRadius = Math.max(parent!.clientWidth, parent!.clientHeight);
                this.radius = 200 + Math.random() * (maxRadius * 0.6);

                this.speed = (Math.random() * 0.001) + 0.0005;
                this.drift = Math.random() * 0.3;
                this.size = Math.random() * 3 + 2; // Base size larger so they are visible
                this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
                this.x = centerX + Math.cos(this.angle) * this.radius;
                this.y = centerY + Math.sin(this.angle) * this.radius;
            }

            update() {
                // Native vortex
                this.angle += this.speed;
                this.radius += this.drift;

                let maxRadius = Math.max(parent!.clientWidth, parent!.clientHeight);
                if (this.radius > maxRadius) {
                    this.radius = 200 + Math.random() * 50;
                }

                // Base coordinates
                this.x = centerX + Math.cos(this.angle) * this.radius;
                this.y = centerY + Math.sin(this.angle) * this.radius;
            }

            draw() {
                ctx!.save();

                let drawX = this.x;
                let drawY = this.y;
                let drawScale = 1;

                // Inject dynamic magnetic pull overriding orbit cleanly
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const magnetRadius = 200;

                if (dist < magnetRadius) {
                    const pull = 1 - (dist / magnetRadius);
                    const power = Math.pow(pull, 2) * 1.5; // Stronger magnet focus
                    drawX += dx * power;
                    drawY += dy * power;
                    drawScale += power; // Flare up slightly when near cursor
                }

                ctx!.translate(drawX, drawY);
                // Triangles point outward from the absolute center originally, but lerp dynamically here
                ctx!.rotate(this.angle + (Math.PI / 4) + (dist < magnetRadius ? (1 - dist / magnetRadius) : 0));

                ctx!.fillStyle = this.color;
                ctx!.beginPath();
                const dSize = this.size * drawScale;
                ctx!.moveTo(dSize * 2, -dSize * 2);
                ctx!.lineTo(-dSize, dSize);
                ctx!.lineTo(dSize, -dSize);
                ctx!.closePath();
                ctx!.fill();

                ctx!.restore();
            }
        }

        function init() {
            // Apply crisp High-DPI screen scaling inherently
            const dpr = window.devicePixelRatio || 1;
            canvas!.width = parent!.clientWidth * dpr;
            canvas!.height = parent!.clientHeight * dpr;
            ctx!.scale(dpr, dpr);

            centerX = parent!.clientWidth / 2;
            centerY = parent!.clientHeight / 2;

            particlesArray = [];

            // Generate denser clusters tightly bound
            let numberOfParticles = (parent!.clientWidth * parent!.clientHeight) / 1000;
            if (numberOfParticles > 1500) numberOfParticles = 1500;

            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }

        function animate() {
            ctx!.clearRect(0, 0, parent!.clientWidth, parent!.clientHeight);

            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }

            animationFrameId = requestAnimationFrame(animate);
        }

        const handleResize = () => init();
        window.addEventListener('resize', handleResize);

        init();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        />
    );
}

export default AntigravityCanvas;

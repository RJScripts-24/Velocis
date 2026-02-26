import React, { useState, useEffect, useRef } from 'react';

type LogLine =
    | { type: 'command'; text: string; }
    | { type: 'info'; text: string; className?: string; }
    | { type: 'agent'; agent: string; text: string; colorClass: string; }
    | { type: 'output'; text: string; colorClass: string; }
    | { type: 'space'; };

const SCENARIOS: LogLine[] = [
    { type: 'command', text: "velocis watch --repo=core-backend" },
    { type: 'info', text: "[Velocis] Connected to repository tracking HEAD:main", className: "text-[#A8A8A8]" },
    { type: 'agent', agent: 'Sentinel', text: "analyzing PR #142 (Adding Stripe Integration)", colorClass: "text-[#A8A8A8]" },
    { type: 'output', text: "↳ Detected unhandled missing idempotency key. Applying fix.", colorClass: "text-[#A8A8A8]" },
    { type: 'agent', agent: 'Fortress', text: "auto-generating unit tests...", colorClass: "text-[#38bdf8]" },
    { type: 'output', text: "↳ 14 tests scaffolded and passing.", colorClass: "text-[#38bdf8]" },
    { type: 'agent', agent: 'Visual Cortex', text: "updating architecture maps...", colorClass: "text-[#34d399]" },
    { type: 'output', text: "↳ Dependency graph synchronized successfully.", colorClass: "text-[#34d399]" },
    { type: 'info', text: "Ready for next event.", className: "text-white font-bold mt-4" },
    { type: 'space' },

    { type: 'command', text: "velocis apply --layer=database" },
    { type: 'info', text: "[Velocis] Compiling Prisma schema changes...", className: "text-[#A8A8A8]" },
    { type: 'agent', agent: 'Visual Cortex', text: "mapping database relationships...", colorClass: "text-[#34d399]" },
    { type: 'output', text: "↳ Identified missing foreign key index on 'User.orgId'.", colorClass: "text-[#34d399]" },
    { type: 'agent', agent: 'Sentinel', text: "generating migration script...", colorClass: "text-[#A8A8A8]" },
    { type: 'output', text: "↳ Migration 20240315_add_org_index created safely.", colorClass: "text-[#A8A8A8]" },
    { type: 'info', text: "Ready for next event.", className: "text-white font-bold mt-4" },
    { type: 'space' },

    { type: 'command', text: "velocis analyze --target=auth-service" },
    { type: 'info', text: "[Velocis] Scanning authentication module for vulnerabilities...", className: "text-[#A8A8A8]" },
    { type: 'agent', agent: 'Sentinel', text: "running static code profiling...", colorClass: "text-[#A8A8A8]" },
    { type: 'output', text: "↳ Flagged deprecated JWT signing method. Suggesting RS256.", colorClass: "text-[#A8A8A8]" },
    { type: 'agent', agent: 'Fortress', text: "validating edge-cases on login flow...", colorClass: "text-[#38bdf8]" },
    { type: 'output', text: "↳ Simulated 500 concurrent logins. 0 failures.", colorClass: "text-[#38bdf8]" },
    { type: 'info', text: "Ready for next event.", className: "text-white font-bold mt-4" },
    { type: 'space' },

    { type: 'command', text: "velocis deploy --env=staging" },
    { type: 'info', text: "[Velocis] Building containers for core services...", className: "text-[#A8A8A8]" },
    { type: 'output', text: "↳ Cache hit for nextjs-frontend. Build time: 1.2s", colorClass: "text-[#A8A8A8]" },
    { type: 'agent', agent: 'Fortress', text: "executing pre-flight end-to-end checks...", colorClass: "text-[#38bdf8]" },
    { type: 'output', text: "↳ All critical paths green. API latency < 45ms.", colorClass: "text-[#38bdf8]" },
    { type: 'info', text: "Deployed to https://staging.velocis.app", className: "text-white font-bold mt-4" },
    { type: 'space' }
];

export default function LiveTerminal({ className = "" }: { className?: string }) {
    const [lines, setLines] = useState<LogLine[]>([]);
    const [currentCommand, setCurrentCommand] = useState<{ full: string, typed: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let currentLineIdx = 0;
        let isActive = true;
        let typeInterval: ReturnType<typeof setInterval>;
        let stepTimeout: ReturnType<typeof setTimeout>;

        const processNext = () => {
            if (!isActive) return;

            if (currentLineIdx >= SCENARIOS.length) {
                currentLineIdx = 0; // Loop indefinitely
            }

            const line = SCENARIOS[currentLineIdx];

            if (line.type === 'command') {
                setCurrentCommand({ full: line.text, typed: '' });
                let charIdx = 0;

                typeInterval = setInterval(() => {
                    if (!isActive) return;
                    charIdx++;
                    setCurrentCommand({ full: line.text, typed: line.text.substring(0, charIdx) });
                    if (charIdx >= line.text.length) {
                        clearInterval(typeInterval);
                        setCurrentCommand(null);
                        setLines(prev => {
                            const next = [...prev, line];
                            return next.length > 50 ? next.slice(-50) : next;
                        });
                        currentLineIdx++;
                        stepTimeout = setTimeout(processNext, 600); // Pause after typing before executing
                    }
                }, 40); // Typing speed
            } else {
                setLines(prev => {
                    const next = [...prev, line];
                    return next.length > 50 ? next.slice(-50) : next; // Keep last 50
                });
                currentLineIdx++;

                let delay = 300;
                if (line.type === 'output') delay = 150;
                if (line.type === 'space') delay = 1000;
                if (line.type === 'info') delay = 400;

                stepTimeout = setTimeout(processNext, delay + Math.random() * 200); // Add slight randomness
            }
        };

        stepTimeout = setTimeout(processNext, 1000); // Initial delay

        return () => {
            isActive = false;
            clearTimeout(stepTimeout);
            clearInterval(typeInterval);
        };
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [lines, currentCommand]);

    const renderLine = (line: LogLine, idx: number) => {
        if (line.type === 'space') return <div key={idx} className="h-6"></div>;

        if (line.type === 'command') {
            return (
                <div key={idx} className="flex gap-2 text-[#A8A8A8] font-medium mt-3">
                    <span className="text-[#38bdf8] font-bold">{"->"}</span>
                    <span><span className="text-[#38bdf8]">velocis</span> {line.text.replace('velocis ', '')}</span>
                </div>
            );
        }

        if (line.type === 'info') {
            return (
                <div key={idx} className={`mt-1 ${line.className || "text-[#A8A8A8]"}`}>
                    {line.text}
                </div>
            );
        }

        if (line.type === 'agent') {
            return (
                <div key={idx} className="flex gap-2 items-center mt-5 text-[#A8A8A8]">
                    <span className={`text-[#A8A8A8]`}>●</span>
                    <span><span className={line.colorClass}>{line.agent}</span> {line.text}</span>
                </div>
            );
        }

        if (line.type === 'output') {
            return (
                <div key={idx} className={`pl-5 mt-1 ${line.colorClass}`}>
                    {line.text}
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`bg-[#0d0d0d] rounded-[24px] shadow-2xl overflow-hidden flex flex-col font-mono text-[15px] leading-relaxed relative ${className}`}>
            {/* Subtle Inner Glow Border */}
            <div className="absolute inset-0 border border-white/5 rounded-[24px] pointer-events-none"></div>

            {/* Mac Window Controls */}
            <div className="flex items-center gap-2 px-6 pt-5 pb-2 relative z-10 bg-[#0d0d0d]">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            </div>

            {/* Terminal Content Area */}
            <div ref={containerRef} className="px-6 pb-8 pt-2 flex-grow overflow-y-auto scroll-smooth custom-scrollbar flex flex-col relative z-0">
                {lines.length === 0 && !currentCommand && (
                    <div className="text-[#A8A8A8] flex items-center gap-2 mt-2">
                        <span className="w-2 h-4 bg-[#38bdf8] animate-pulse inline-block"></span>
                    </div>
                )}

                {lines.map((line, idx) => renderLine(line, idx))}

                {currentCommand && (
                    <div className="flex gap-2 text-[#A8A8A8] font-medium mt-3">
                        <span className="text-[#38bdf8] font-bold">{"->"}</span>
                        <span>
                            {currentCommand.typed.startsWith('velocis ') ? (
                                <>
                                    <span className="text-[#38bdf8]">velocis</span>
                                    {' ' + currentCommand.typed.replace('velocis ', '')}
                                </>
                            ) : currentCommand.typed}
                            <span className="w-2 h-4 bg-[#38bdf8] animate-pulse inline-block align-middle ml-1"></span>
                        </span>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}

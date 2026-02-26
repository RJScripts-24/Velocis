import React, { useEffect, useState } from 'react';

export const BrandPanel: React.FC = () => {
    const [terminalLines, setTerminalLines] = useState<number>(0);

    useEffect(() => {
        // Sliding terminal lines with a smoother cadence
        const intervals = [0, 800, 1600, 2400];
        intervals.forEach((time, index) => {
            setTimeout(() => {
                setTerminalLines(index + 1);
            }, time);
        });
    }, []);

    return (
        <div className="hidden md:flex flex-col relative overflow-hidden bg-[#FFFFFF] w-[55%] h-full border-r border-[#EEEEEE]">

            {/* --- SVG BACKGROUND LAYER --- */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                {/* Floating Teal Blob Top Right */}
                <svg className="absolute -top-20 -right-20 animate-float" width="400" height="400" viewBox="0 0 400 400" fill="none">
                    <path d="M285.5 119C331.1 160.6 342.3 234.3 313.2 291.5C284.1 348.6 214.6 389.2 144.5 385.4C74.3 381.6 3.4 333.3 0.1 267.4C-3.2 201.5 60.1 118 116.3 76.4C172.5 34.8 239.9 77.4 285.5 119Z" fill="rgba(59, 187, 150, 0.05)" />
                </svg>

                {/* Floating Purple Geometric Shape Bottom Left */}
                <svg className="absolute -bottom-10 -left-10 animate-float-delayed" width="350" height="350" viewBox="0 0 350 350" fill="none">
                    <rect x="50" y="50" width="200" height="200" rx="40" transform="rotate(15 150 150)" stroke="var(--brand-accent-secondary)" strokeWidth="2" strokeDasharray="10 10" className="opacity-20 animate-dash-flow" />
                    <circle cx="250" cy="100" r="30" fill="var(--brand-accent-secondary)" fillOpacity="0.05" />
                </svg>

                {/* Decorative Grid Lines */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <rect width="40" height="40" fill="none" />
                            <circle cx="2" cy="2" r="1" fill="#151515" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>
            {/* --------------------------- */}

            {/* Layer 3: Content */}
            <div className="relative z-10 flex flex-col justify-center h-full p-14 pl-14">

                {/* Velocis Wordmark */}
                <div className="mb-14">
                    <div className="flex items-center gap-3">
                        <svg width="22" height="26" viewBox="0 0 24 30" fill="none" className="animate-float">
                            <path d="M13.5 0L0 16.5H10.5L9 30L24 12H13.5V0Z" fill="var(--brand-accent)" />
                        </svg>
                        <h1 className="font-['Inter'] font-[800] text-[32px] text-[#151515] tracking-tight">
                            VELOCIS
                        </h1>
                    </div>
                    <p className="font-['Inter'] font-[500] text-[15px] text-[#505050] mt-1 ml-1">
                        Build software at the speed of thought.
                    </p>
                </div>

                {/* 3 Interactive Bento Feature Cards */}
                <div className="flex flex-col gap-4 relative">

                    {/* Dashed connector line for UI flow */}
                    <svg className="absolute left-[38px] top-[40px] bottom-[40px] w-1 z-0" fill="none">
                        <line x1="2" y1="0" x2="2" y2="100%" stroke="var(--border-default)" strokeWidth="2" strokeDasharray="6 6" />
                    </svg>

                    {/* Row 1 — Sentinel */}
                    <div className="agent-row-1 bento-card flex items-start p-4 rounded-xl bg-white border-2 border-[#EEEEEE] relative z-10 max-w-[380px] cursor-default group">
                        <div className="shrink-0 p-3 rounded-[10px] bg-[#F7F7F7] border border-[#EEEEEE] group-hover:bg-[#E5F7F1] transition-colors mr-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform duration-300">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <div className="pt-1">
                            <h3 className="font-['Inter'] font-[700] text-[16px] text-[#151515]">Sentinel</h3>
                            <p className="font-['Inter'] font-[500] text-[13px] text-[#505050] mt-1 leading-relaxed">Continuous mentorship & AI security reviews during every PR.</p>
                        </div>
                    </div>

                    {/* Row 2 — Fortress */}
                    <div className="agent-row-2 bento-card flex items-start p-4 rounded-xl bg-white border-2 border-[#EEEEEE] relative z-10 max-w-[380px] cursor-default group">
                        <div className="shrink-0 p-3 rounded-[10px] bg-[#F7F7F7] border border-[#EEEEEE] group-hover:bg-[#F3E8FF] transition-colors mr-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform duration-300">
                                <rect x="2" y="10" width="20" height="12" rx="2" ry="2"></rect>
                                <path d="M6 10V6c0-3.3 2.7-6 6-6s6 2.7 6 6v4"></path>
                            </svg>
                        </div>
                        <div className="pt-1">
                            <h3 className="font-['Inter'] font-[700] text-[16px] text-[#151515]">Fortress</h3>
                            <p className="font-['Inter'] font-[500] text-[13px] text-[#505050] mt-1 leading-relaxed">Zero-touch test generation and automated self-healing.</p>
                        </div>
                    </div>

                    {/* Row 3 — Visual Cortex */}
                    <div className="agent-row-3 bento-card flex items-start p-4 rounded-xl bg-white border-2 border-[#EEEEEE] relative z-10 max-w-[380px] cursor-default group">
                        <div className="shrink-0 p-3 rounded-[10px] bg-[#F7F7F7] border border-[#EEEEEE] group-hover:bg-[#E5F7F1] transition-colors mr-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-rotate-12 transition-transform duration-300">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                <polyline points="13 2 13 9 20 9"></polyline>
                                <polyline points="8 13 12 17 16 13"></polyline>
                            </svg>
                        </div>
                        <div className="pt-1">
                            <h3 className="font-['Inter'] font-[700] text-[16px] text-[#151515]">Visual Cortex</h3>
                            <p className="font-['Inter'] font-[500] text-[13px] text-[#505050] mt-1 leading-relaxed">Live topological maps of your entire running architecture.</p>
                        </div>
                    </div>
                </div>

                {/* Social Proof / Trusted By */}
                <div className="mt-12 opacity-80 animate-fade-in-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
                    <p className="font-['Inter'] font-[600] text-[12px] text-[#ACACAC] uppercase tracking-wider mb-4">
                        Trusted by Engineering Teams At
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[#EEEEEE] flex items-center justify-center overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0" alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[#EEEEEE] flex items-center justify-center overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Aneka&backgroundColor=fef08a" alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[#EEEEEE] flex items-center justify-center overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Jude&backgroundColor=fbcfe8" alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[#F7F7F7] flex items-center justify-center font-['Inter'] font-[600] text-[10px] text-[#151515] shadow-sm">
                                4K+
                            </div>
                        </div>
                        <div className="text-[13px] font-['Inter'] font-[500] text-[#505050] ml-2">
                            Developers shipped faster this week.
                        </div>
                    </div>
                </div>

                {/* Upgraded Terminal Block */}
                <div
                    className="absolute bottom-10 left-14 w-[340px] rounded-xl bg-[#FFFFFF] border-2 border-[#151515] overflow-hidden bento-card shadow-[4px_4px_0px_0px_#151515]"
                >
                    {/* Terminal Header / Window Controls */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#F7F7F7] border-b-2 border-[#151515]">
                        <div className="w-3 h-3 rounded-full bg-[#EC4899] border border-[#151515]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FBBF24] border border-[#151515]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#3BBB96] border border-[#151515]"></div>
                        <span className="ml-2 font-['JetBrains_Mono'] text-[11px] font-[600] text-[#505050]">velocis-agent-runtime</span>
                    </div>

                    {/* Terminal Body */}
                    <div className="p-4 font-['JetBrains_Mono'] font-[500] text-[12px] leading-[22px] bg-[#FFFFFF] min-h-[110px]">
                        <div className="overflow-hidden">
                            {terminalLines >= 1 && <div className="animate-[fadeInUp_0.3s_ease_forwards]"><span className="text-[#ACACAC]">[12:04:33] </span><span className="text-[var(--brand-accent)] font-bold">SENTINEL</span><span className="text-[#151515]"> PR #12 reviewed </span><span className="text-[var(--status-success)]">✓</span></div>}
                            {terminalLines >= 2 && <div className="animate-[fadeInUp_0.3s_ease_forwards]"><span className="text-[#ACACAC]">[12:04:41] </span><span className="text-[var(--brand-accent-secondary)] font-bold">FORTRESS</span><span className="text-[#151515]"> 3 tests healed </span><span className="text-[var(--status-success)]">✓</span></div>}
                            {terminalLines >= 3 && <div className="animate-[fadeInUp_0.3s_ease_forwards]"><span className="text-[#ACACAC]">[12:04:52] </span><span className="text-[var(--brand-accent)] font-bold">V.CORTEX</span><span className="text-[#151515]"> Arch map updated </span><span className="text-[var(--status-success)]">✓</span></div>}
                            {terminalLines >= 4 && (
                                <div className="animate-[fadeInUp_0.3s_ease_forwards] flex items-center">
                                    <span className="text-[var(--brand-accent)] font-bold">➜ </span>
                                    <span className="ml-2 text-[#151515]">All systems nominal.</span>
                                    <span className="auth-cursor ml-1">_</span>
                                </div>
                            )}
                            {terminalLines < 4 && (
                                <div className="flex items-center">
                                    <span className="text-[var(--brand-accent)] font-bold">➜ </span>
                                    <span className="auth-cursor ml-1">_</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

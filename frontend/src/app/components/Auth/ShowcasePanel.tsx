import React from 'react';

export const ShowcasePanel: React.FC = () => {
    return (
        <div className="hidden lg:flex w-[60%] h-full bg-[#F7F7F7] relative overflow-hidden flex-col items-center justify-center p-12">

            {/* Background Glows (Bleeding Gradients) */}
            <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-[var(--brand-accent)] rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.15] animate-pulse"></div>
            <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-[var(--brand-accent-secondary)] rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.15] animate-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Subtle Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.03] z-0" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="#151515" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotGrid)" />
            </svg>

            {/* Central Showcase Area (Overlapping Cards) */}
            <div className="relative z-10 w-full max-w-[700px] h-[550px flex items-center justify-center">

                {/* Visual Cortex Card (Back Layer) */}
                <div className="absolute top-[5%] -left-[5%] w-[400px] h-[280px] bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] rounded-2xl p-6 transform rotate-[-3deg] hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-500 ease-out cursor-default">
                    <div className="flex items-center gap-3 mb-4 border-b border-[#EEEEEE] pb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        <h3 className="font-['Inter'] font-[700] text-[16px] text-[#151515]">Visual Cortex Map</h3>
                        <span className="ml-auto flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-accent)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-accent)]"></span>
                        </span>
                    </div>
                    {/* Abstract Graph Representation */}
                    <div className="relative w-full h-[180px] rounded-lg bg-[#F7F7F7] border border-[#EEEEEE] overflow-hidden flex items-center justify-center">
                        <svg className="w-full h-full opacity-60" viewBox="0 0 350 180" fill="none">
                            <path d="M50 90 Q 175 10 300 90 T 350 180" stroke="var(--brand-accent)" strokeWidth="2" strokeDasharray="5 5" className="animate-dash-flow" />
                            <circle cx="50" cy="90" r="6" fill="#151515" />
                            <circle cx="175" cy="50" r="8" fill="var(--brand-accent)" />
                            <circle cx="300" cy="90" r="6" fill="var(--brand-accent-secondary)" />
                            <path d="M175 50 L 250 140" stroke="#EEEEEE" strokeWidth="2" />
                            <circle cx="250" cy="140" r="5" fill="#151515" />
                        </svg>
                    </div>
                </div>

                {/* Sentinel Code Card (Front Layer) */}
                <div className="absolute bottom-[5%] -right-[5%] w-[420px] h-[300px] bg-white/95 backdrop-blur-2xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-2xl p-6 transform rotate-[2deg] hover:rotate-0 hover:scale-[1.03] hover:z-30 transition-all duration-500 ease-out cursor-default z-20">
                    <div className="flex items-center gap-3 mb-4 border-b border-[#EEEEEE] pb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <h3 className="font-['Inter'] font-[700] text-[16px] text-[#151515]">Sentinel Review</h3>
                        <div className="ml-auto px-3 py-1 rounded-full bg-[#F3E8FF] text-[var(--brand-accent-secondary)] font-['Inter'] font-bold text-[10px] tracking-wider uppercase">
                            Analysis Complete
                        </div>
                    </div>
                    {/* Fake Code Block */}
                    <div className="font-['JetBrains_Mono'] text-[12px] leading-[20px] bg-[#151515] text-[#E5E5E5] p-4 rounded-xl shadow-inner overflow-hidden relative">
                        {/* Traffic light buttons */}
                        <div className="flex gap-1.5 mb-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#EC4899]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#3BBB96]"></div>
                        </div>
                        <div className="text-[var(--brand-accent-secondary)]">export const</div> <div className="inline">analyzePayload</div> = (data: <div className="inline text-[#3BBB96]">Payload</div>) =&gt; {'{'}
                        <div className="pl-4 mt-1 text-[#ACACAC]">// AI Security scanning...</div>
                        <div className="pl-4">const threatLevel = scan(data);</div>
                        <div className="pl-4 mt-1">if (threatLevel &gt; <div className="inline text-[#3BBB96]">0</div>) {'{'}</div>
                        <div className="pl-8 text-[#EC4899]">throw new Error("Invalid structure");</div>
                        <div className="pl-4">{'}'}</div>
                        <div className="pl-4 text-[var(--brand-accent-secondary)]">return <div className="inline text-[#E5E5E5]">true;</div></div>
                        <div>{'}'}</div>
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#151515] to-transparent pointer-events-none"></div>
                    </div>
                </div>

            </div>

            {/* Social Proof Marquee Area */}
            <div className="absolute bottom-0 left-0 w-full border-t border-[#EEEEEE] bg-white/50 backdrop-blur-md py-6 z-10">
                <p className="text-center font-['Inter'] font-[600] text-[12px] text-[#ACACAC] uppercase tracking-[0.2em] mb-4">
                    Trusted by innovative engineering teams
                </p>

                {/* Simple CSS scrolling marquee */}
                <div className="flex overflow-hidden w-full select-none" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
                    <div className="flex items-center justify-around min-w-full shrink-0 gap-16 animate-[marquee_30s_linear_infinite] px-8">
                        {/* Fake tech company styled text logos for representation without needing exact SVGs */}
                        <div className="font-['Inter'] font-[800] text-[20px] text-[#151515] tracking-tighter opacity-70 grayscale">AcmeCorp</div>
                        <div className="font-['Inter'] font-[900] text-[22px] text-[#151515] italic opacity-70 grayscale">Vercel</div>
                        <div className="font-['Space_Grotesk'] font-[700] text-[24px] text-[#151515] tracking-widest opacity-70 grayscale">STRIPE</div>
                        <div className="font-serif font-[700] text-[22px] text-[#151515] opacity-70 grayscale">Scale</div>
                        <div className="font-['Inter'] font-[800] text-[20px] text-[#151515] tracking-tight opacity-70 grayscale">Raycast</div>
                        <div className="font-[monospace] font-[700] text-[20px] text-[#151515] opacity-70 grayscale">LINEAR</div>
                    </div>
                    {/* Duplicate for seamless loop */}
                    <div className="flex items-center justify-around min-w-full shrink-0 gap-16 animate-[marquee_30s_linear_infinite] px-8" aria-hidden="true">
                        <div className="font-['Inter'] font-[800] text-[20px] text-[#151515] tracking-tighter opacity-70 grayscale">AcmeCorp</div>
                        <div className="font-['Inter'] font-[900] text-[22px] text-[#151515] italic opacity-70 grayscale">Vercel</div>
                        <div className="font-['Space_Grotesk'] font-[700] text-[24px] text-[#151515] tracking-widest opacity-70 grayscale">STRIPE</div>
                        <div className="font-serif font-[700] text-[22px] text-[#151515] opacity-70 grayscale">Scale</div>
                        <div className="font-['Inter'] font-[800] text-[20px] text-[#151515] tracking-tight opacity-70 grayscale">Raycast</div>
                        <div className="font-[monospace] font-[700] text-[20px] text-[#151515] opacity-70 grayscale">LINEAR</div>
                    </div>
                </div>
            </div>

            <style>
                {`
               @keyframes marquee {
                 0% { transform: translateX(0%); }
                 100% { transform: translateX(-100%); }
               }
            `}
            </style>
        </div>
    );
};

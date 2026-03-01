import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { Github, Check } from 'lucide-react';

export const AuthPage: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.fade-up',
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const handleGitHubAuth = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            navigate('/onboarding');
        }, 1200);
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white to-[#F0F2F5] text-[#111827] font-['Inter'] flex flex-col relative overflow-y-auto">
            {/* Header / Logo */}
            <div className="w-full py-6 px-8 flex justify-start items-center absolute top-0 left-0 bg-transparent">
                <div className="font-extrabold text-[22px] tracking-tight cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
                    Velocis.
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-6 px-4">

                {/* Headlines */}
                <div className="max-w-[700px] text-center mb-6 fade-up">
                    <h1 className="text-[38px] leading-[1.1] font-extrabold tracking-tight text-[#111827] mb-3">
                        Let Your Repo Meet<br />Its Senior Engineer
                    </h1>
                    <p className="text-[15px] text-[#4B5563] leading-relaxed max-w-[550px] mx-auto">
                        Velocis connects securely to your GitHub to analyze code, monitor changes, and operate autonomously. No passwords. No manual setup. Just OAuth.
                    </p>
                </div>

                {/* Dark Auth Card */}
                <div className="auth-card w-full max-w-[500px] bg-gradient-to-b from-[#374151]/95 to-[#1F2937]/95 backdrop-blur-3xl rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-white/10 relative flex flex-col overflow-hidden fade-up text-left">

                    {/* Card Header */}
                    <div className="w-full py-4 border-b border-white/5 bg-white/5 flex items-center justify-center gap-2">
                        <Github size={18} className="text-white" />
                        <span className="text-white font-semibold text-[14px]">GitHub Verified Connection</span>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 pb-5 flex flex-col">
                        <button
                            onClick={handleGitHubAuth}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#10B981] hover:from-[#16A34A] hover:to-[#059669] text-white py-3.5 rounded-[12px] font-semibold text-[16px] transition-all duration-300 relative overflow-hidden group shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)]"
                        >
                            {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <Github size={20} />
                                    Connect with GitHub
                                </>
                            )}
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        </button>

                        <p className="text-center text-[#9CA3AF] text-[11px] mt-3 mb-5 leading-relaxed px-4">
                            We only request permissions required to review code, run tests, and monitor pull requests.
                        </p>

                        <div className="mb-2">
                            <h3 className="text-white font-semibold text-[13px] mb-3">Velocis will be able to:</h3>
                            <ul className="space-y-2.5">
                                {[
                                    "Read repository contents",
                                    "Monitor commits & pull requests",
                                    "Write automated test suggestions",
                                    "Create architecture insights",
                                    "Review security vulnerabilities"
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-3">
                                        <Check size={14} strokeWidth={3} className="text-[#10B981]" />
                                        <span className="text-[#D1D5DB] text-[13px]">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Pills/Tags */}
                        <div className="flex items-center justify-center gap-5 mt-6 mb-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                                <span className="text-white font-medium text-[13px]">Autonomous</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                                <span className="text-white font-medium text-[13px]">Secure</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
                                <span className="text-white font-medium text-[13px]">Production-Ready</span>
                            </div>
                        </div>
                    </div>

                    {/* Card Footer */}
                    <div className="bg-black/20 backdrop-blur-md py-3 px-6 text-center border-t border-white/5">
                        <p className="text-[#6B7280] text-[10px]">
                            Velocis operates only where you have access. You remain in control at all times.
                        </p>
                    </div>
                </div>

                {/* Page Footer */}
                <div className="mt-6 text-[#6B7280] text-[11px] flex items-center gap-3 fade-up">
                    <span className="cursor-pointer hover:text-gray-900 transition-colors">Privacy</span>
                    <span>•</span>
                    <span className="cursor-pointer hover:text-gray-900 transition-colors">Security</span>
                    <span>•</span>
                    <span className="cursor-pointer hover:text-gray-900 transition-colors">GitHub Permissions Info</span>
                    <span>•</span>
                    <span className="cursor-pointer hover:text-gray-900 transition-colors">Contact</span>
                </div>

            </div>
            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default AuthPage;

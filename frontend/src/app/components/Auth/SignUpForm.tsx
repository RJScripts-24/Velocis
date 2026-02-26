import React, { useState } from 'react';
import { useNavigate } from 'react-router';

type SignUpFormProps = {
    onSwitchLogin: () => void;
};

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSwitchLogin }) => {
    const navigate = useNavigate();
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleGitHubSignUp = () => {
        if (!agreed) {
            alert("Please agree to the Terms of Service.");
            return;
        }
        setIsLoading(true);
        // Mock signup process
        setTimeout(() => {
            setIsLoading(false);
            navigate('/select-repo'); // Navigate to the new repo selection page
        }, 1000);
    };

    return (
        <div className="form-enter form-enter-active w-full">
            <div className="mb-7">
                <h1 className="font-['Inter'] font-[800] text-[32px] text-[var(--text-auth-primary)] tracking-tight mb-1.5">
                    Create account
                </h1>
                <p className="font-['Inter'] font-[500] text-[15px] text-[var(--text-auth-secondary)]">
                    Start shipping smarter with AI agents
                </p>
            </div>

            <button
                type="button"
                className="auth-github-btn mb-7 w-full flex justify-center items-center"
                onClick={handleGitHubSignUp}
                disabled={isLoading}
            >
                {isLoading ? (
                    <span className="auth-spinner mr-2"></span>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-3">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                )}
                Sign up with GitHub
            </button>

            <div className="flex items-start gap-2.5 mt-1 mb-6 relative">
                <div
                    className="w-[20px] h-[20px] rounded-[6px] border flex items-center justify-center cursor-pointer shrink-0 mt-0.5 transition-colors"
                    style={{
                        background: agreed ? 'var(--brand-primary)' : 'var(--bg-input)',
                        borderColor: agreed ? 'var(--brand-primary)' : 'var(--border-active)'
                    }}
                    onClick={() => setAgreed(!agreed)}
                >
                    {agreed && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    )}
                </div>
                <span className="font-['Inter'] font-[500] text-[14px] text-[var(--text-auth-secondary)] leading-relaxed relative z-10">
                    I agree to the <a href="#" className="font-[700] text-[var(--text-auth-link)] hover:underline">Terms of Service</a> and <a href="#" className="font-[700] text-[var(--text-auth-link)] hover:underline">Privacy Policy</a>
                </span>

                {/* Decorative abstract SVG behind the checkbox text */}
                <svg className="absolute -left-2 top-0 text-[var(--brand-accent)] opacity-10 animate-float pointer-events-none" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
            </div>

            <div className="mt-8 text-center text-[14px]">
                <span className="text-[var(--text-auth-secondary)]">Already have an account? </span>
                <button onClick={onSwitchLogin} type="button" className="text-[var(--text-auth-link)] font-[700] hover:underline bg-transparent border-none cursor-pointer p-0">
                    Log in
                </button>
            </div>
        </div>
    );
};

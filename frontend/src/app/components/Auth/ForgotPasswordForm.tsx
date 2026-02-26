import React, { useState, useEffect } from 'react';
import { InputField } from './InputField';

type ForgotPasswordFormProps = {
    onBack: () => void;
};

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [countdown, setCountdown] = useState(60);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (submitted && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [submitted, countdown]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setSubmitted(true);
        }, 1500);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (submitted) {
        return (
            <div className="form-enter form-enter-active w-full text-center flex flex-col items-center">
                <div className="relative mb-6">
                    <svg className="relative z-10" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--status-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>

                <h2 className="font-['Inter'] font-[800] tracking-tight text-[28px] text-[var(--text-auth-primary)] mb-2">Check your inbox</h2>
                <p className="font-['Inter'] font-[500] text-[15px] text-[var(--text-auth-secondary)] mb-8">
                    A reset link has been sent to {email}
                </p>

                <button
                    type="button"
                    disabled={countdown > 0}
                    className="bg-transparent border-2 border-[var(--border-active)] rounded-[8px] px-6 py-3.5 text-[15px] font-['Inter'] font-[700] text-[var(--text-auth-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                    onClick={() => setCountdown(60)}
                >
                    {countdown > 0 ? `Resend in ${formatTime(countdown)}` : 'Resend email'}
                </button>

                <button
                    type="button"
                    onClick={onBack}
                    className="mt-6 text-[14px] font-['Inter'] font-[700] text-[var(--text-auth-link)] bg-transparent border-none cursor-pointer hover:underline"
                >
                    ← Back to login
                </button>
            </div>
        );
    }

    return (
        <div className="form-enter form-enter-active w-full">
            <button
                type="button"
                onClick={onBack}
                className="mb-6 text-[14px] font-['Inter'] font-[700] text-[var(--text-auth-link)] bg-transparent border-none cursor-pointer hover:underline flex items-center gap-1"
            >
                <span>←</span> Back to login
            </button>

            <div className="mb-7">
                <h1 className="font-['Inter'] font-[800] tracking-tight text-[32px] text-[var(--text-auth-primary)] mb-1.5">
                    Reset password
                </h1>
                <p className="font-['Inter'] font-[500] text-[15px] text-[var(--text-auth-secondary)]">
                    Enter your email and we'll send you a reset link
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <InputField
                    label="Email address"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <button
                    type="submit"
                    className="w-full p-[14px] rounded-[8px] mt-2 text-white font-['Inter'] font-[700] text-[15px] border-none cursor-pointer transition-all hover:bg-opacity-90 flex justify-center items-center h-[48px]"
                    style={{ background: 'var(--brand-primary)' }}
                    disabled={isLoading}
                >
                    {isLoading ? <span className="auth-spinner"></span> : 'Send Reset Link'}
                </button>
            </form>
        </div>
    );
};

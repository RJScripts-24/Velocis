import React, { useState } from 'react';
import { AuthTabs } from './AuthTabs';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type FormState = 'login' | 'signup' | 'forgot';

export const FormPanel: React.FC = () => {
    const [formState, setFormState] = useState<FormState>('login');

    return (
        <div className="w-full lg:w-[40%] flex flex-col items-center justify-center bg-white min-h-screen relative p-8">

            {/* Logo area */}
            <div className="flex items-center gap-2 mb-10 w-full max-w-[380px]">
                <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 0L0 16.5H10.5L9 30L24 12H13.5V0Z" fill="var(--brand-accent)" />
                </svg>
                <h1 className="font-['Inter'] font-[800] text-[24px] text-[var(--text-auth-primary)] tracking-tight">
                    VELOCIS
                </h1>
            </div>

            <div className="relative z-10 w-full max-w-[380px] flex flex-col">
                <div className="w-full">
                    {formState !== 'forgot' && (
                        <div className="mb-6">
                            <AuthTabs
                                activeTab={formState as 'login' | 'signup'}
                                onSwitch={(tab) => setFormState(tab)}
                            />
                        </div>
                    )}

                    <div key={formState} className="animate-fade-in-up">
                        {formState === 'login' && <LoginForm onForgot={() => setFormState('forgot')} onSwitchSignUp={() => setFormState('signup')} />}
                        {formState === 'signup' && <SignUpForm onSwitchLogin={() => setFormState('login')} />}
                        {formState === 'forgot' && <ForgotPasswordForm onBack={() => setFormState('login')} />}
                    </div>
                </div>
            </div>

            {/* Simple footer link */}
            <div className="mt-12 text-[12px] text-[#ACACAC] font-['Inter'] w-full max-w-[380px]">
                Protected by Enterprise Grade Security
            </div>
        </div>
    );
};

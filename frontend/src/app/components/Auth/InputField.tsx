import React, { useState } from 'react';

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    rightLabelSlot?: React.ReactNode;
    showToggle?: boolean;
};

export const InputField: React.FC<InputFieldProps> = ({
    label,
    error,
    rightLabelSlot,
    showToggle,
    type,
    ...rest
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const inputType = showToggle && showPassword ? 'text' : type;

    return (
        <div className="mb-4 w-full">
            <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-[var(--text-auth-secondary)]">
                    {label}
                </label>
                {rightLabelSlot && (
                    <div className="text-[13px] font-medium text-[var(--text-auth-link)] hover:underline cursor-pointer">
                        {rightLabelSlot}
                    </div>
                )}
            </div>

            <div className="relative">
                <input
                    type={inputType}
                    className={`auth-input-field ${error ? 'error' : ''}`}
                    {...rest}
                />

                {showToggle && (
                    <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-auth-muted)] hover:text-[var(--text-auth-secondary)] transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            // Eye off
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        ) : (
                            // Eye
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        )}
                    </button>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[var(--status-error)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {error}
                </div>
            )}
        </div>
    );
};

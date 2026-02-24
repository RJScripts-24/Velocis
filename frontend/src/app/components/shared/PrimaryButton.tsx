import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    /** Optional icon on the left */
    icon?: React.ReactNode;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Full width */
    fullWidth?: boolean;
}

const sizeMap = {
    sm: 'px-4 py-2 text-[13px] gap-1.5',
    md: 'px-5 py-2.5 text-[15px] gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
} as const;

export function PrimaryButton({
    children,
    icon,
    size = 'md',
    fullWidth = false,
    className = '',
    ...props
}: PrimaryButtonProps) {
    return (
        <button
            className={`
        inline-flex items-center justify-center font-medium
        rounded-[10px] cursor-pointer select-none
        bg-[--cta-primary] text-[--cta-text]
        v-btn-hover hover:bg-[--cta-primary-hover] hover:shadow-lg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${sizeMap[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim()}
            {...props}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </button>
    );
}

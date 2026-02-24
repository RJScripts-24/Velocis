import React from 'react';

interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    icon?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
    sm: 'px-3 py-1.5 text-[13px] gap-1.5',
    md: 'px-4 py-2 text-[15px] gap-2',
    lg: 'px-6 py-3 text-base gap-2',
} as const;

export function GhostButton({
    children,
    icon,
    size = 'md',
    className = '',
    ...props
}: GhostButtonProps) {
    return (
        <button
            className={`
        inline-flex items-center justify-center font-medium
        rounded-[10px] cursor-pointer select-none
        text-[--text-secondary] bg-transparent
        hover:text-[--text-primary] hover:bg-[--bg-soft]
        transition-colors duration-[--duration-fast]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeMap[size]}
        ${className}
      `.trim()}
            {...props}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </button>
    );
}

import React from 'react';

interface SoftPanelProps {
    children: React.ReactNode;
    /** Accent color for the subtle tint */
    accent?: 'green' | 'purple' | 'blue' | 'neutral';
    /** Padding size */
    padding?: 'sm' | 'md' | 'lg';
    className?: string;
}

const accentMap = {
    green: 'bg-[--accent-green-soft]/30',
    purple: 'bg-[--accent-purple-soft]/30',
    blue: 'bg-[--accent-blue-soft]/30',
    neutral: 'bg-[--bg-soft]',
} as const;

const paddingMap = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
} as const;

export function SoftPanel({
    children,
    accent = 'neutral',
    padding = 'md',
    className = '',
}: SoftPanelProps) {
    return (
        <div
            className={`
        rounded-[--radius-xl] ${accentMap[accent]} ${paddingMap[padding]}
        ${className}
      `.trim()}
        >
            {children}
        </div>
    );
}

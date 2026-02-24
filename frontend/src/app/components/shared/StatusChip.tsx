import React from 'react';

type StatusVariant = 'healthy' | 'warning' | 'critical' | 'neutral' | 'info';

interface StatusChipProps {
    label: string;
    variant?: StatusVariant;
    /** Custom dot color (overrides variant) */
    dotColor?: string;
    size?: 'sm' | 'md';
    className?: string;
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; dot: string }> = {
    healthy: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
    },
    warning: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
    },
    critical: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        dot: 'bg-red-500',
    },
    neutral: {
        bg: 'bg-[--bg-soft]',
        text: 'text-[--text-secondary]',
        dot: 'bg-[--text-tertiary]',
    },
    info: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
    },
};

const sizeMap = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-[12px]',
} as const;

export function StatusChip({
    label,
    variant = 'neutral',
    dotColor,
    size = 'md',
    className = '',
}: StatusChipProps) {
    const styles = variantStyles[variant];

    return (
        <span
            className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${styles.bg} ${styles.text} ${sizeMap[size]}
        ${className}
      `.trim()}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full ${dotColor ? '' : styles.dot}`}
                style={dotColor ? { backgroundColor: dotColor } : undefined}
            />
            {label}
        </span>
    );
}

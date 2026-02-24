import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
    label: string;
    value: string | number;
    /** Optional trend: positive, negative, or neutral */
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    icon?: React.ReactNode;
    className?: string;
}

export function MetricCard({
    label,
    value,
    trend,
    trendValue,
    icon,
    className = '',
}: MetricCardProps) {
    const trendColor = {
        up: 'text-emerald-600',
        down: 'text-red-500',
        neutral: 'text-[--text-tertiary]',
    };

    const TrendIcon = {
        up: TrendingUp,
        down: TrendingDown,
        neutral: Minus,
    };

    return (
        <div
            className={`
        bg-white rounded-[--radius-lg] border border-[--border-subtle]
        p-5 flex flex-col gap-2
        shadow-[--shadow-xs] v-card-hover
        ${className}
      `.trim()}
        >
            <div className="flex items-center justify-between">
                <span className="text-[13px] text-[--text-secondary] font-medium">
                    {label}
                </span>
                {icon && (
                    <span className="text-[--text-tertiary]">{icon}</span>
                )}
            </div>

            <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold text-[--text-primary] tracking-tight">
                    {value}
                </span>
                {trend && trendValue && (
                    <span className={`flex items-center gap-0.5 text-[12px] font-medium pb-0.5 ${trendColor[trend]}`}>
                        {React.createElement(TrendIcon[trend], { className: 'w-3 h-3' })}
                        {trendValue}
                    </span>
                )}
            </div>
        </div>
    );
}

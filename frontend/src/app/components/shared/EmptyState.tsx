import React from 'react';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`
        flex flex-col items-center justify-center text-center
        py-16 px-6
        ${className}
      `.trim()}
        >
            {icon && (
                <div className="w-12 h-12 rounded-full bg-[--bg-soft] flex items-center justify-center mb-4 text-[--text-tertiary]">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-[--text-primary] mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-[14px] text-[--text-secondary] max-w-sm mb-6">
                    {description}
                </p>
            )}
            {action && <div>{action}</div>}
        </div>
    );
}

import React from 'react';

interface SectionContainerProps {
  children: React.ReactNode;
  /** Background variant */
  bg?: 'primary' | 'soft' | 'dark';
  /** Vertical spacing */
  spacing?: 'major' | 'medium' | 'compact' | 'none';
  /** Full-bleed background (content still contained) */
  fullBleed?: boolean;
  /** Additional className for the outer wrapper */
  className?: string;
  /** HTML element to render */
  as?: 'section' | 'div' | 'article' | 'aside';
  /** Accessible label */
  'aria-label'?: string;
}

const bgMap = {
  primary: 'bg-[--bg-primary]',
  soft: 'bg-[--bg-soft]',
  dark: 'bg-[--bg-dark] text-[--text-inverse]',
} as const;

const spacingMap = {
  major: 'v-section-major',
  medium: 'v-section-medium',
  compact: 'v-section-compact',
  none: '',
} as const;

export function SectionContainer({
  children,
  bg = 'primary',
  spacing = 'medium',
  fullBleed = false,
  className = '',
  as: Tag = 'section',
  'aria-label': ariaLabel,
}: SectionContainerProps) {
  const bgClass = bgMap[bg];
  const spacingClass = spacingMap[spacing];

  return (
    <Tag
      className={`${bgClass} ${spacingClass} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div className={fullBleed ? '' : 'v-container'}>
        {children}
      </div>
    </Tag>
  );
}

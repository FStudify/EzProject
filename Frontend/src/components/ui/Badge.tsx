import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  default: 'bg-surface-muted text-ink-secondary border border-border',
  primary: 'bg-primary-50 text-primary-dark',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-sky-50 text-sky-700',
};

export default function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-150 ${variantStyles[variant]} ${className}`.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </span>
  );
}

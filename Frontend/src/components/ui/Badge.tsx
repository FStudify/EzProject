import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, { bg: string; text: string }> = {
  default: { bg: '#f1f5f9', text: '#475569' },
  primary:  { bg: '#e6f2fa', text: '#053d7a' },
  success:  { bg: '#eff9f0', text: '#4B9331' },
  warning:  { bg: '#FDF0E8', text: '#B76442' },
  danger:   { bg: '#fef2f2', text: '#dc2626' },
  info:     { bg: '#eff6ff', text: '#1d4ed8' },
};

export default function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${className}`.trim()}
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {children}
    </span>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantStyles = {
  primary:
    'bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-sm',
  accent:
    'bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-sm',
  secondary:
    'border border-border bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink focus:ring-primary/30',
  ghost:
    'bg-transparent text-ink-secondary hover:bg-surface-muted hover:text-ink focus:ring-primary/20',
  danger:
    'bg-danger text-white hover:bg-red-700 focus:ring-danger shadow-sm',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

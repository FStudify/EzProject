import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingMap = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border bg-surface transition-all duration-200 ${paddingMap[padding]} ${className}`.trim()}
      style={{
        borderColor: '#E8D8CF',
        boxShadow: '0 18px 30px -24px rgba(38, 24, 16, 0.6)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

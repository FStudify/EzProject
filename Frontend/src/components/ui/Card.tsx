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
      className={`ez-card ${paddingMap[padding]} ${hover ? 'ez-card-hover' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

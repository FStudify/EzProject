import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-ink-muted">
        {icon ?? <Inbox className="h-7 w-7" aria-hidden />}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

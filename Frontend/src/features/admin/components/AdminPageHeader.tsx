import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E8D8CF] pb-5 dark:border-slate-700">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F] dark:text-slate-100">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[#7D6F66] dark:text-slate-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
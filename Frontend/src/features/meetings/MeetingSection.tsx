/**
 * MeetingSection — list of MeetingCard grouped by phase (Upcoming / Ongoing / Ended).
 * Renders an empty-state hint when the section has no meetings.
 */
import type { ReactNode } from 'react';
import type { Meeting } from '@/types';
import type { MeetingCardProps } from './MeetingCard';
import MeetingCard from './MeetingCard';

export interface MeetingSectionProps extends Omit<MeetingCardProps, 'meeting'> {
  title: string;
  icon: ReactNode;
  emptyHint: string;
  meetings: Meeting[];
}

export default function MeetingSection(props: MeetingSectionProps) {
  const { title, icon, emptyHint, meetings, ...rest } = props;
  if (meetings.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-surface/40 p-4">
        <header className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-muted">
          {icon}
          <span>{title}</span>
          <span className="ml-1 rounded-full bg-ink-muted/10 px-2 py-0.5 text-[11px]">0</span>
        </header>
        <p className="text-xs text-ink-muted">{emptyHint}</p>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        <span>{title}</span>
        <span className="ml-1 rounded-full bg-ink-muted/10 px-2 py-0.5 text-[11px] text-ink-muted">
          {meetings.length}
        </span>
      </header>
      <div className="space-y-3">
        {meetings.map((m) => (
          <MeetingCard key={m.id} meeting={m} {...rest} />
        ))}
      </div>
    </section>
  );
}

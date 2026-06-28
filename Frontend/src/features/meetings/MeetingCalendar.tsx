import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, LayoutList } from 'lucide-react';
import type { Meeting } from '@/types';
import type { MeetingStatus2 } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui';

type CalendarView = 'month' | 'week' | 'day';

const STATUS_COLORS: Record<MeetingStatus2, { bg: string; text: string; dot: string }> = {
  scheduled: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function getDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface MeetingCalendarProps {
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
  onCreateMeeting?: () => void;
}

export default function MeetingCalendar({ meetings, onSelectMeeting, onCreateMeeting }: MeetingCalendarProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<CalendarView>('month');
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const goToday = () => {
    const now = new Date();
    setCurrent({ year: now.getFullYear(), month: now.getMonth() });
  };

  const goPrev = () => {
    if (view === 'month') {
      setCurrent((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
    } else if (view === 'week') {
      const d = new Date(current.year, current.month, 1);
      d.setDate(d.getDate() - 7);
      setCurrent({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const d = new Date(current.year, current.month, 1);
      d.setDate(d.getDate() - 1);
      setCurrent({ year: d.getFullYear(), month: d.getMonth() });
    }
  };

  const goNext = () => {
    if (view === 'month') {
      setCurrent((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
    } else if (view === 'week') {
      const d = new Date(current.year, current.month, 1);
      d.setDate(d.getDate() + 7);
      setCurrent({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const d = new Date(current.year, current.month, 1);
      d.setDate(d.getDate() + 1);
      setCurrent({ year: d.getFullYear(), month: d.getMonth() });
    }
  };

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    for (const m of meetings) {
      const dateStr = new Date(m.startTime).toDateString();
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(m);
    }
    return map;
  }, [meetings]);

  const monthLabel = new Date(current.year, current.month).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  // ── Month View ────────────────────────────────────────────────────────────────
  const monthWeeks = useMemo(() => {
    const firstDay = new Date(current.year, current.month, 1);
    const lastDay = new Date(current.year, current.month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(current.year, current.month, d));
    while (days.length % 7 !== 0) days.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, [current.year, current.month]);

  const today = new Date();
  const todayStr = today.toDateString();

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // ── Week View ─────────────────────────────────────────────────────────────────
  const weekDaysFull = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDates = useMemo(() => {
    const firstDay = new Date(current.year, current.month, 1);
    const startDow = (firstDay.getDay() + 6) % 7;
    const startDate = 1 - startDow;
    return Array.from({ length: 7 }, (_, i) => new Date(current.year, current.month, startDate + i));
  }, [current.year, current.month]);

  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const weekMeetings = useMemo(() => {
    return weekDates.map((d) => ({
      date: d,
      meetings: meetings.filter((m) => new Date(m.startTime).toDateString() === d.toDateString()),
    }));
  }, [weekDates, meetings]);

  // ── Day View ──────────────────────────────────────────────────────────────────
  const dayDate = new Date(current.year, current.month, 1);
  const dayLabel = dayDate.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dayMeetings = meetings.filter((m) => new Date(m.startTime).toDateString() === dayDate.toDateString());

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-strong hover:text-ink transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-strong hover:text-ink transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <h3 className="text-base font-semibold text-ink">
            {view === 'month' ? monthLabel : view === 'week' ? weekLabel : dayLabel}
          </h3>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-strong transition-colors"
          >
            {t('today')}
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setView('month')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'month' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            {t('month')}
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'week' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <CalendarRange className="h-4 w-4" />
            {t('week')}
          </button>
          <button
            type="button"
            onClick={() => setView('day')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'day' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <LayoutList className="h-4 w-4" />
            {t('day')}
          </button>
        </div>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border bg-surface">
            {weekDays.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-ink-muted">
                {d}
              </div>
            ))}
          </div>
          {/* Weeks */}
          {monthWeeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
              {week.map((day, di) => {
                const dateStr = day ? day.toDateString() : '';
                const isToday = dateStr === todayStr;
                const dayMeetings = meetingsByDate[dateStr] ?? [];
                return (
                  <div
                    key={di}
                    className={`min-h-[96px] border-r border-border last:border-r-0 p-1.5 ${
                      day ? 'bg-white hover:bg-surface' : 'bg-surface/50'
                    }`}
                  >
                    {day && (
                      <>
                        <div
                          className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            isToday ? 'bg-primary text-white' : 'text-ink-muted'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayMeetings.slice(0, 3).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => onSelectMeeting(m)}
                              className={`w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${STATUS_COLORS[m.status].bg} ${STATUS_COLORS[m.status].text}`}
                              title={`${m.title} (${formatTime(m.startTime)})`}
                            >
                              {m.title}
                            </button>
                          ))}
                          {dayMeetings.length > 3 && (
                            <p className="pl-1.5 text-[10px] text-ink-muted">
                              +{dayMeetings.length - 3} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {weekMeetings.map(({ date, meetings: dm }, i) => {
              const isToday = date.toDateString() === todayStr;
              return (
                <div key={i} className={`border-r border-border last:border-r-0 ${isToday ? 'bg-primary/5' : 'bg-surface'}`}>
                  <div className="border-b border-border p-2 text-center">
                    <p className="text-xs font-semibold text-ink-muted uppercase">{weekDaysFull[i]}</p>
                    <div className={`mt-0.5 mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-primary text-white' : 'text-ink'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto p-1.5 space-y-1">
                    {dm.length === 0 && (
                      <p className="text-center text-[11px] text-ink-muted py-4">—</p>
                    )}
                    {dm.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectMeeting(m)}
                        className={`w-full rounded-lg border-l-2 px-2 py-1.5 text-left transition-opacity hover:opacity-80 ${STATUS_COLORS[m.status].bg} ${STATUS_COLORS[m.status].text}`}
                      >
                        <p className="text-[11px] font-semibold truncate">{formatTime(m.startTime)}</p>
                        <p className="text-xs font-medium truncate">{m.title}</p>
                        <p className="text-[10px] opacity-75">{getDuration(m.startTime, m.endTime)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="border-b border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-lg font-bold`}>
                {dayDate.getDate()}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{dayLabel}</p>
                <p className="text-xs text-ink-muted">
                  {dayMeetings.length} {dayMeetings.length === 1 ? 'meeting' : 'meetings'}
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {dayMeetings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="h-12 w-12 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-ink-muted">{t('no_meetings')}</p>
                {onCreateMeeting && (
                  <Button variant="accent" size="sm" className="mt-3" onClick={onCreateMeeting}>
                    {t('new_meeting')}
                  </Button>
                )}
              </div>
            )}
            {dayMeetings
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMeeting(m)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
                >
                  <div className="flex flex-col items-center pt-0.5">
                    <span className="text-sm font-semibold text-ink">{formatTime(m.startTime)}</span>
                    <span className="text-xs text-ink-muted">{formatTime(m.endTime)}</span>
                  </div>
                  <div className={`ml-2 h-full w-0.5 rounded-full ${STATUS_COLORS[m.status].dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{m.title}</p>
                    {m.description && (
                      <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{m.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[m.status].bg} ${STATUS_COLORS[m.status].text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[m.status].dot}`} />
                        {t(m.status.replace('_', '_'))}
                      </span>
                      <span className="text-[11px] text-ink-muted">{getDuration(m.startTime, m.endTime)}</span>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

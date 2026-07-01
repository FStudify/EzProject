import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  tone?: 'accent' | 'positive' | 'muted';
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fieldLabelClass = 'mb-1 block text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-secondary';

const toneDotClass: Record<NonNullable<SelectOption['tone']>, string> = {
  accent: 'bg-primary',
  positive: 'bg-emerald-500',
  muted: 'bg-slate-300',
};

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDateOutOfRange(date: Date, minDate: Date | null, maxDate: Date | null) {
  if (minDate && date < minDate) return true;
  if (maxDate && date > maxDate) return true;
  return false;
}

interface PolishedSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  size?: 'default' | 'compact';
  className?: string;
  disabled?: boolean;
}

export function PolishedSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  helperText,
  required = false,
  size = 'default',
  className = '',
  disabled = false,
}: PolishedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const triggerSizeClass = size === 'compact' ? 'h-9 text-[13px]' : 'h-10 text-sm';
  const optionSizeClass = size === 'compact' ? 'py-1.5 text-[13px]' : 'py-2 text-sm';

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <label className={fieldLabelClass}>
        {label}
        {required && <span className="text-[#C86B5C]"> *</span>}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-left text-[#1F1F1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-150 hover:border-border-strong hover:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/14 ${triggerSizeClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${selectedOption ? 'text-[#1F1F1F]' : 'text-[#908175]'}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#957E6F] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {helperText && <p className="mt-1 text-xs text-[#7D6D62]">{helperText}</p>}

      {isOpen && (
        <div className="ez-task-scrollbar absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-56 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-[0_18px_30px_-20px_rgba(63,39,24,0.58)]">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left transition-colors ${optionSizeClass} ${
                  isSelected
                    ? 'bg-primary-50 text-[#1F1F1F]'
                    : 'text-ink-secondary hover:bg-surface-muted'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${toneDotClass[option.tone ?? 'muted']}`}
                    aria-hidden
                  />
                  <span>{option.label}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  helperText?: string;
  size?: 'default' | 'compact';
  className?: string;
  disabled?: boolean;
}

export function DatePickerField({
  label,
  value,
  onChange,
  required = false,
  min,
  max,
  helperText,
  size = 'default',
  className = '',
  disabled = false,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [today] = useState(() => normalizeDate(new Date()));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const minDate = useMemo(() => {
    const parsed = parseDateValue(min ?? '');
    return parsed ? normalizeDate(parsed) : null;
  }, [min]);
  const maxDate = useMemo(() => {
    const parsed = parseDateValue(max ?? '');
    return parsed ? normalizeDate(parsed) : null;
  }, [max]);

  const [monthCursor, setMonthCursor] = useState(() => {
    const base = selectedDate ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const triggerSizeClass = size === 'compact' ? 'h-9 text-[13px]' : 'h-10 text-sm';
  const calendarPanelWidthClass = size === 'compact' ? 'w-[252px]' : 'w-[272px]';
  const calendarDaySizeClass = size === 'compact' ? 'py-1 text-[11px]' : 'py-1.5 text-xs';

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const days = useMemo(() => {
    const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const offset = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - offset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [monthCursor]);

  const displayDate = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select date';

  const changeMonth = (delta: number) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDate = (date: Date) => {
    const normalized = normalizeDate(date);
    if (isDateOutOfRange(normalized, minDate, maxDate)) return;
    setMonthCursor(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
    onChange(formatDateValue(normalized));
    setIsOpen(false);
  };

  const selectToday = () => {
    if (isDateOutOfRange(today, minDate, maxDate)) return;
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    onChange(formatDateValue(today));
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <label className={fieldLabelClass}>
        {label}
        {required && <span className="text-[#C86B5C]"> *</span>}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-left text-[#1F1F1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-150 hover:border-border-strong hover:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/14 ${triggerSizeClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={`${selectedDate ? 'text-[#1F1F1F]' : 'text-[#908175]'}`}>{displayDate}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-[#957E6F]" />
      </button>

      {helperText && <p className="mt-1 text-xs text-[#7D6D62]">{helperText}</p>}

      {isOpen && (
        <div className={`absolute left-0 top-[calc(100%+0.35rem)] z-40 rounded-xl border border-border bg-surface p-2 shadow-[0_20px_34px_-22px_rgba(63,39,24,0.58)] ${calendarPanelWidthClass}`}>
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-[#43372F]">
              {monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 px-1">
            {WEEKDAY_LABELS.map((labelText) => (
              <span key={labelText} className="py-1 text-center text-[11px] font-medium text-[#8D7B6F]">
                {labelText}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const normalized = normalizeDate(date);
              const inCurrentMonth = date.getMonth() === monthCursor.getMonth();
              const isSelected = selectedDate ? isSameDay(normalized, selectedDate) : false;
              const isToday = isSameDay(normalized, today);
              const disabled = isDateOutOfRange(normalized, minDate, maxDate);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => selectDate(date)}
                  disabled={disabled}
                  className={`rounded-md font-medium transition-colors ${calendarDaySizeClass} ${
                    isSelected
                      ? 'bg-primary text-white shadow-[0_8px_14px_-12px_rgba(152,84,54,0.7)]'
                      : isToday
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : inCurrentMonth
                          ? 'text-ink hover:bg-surface-muted'
                          : 'text-ink-muted hover:bg-surface-muted'
                  } ${disabled ? 'cursor-not-allowed opacity-35 hover:bg-transparent' : ''}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border px-1 pt-2">
            <button
              type="button"
              onClick={selectToday}
              disabled={isDateOutOfRange(today, minDate, maxDate)}
              className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              disabled={!value}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-muted disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

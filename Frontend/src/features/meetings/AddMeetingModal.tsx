/**
 * AddMeetingModal — form to schedule a new meeting.
 * Pre-selects all project members as attendees.
 */
import { useEffect, useState } from 'react';
import { createMeeting as apiCreateMeeting } from '@/api/meeting.api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Modal } from '@/components/ui';
import type { Meeting, Member } from '@/types';

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (meeting: Meeting) => void;
  projectId: string;
  members: Member[];
  currentUserId: string;
}

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

export default function AddMeetingModal({ isOpen, onClose, onAdd, projectId, members, currentUserId }: AddMeetingModalProps) {
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStartDate('');
      setStartTimeInput('');
      setDurationMinutes(60);
      setMeetingType('online');
      setLocation('');
      setMeetingLink('');
      setErrorMsg('');
      // Pre-select all members (including self) as attendees
      if (members.length > 0) {
        setAttendeeIds(members.map((m) => m.id));
      } else if (currentUserId) {
        setAttendeeIds([currentUserId]);
      } else {
        setAttendeeIds([]);
      }
    }
  }, [isOpen, members, currentUserId]);

  const validate = () => {
    if (!title.trim()) { setErrorMsg(t('title') + ' ' + t('required')); return false; }
    if (!startDate || !startTimeInput) { setErrorMsg(t('start') + ' ' + t('required')); return false; }

    const start = new Date(`${startDate}T${startTimeInput}`);
    const now = new Date();

    if (Number.isNaN(start.getTime())) { setErrorMsg(t('invalid_date')); return false; }
    if (start <= now) { setErrorMsg(t('start_must_be_future')); return false; }

    if (meetingType === 'online' && !meetingLink.trim()) {
      setErrorMsg(t('meeting_link') + ' ' + t('required')); return false;
    }
    if (meetingType === 'offline' && !location.trim()) {
      setErrorMsg(t('location_label') + ' ' + t('required')); return false;
    }

    setErrorMsg('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const startObj = new Date(`${startDate}T${startTimeInput}`);
    const startIso = startObj.toISOString();
    const endIso = new Date(startObj.getTime() + durationMinutes * 60000).toISOString();

    try {
      const created = await apiCreateMeeting(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        type: meetingType.toUpperCase() as 'ONLINE' | 'OFFLINE',
        startTime: startIso,
        endTime: endIso,
        location: meetingType === 'offline' ? location.trim() : undefined,
        meetingLink: meetingType === 'online' ? meetingLink.trim() : undefined,
        attendeeIds,
      });
      onAdd(created);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || t('error');
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('new_meeting')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>{t('title')} *</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={t('meeting_topic')} className={inputClass} maxLength={200} />
        </div>
        <div>
          <label className={labelClass}>{t('description')}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t('meeting_notes')} rows={2} className={inputClass} maxLength={2000} />
        </div>

        {/* Start datetime */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('start')} *</label>
            <input type="date" required value={startDate} min={today}
              onChange={(e) => { setStartDate(e.target.value); setErrorMsg(''); }}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('meeting_time')} *</label>
            <input type="time" required value={startTimeInput}
              onChange={(e) => { setStartTimeInput(e.target.value); setErrorMsg(''); }}
              className={inputClass} />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className={labelClass}>{t('duration')} ({t('minutes')})</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              min="1"
              value={durationMinutes || ''} 
              onChange={(e) => setDurationMinutes(Number(e.target.value))} 
              className={inputClass}
              placeholder="E.g. 60"
            />
            <select 
              value={[15, 30, 45, 60, 90, 120, 180, 240].includes(durationMinutes) ? durationMinutes : 'custom'} 
              onChange={(e) => {
                if (e.target.value !== 'custom') setDurationMinutes(Number(e.target.value));
              }} 
              className={`${inputClass} w-40`}
            >
              <option value={15}>15 {t('minutes')}</option>
              <option value={30}>30 {t('minutes')}</option>
              <option value={45}>45 {t('minutes')}</option>
              <option value={60}>60 {t('minutes')} (1h)</option>
              <option value={90}>90 {t('minutes')} (1.5h)</option>
              <option value={120}>120 {t('minutes')} (2h)</option>
              <option value={180}>180 {t('minutes')} (3h)</option>
              <option value={240}>240 {t('minutes')} (4h)</option>
              <option value="custom" className="hidden">{t('custom') || 'Custom'}</option>
            </select>
          </div>
        </div>

        {/* Type */}
        <div>
          <label className={labelClass}>{t('meeting_location')}</label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="mtype" checked={meetingType === 'online'}
                onChange={() => setMeetingType('online')} className="rounded-full border-slate-300" />
              <span className="text-sm">{t('online')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="mtype" checked={meetingType === 'offline'}
                onChange={() => setMeetingType('offline')} className="rounded-full border-slate-300" />
              <span className="text-sm">{t('offline')}</span>
            </label>
          </div>
        </div>

        {meetingType === 'online' ? (
          <div>
            <label className={labelClass}>{t('meeting_link')} *</label>
            <input type="url" required value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              className={inputClass} />
          </div>
        ) : (
          <div>
            <label className={labelClass}>{t('address')} *</label>
            <input type="text" required value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('meeting_location')} className={inputClass} />
          </div>
        )}

        {/* Attendees */}
        <div>
          <label className={labelClass}>{t('attendees')}</label>
          <div className="flex flex-wrap gap-2">
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">{t('no_members_in_project')}</p>
            ) : (
              members.map((m) => (
                <label key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                  <input type="checkbox" checked={attendeeIds.includes(m.id)}
                    onChange={(e) => {
                      setAttendeeIds((prev) =>
                        e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                      );
                    }}
                    className="rounded border-slate-300" />
                  <span className="text-sm">{m.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {errorMsg && <p className="text-sm text-rose-600">{errorMsg}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('loading') : t('create_meeting')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

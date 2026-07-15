/**
 * EditMeetingModal — form to update an existing meeting.
 * Start time is locked once the meeting has begun; status can be changed
 * to CANCELLED, COMPLETED, etc.
 */
import { useEffect, useState } from 'react';
import { updateMeeting as apiUpdateMeeting } from '@/api/meeting.api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Modal } from '@/components/ui';
import type { Meeting, Member } from '@/types';
import type { LocalMeetingStatus } from './helpers';

interface EditMeetingModalProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Meeting) => void;
  members: Member[];
  projectId: string;
}

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

export default function EditMeetingModal({ meeting, isOpen, onClose, onSave, members, projectId }: EditMeetingModalProps) {
  const { t } = useLanguage();

  const toDate = (iso: string) => iso.split('T')[0];
  const toTime = (iso: string) => iso.split('T')[1]?.slice(0, 5) ?? '';

  const [title, setTitle] = useState(meeting.title);
  const [description, setDescription] = useState(meeting.description ?? '');
  const [startDate, setStartDate] = useState(toDate(meeting.startTime));
  const [startTimeInput, setStartTimeInput] = useState(toTime(meeting.startTime));
  
  const initialDuration = Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000);
  const [durationMinutes, setDurationMinutes] = useState(initialDuration > 0 ? initialDuration : 60);
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>(meeting.type);
  const [location, setLocation] = useState(meeting.location ?? '');
  const [meetingLink, setMeetingLink] = useState(meeting.meetingLink ?? '');
  const [status, setStatus] = useState<LocalMeetingStatus>((meeting.status?.toUpperCase() ?? 'SCHEDULED') as LocalMeetingStatus);
  const [attendeeIds, setAttendeeIds] = useState<string[]>(meeting.attendees.map((a) => a.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const alreadyStarted = new Date(meeting.startTime) <= new Date();

  useEffect(() => {
    setTitle(meeting.title);
    setDescription(meeting.description ?? '');
    setStartDate(toDate(meeting.startTime));
    setStartTimeInput(toTime(meeting.startTime));
    const dur = Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000);
    setDurationMinutes(dur > 0 ? dur : 60);
    setMeetingType(meeting.type);
    setLocation(meeting.location ?? '');
    setMeetingLink(meeting.meetingLink ?? '');
    setStatus((meeting.status?.toUpperCase() ?? 'SCHEDULED') as LocalMeetingStatus);
    setAttendeeIds(meeting.attendees.map((a) => a.id));
  }, [meeting]);

  const validate = () => {
    if (!title.trim()) { setErrorMsg(t('title') + ' ' + t('required')); return false; }
    if (!startDate || !startTimeInput) { setErrorMsg(t('start') + ' ' + t('required')); return false; }

    const start = new Date(`${startDate}T${startTimeInput}`);
    const now = new Date();

    if (Number.isNaN(start.getTime())) { setErrorMsg(t('invalid_date')); return false; }
    if (!alreadyStarted && start <= now) { setErrorMsg(t('start_must_be_future')); return false; }

    if (meetingType === 'online' && !meetingLink.trim()) {
      setErrorMsg(t('meeting_link') + ' ' + t('required')); return false;
    }
    if (meetingType === 'offline' && !location.trim()) {
      setErrorMsg(t('location_label') + ' ' + t('required')); return false;
    }

    setErrorMsg('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const apiStatus = status;
    try {
      const updated = await apiUpdateMeeting(projectId, meeting.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        type: meetingType.toUpperCase() as 'ONLINE' | 'OFFLINE',
        startTime: alreadyStarted ? undefined : new Date(`${startDate}T${startTimeInput}`).toISOString(),
        endTime: new Date(new Date(`${startDate}T${startTimeInput}`).getTime() + durationMinutes * 60000).toISOString(),
        location: meetingType === 'offline' ? location.trim() : undefined,
        meetingLink: meetingType === 'online' ? meetingLink.trim() : undefined,
        status: apiStatus,
        attendeeIds,
      });
      onSave(updated);
      onClose();
    } catch {
      setErrorMsg(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('edit_meeting')} size="lg">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>{t('title')} *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} maxLength={200} />
        </div>
        <div>
          <label className={labelClass}>{t('description')}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} maxLength={2000} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('start')} *</label>
            <input type="date" value={startDate} disabled={alreadyStarted}
              onChange={(e) => { setStartDate(e.target.value); setErrorMsg(''); }}
              className={`${inputClass} ${alreadyStarted ? 'bg-slate-100 cursor-not-allowed' : ''}`} />
            {alreadyStarted && <p className="mt-1 text-xs text-slate-500">{t('start_time_cannot_change')}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('meeting_time')} *</label>
            <input type="time" value={startTimeInput} disabled={alreadyStarted}
              onChange={(e) => { setStartTimeInput(e.target.value); setErrorMsg(''); }}
              className={`${inputClass} ${alreadyStarted ? 'bg-slate-100 cursor-not-allowed' : ''}`} />
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

        <div>
          <label className={labelClass}>{t('meeting_location')}</label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="mtypeEdit" checked={meetingType === 'online'}
                onChange={() => setMeetingType('online')} className="rounded-full border-slate-300" />
              <span className="text-sm">{t('online')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="mtypeEdit" checked={meetingType === 'offline'}
                onChange={() => setMeetingType('offline')} className="rounded-full border-slate-300" />
              <span className="text-sm">{t('offline')}</span>
            </label>
          </div>
        </div>

        {meetingType === 'online' ? (
          <div>
            <label className={labelClass}>{t('meeting_link')} *</label>
            <input type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://zoom.us/j/..." className={inputClass} />
          </div>
        ) : (
          <div>
            <label className={labelClass}>{t('address')} *</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder={t('meeting_location')} className={inputClass} />
          </div>
        )}

        <div>
          <label className={labelClass}>{t('status')}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as LocalMeetingStatus)} className={inputClass}>
            <option value="SCHEDULED">{t('scheduled')}</option>
            <option value="IN_PROGRESS">{t('in_progress')}</option>
            <option value="COMPLETED">{t('completed')}</option>
            <option value="CANCELLED">{t('cancelled')}</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>{t('attendees')}</label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                <input type="checkbox" checked={attendeeIds.includes(m.id)}
                  onChange={(e) => setAttendeeIds((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))}
                  className="rounded border-slate-300" />
                <span className="text-sm">{m.name}</span>
              </label>
            ))}
          </div>
        </div>

        {errorMsg && <p className="text-sm text-rose-600">{errorMsg}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('loading') : t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

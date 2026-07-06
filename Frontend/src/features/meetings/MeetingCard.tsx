/**
 * MeetingCard — single meeting row in a MeetingSection.
 *
 * Renders title, status, time, organizer, attendees count, RSVP buttons
 * and admin actions. Clicking the card opens the detail modal; admin
 * buttons inside the card stop propagation to avoid double-trigger.
 */
import { Calendar, MapPin, Link, Users, Pencil, Trash2, CheckCircle, XCircle, Lock } from 'lucide-react';
import { classifyMeeting, isMeetingJoinable, type MeetingPhase } from '@/api/meeting.api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Meeting, ProjectMember } from '@/types';
import { Button, ProjectMemberAvatar } from '@/components/ui';
import type { LocalMeetingStatus } from './helpers';
import { STATUS_VARIANTS, formatDateTime, getStatusLabel } from './helpers';

export interface MeetingCardProps {
  meeting: Meeting;
  now: Date;
  projectMembers: ProjectMember[];
  authUserId: string;
  currentUserRole: string;
  canEdit: (m: Meeting) => boolean;
  onSelect: (m: Meeting) => void;
  onEdit: (m: Meeting) => void;
  onDelete: (m: Meeting) => void;
  onJoin: (m: Meeting) => void;
  onRsvp: (m: Meeting, willAttend: boolean) => void;
  onDecline: (m: Meeting) => void;
}

export default function MeetingCard({
  meeting,
  now,
  projectMembers,
  authUserId,
  currentUserRole,
  canEdit,
  onSelect,
  onEdit,
  onDelete,
  onJoin,
  onRsvp,
  onDecline,
}: MeetingCardProps) {
  const { t } = useLanguage();
  const myResponse = meeting.attendeeResponses?.[authUserId ?? ''];
  const isInvited = meeting.attendees.some((a) => a.id === authUserId);
  const meetingStatus = (meeting.status in STATUS_VARIANTS ? meeting.status : 'SCHEDULED') as LocalMeetingStatus;
  const phase: MeetingPhase = classifyMeeting(meeting, now);
  const joinable = isMeetingJoinable(meeting, now);

  return (
    <article
      key={meeting.id}
      onClick={() => onSelect(meeting)}
      className={`relative cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        phase === 'ENDED' ? 'border-slate-200 opacity-80' : 'border-slate-200'
      }`}
    >
      {meeting.type === 'online' && (
        <span
          className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm"
          title={t('online_label')}
          aria-hidden
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className={`truncate font-semibold ${phase === 'ENDED' ? 'text-slate-600' : 'text-slate-900'}`}>
              {meeting.title}
            </h3>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_VARIANTS[meetingStatus]}`}>
              {getStatusLabel(meetingStatus, t)}
            </span>
            {phase === 'ONGOING' && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('meeting_phase_ongoing_badge')}
              </span>
            )}
          </div>
          {meeting.description && (
            <p className="mb-3 line-clamp-2 text-sm text-slate-600">{meeting.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDateTime(meeting.startTime)} –{' '}
              {new Date(meeting.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
            {meeting.type === 'offline' && meeting.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />{meeting.location}
              </span>
            )}
            {meeting.type === 'online' && meeting.meetingLink && (
              joinable ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onJoin(meeting); }}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                  title={t('meeting_join_now')}
                >
                  <Link className="h-4 w-4" />{t('meeting_link_label')}
                </button>
              ) : (
                <span
                  className="flex items-center gap-1.5 cursor-not-allowed text-slate-400"
                  title={phase === 'ENDED' ? t('meeting_ended_cant_join') : t('meeting_not_started')}
                >
                  {phase === 'ENDED' ? <Lock className="h-4 w-4" /> : <Link className="h-4 w-4" />}
                  {t('meeting_link_label')}
                </span>
              )
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">{t('organizer')}:</span>
            <ProjectMemberAvatar member={meeting.organizer} projectMembers={projectMembers} size="sm" />
            <span className="text-sm text-slate-700">{meeting.organizer.name}</span>
            {meeting.attendees.length > 1 && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Users className="h-3.5 w-3.5" />+{meeting.attendees.length - 1} {t('attendees_count')}
              </span>
            )}
          </div>
          {/* RSVP chỉ hiện khi cuộc họp chưa kết thúc */}
          {isInvited && phase !== 'ENDED' && meeting.status !== 'cancelled' && (
            <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant={myResponse?.willAttend ? 'primary' : 'ghost'} size="sm"
                onClick={() => onRsvp(meeting, true)}>
                <CheckCircle className="mr-1 h-3.5 w-3.5" />{t('will_attend_label')}
              </Button>
              <Button
                variant={myResponse?.willAttend === false ? 'danger' : 'ghost'} size="sm"
                onClick={() => onDecline(meeting)}>
                <XCircle className="mr-1 h-3.5 w-3.5" />{t('decline_label')}
              </Button>
            </div>
          )}
        </div>
        {currentUserRole !== '' && canEdit(meeting) && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => onEdit(meeting)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label={t('edit')}>
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onDelete(meeting)}
              className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              aria-label={t('delete')}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * MeetingDetailModal — read-only view of a meeting.
 * Owner/supervisor can also add/remove attendees, edit or join.
 */
import { useState } from 'react';
import { MapPin, Link, Lock, Plus, CheckCircle, XCircle, Pencil, Share2 } from 'lucide-react';
import { classifyMeeting, isMeetingJoinable, joinMeeting } from '@/api/meeting.api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Modal, ProjectMemberAvatar, useToast } from '@/components/ui';
import type { Meeting, ProjectMember } from '@/types';
import { STATUS_VARIANTS, formatDateTime } from './helpers';
import ShareDialog from '../chat/components/ShareDialog';

interface MeetingDetailModalProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddAttendees: (attendeeIds: string[]) => Promise<void>;
  onRemoveAttendee: (userId: string) => Promise<void>;
  projectMembers: ProjectMember[];
  currentUserRole: string;
  currentUserIsOwner: boolean;
  authUserId: string;
}

export default function MeetingDetailModal({
  meeting, isOpen, onClose, onEdit,
  onAddAttendees, onRemoveAttendee,
  projectMembers, currentUserRole, currentUserIsOwner, authUserId,
}: MeetingDetailModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [addingAttendee, setAddingAttendee] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const attending = meeting.attendees.filter((a) => meeting.attendeeResponses?.[a.id]?.willAttend === true);
  const declined = meeting.attendees.filter((a) => meeting.attendeeResponses?.[a.id]?.willAttend === false);
  const pending = meeting.attendees.filter((a) => meeting.attendeeResponses?.[a.id] === undefined);

  const isOwner = currentUserIsOwner || currentUserRole === 'OWNER';
  const isOrganizer = meeting.organizer.id === authUserId;
  const canManageAttendees = isOwner || (currentUserRole === 'SUPERVISOR' && isOrganizer);

  // Tính phase hiện tại (now được cập nhật mỗi 30s ở component cha) để
  // hiển thị đúng trạng thái ngay cả khi modal vẫn đang mở và meeting vừa kết thúc.
  const phase = classifyMeeting(meeting);
  const joinable = isMeetingJoinable(meeting);
  const isEnded = phase === 'ENDED';

  const notInMeeting = projectMembers
    .map((pm) => pm.member)
    .filter((m) => !meeting.attendees.some((a) => a.id === m.id));

  const handleAddAttendees = async () => {
    if (selectedToAdd.length === 0) return;
    setAddingAttendee(true);
    try {
      await onAddAttendees(selectedToAdd);
      setSelectedToAdd([]);
      setShowAddAttendee(false);
    } finally {
      setAddingAttendee(false);
    }
  };

  const durationMs = new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  const durationLabel = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}m` : ''}`
    : `${durationMinutes}m`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={meeting.title} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          {meeting.type === 'online' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />{t('online_label')}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_VARIANTS[meeting.status]}`}>
            {t(meeting.status)}
          </span>
        </div>

        {meeting.description && (
          <div>
            <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('description')}</h4>
            <p className="text-sm text-slate-600">{meeting.description}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('time')}</h4>
            <p className="text-sm text-slate-600">
              {formatDateTime(meeting.startTime)} –{' '}
              {new Date(meeting.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('duration')}</h4>
            <p className="text-sm text-slate-600">{durationLabel}</p>
          </div>
          {meeting.type === 'offline' && meeting.location && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('location_label')}</h4>
              <p className="flex items-center gap-1.5 text-sm text-slate-600">
                <MapPin className="h-4 w-4 shrink-0" />{meeting.location}
              </p>
            </div>
          )}
          {meeting.type === 'online' && meeting.meetingLink && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('meeting_link_label')}</h4>
              {joinable ? (
                <button
                  type="button"
                  onClick={() => {
                    joinMeeting(meeting.projectId, meeting.id)
                      .then(({ meetingLink }) => window.open(meetingLink, '_blank', 'noopener,noreferrer'))
                      .catch((err: { message?: string }) => toast(err?.message || t('meeting_ended_cant_join'), 'error'));
                  }}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Link className="h-4 w-4 shrink-0" />
                  {meeting.meetingLink}
                </button>
              ) : (
                <span
                  className="flex items-center gap-1.5 text-sm text-slate-400 cursor-not-allowed"
                  title={isEnded ? t('meeting_ended_cant_join') : t('meeting_not_started')}
                >
                  {isEnded ? <Lock className="h-4 w-4 shrink-0" /> : <Link className="h-4 w-4 shrink-0" />}
                  <span className="line-through">{meeting.meetingLink}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('organizer')}</h4>
          <div className="flex items-center gap-2">
            <ProjectMemberAvatar member={meeting.organizer} projectMembers={projectMembers} size="sm" />
            <span className="text-sm text-slate-700">{meeting.organizer.name}</span>
          </div>
        </div>

        {/* Attendees */}
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">{t('attendees_label')} ({attending.length})</h4>
            {canManageAttendees && !showAddAttendee && (
              <Button variant="ghost" size="sm" onClick={() => setShowAddAttendee(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" />{t('add_members')}
              </Button>
            )}
          </div>

          {showAddAttendee && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <h5 className="text-xs font-semibold text-slate-600">{t('select_attendees')}</h5>
              {notInMeeting.length === 0 ? (
                <p className="text-xs text-slate-500">{t('all_members_invited')}</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {notInMeeting.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
                      <input type="checkbox" checked={selectedToAdd.includes(m.id)}
                        onChange={(e) => setSelectedToAdd((prev) => e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id))}
                        className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">{m.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowAddAttendee(false); setSelectedToAdd([]); }}>
                  {t('cancel')}
                </Button>
                <Button variant="primary" size="sm" disabled={addingAttendee || selectedToAdd.length === 0} onClick={handleAddAttendees}>
                  {addingAttendee ? t('loading') : t('invite_selected_members').replace('{count}', String(selectedToAdd.length))}
                </Button>
              </div>
            </div>
          )}

          {attending.length === 0 ? (
            <p className="text-sm text-slate-500">{t('no_attendees')}</p>
          ) : (
            <ul className="space-y-2">
              {attending.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <ProjectMemberAvatar member={m} projectMembers={projectMembers} size="sm" />
                  <span className="text-sm text-slate-700">{m.name}</span>
                  {m.id === meeting.organizer.id && (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{t('organizer')}</span>
                  )}
                  <CheckCircle className="ml-auto h-4 w-4 text-emerald-500" />
                  {canManageAttendees && m.id !== meeting.organizer.id && (
                    <button type="button" onClick={() => onRemoveAttendee(m.id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      title={t('kick')}>
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {pending.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">{t('pending_label')} ({pending.length})</h4>
            <ul className="space-y-2">
              {pending.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-slate-500">
                  <ProjectMemberAvatar member={m} projectMembers={projectMembers} size="sm" />
                  <span className="text-sm">{m.name}</span>
                  {canManageAttendees && m.id !== meeting.organizer.id && (
                    <button type="button" onClick={() => onRemoveAttendee(m.id)}
                      className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      title={t('kick')}>
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {declined.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">{t('declined_label')} ({declined.length})</h4>
            <ul className="space-y-3">
              {declined.map((m) => {
                const resp = meeting.attendeeResponses?.[m.id];
                return (
                  <li key={m.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <ProjectMemberAvatar member={m} projectMembers={projectMembers} size="sm" />
                      <span className="text-sm font-medium text-slate-700">{m.name}</span>
                      <XCircle className="ml-auto h-4 w-4 text-rose-500" />
                    </div>
                    {resp?.declineReason && (
                      <p className="mt-2 pl-10 text-sm text-slate-600 italic">
                        {t('reason')}: {resp.declineReason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-700">{t('meeting_summary')}</h4>
          <p className="text-sm text-slate-600">{meeting.summary || t('summary_placeholder')}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="ghost" onClick={() => setShowShareDialog(true)} className="text-primary hover:bg-primary/10">
            <Share2 className="mr-1 h-4 w-4" /> Share
          </Button>
          <Button variant="ghost" onClick={onClose}>{t('close')}</Button>
          {canManageAttendees && (
            <Button variant="primary" size="sm" onClick={onEdit}>
              <Pencil className="mr-1 h-4 w-4" />{t('edit_meeting')}
            </Button>
          )}
        </div>
      </div>
      {showShareDialog && (
        <ShareDialog
          title="Share Meeting"
          sharePayload={`[${meeting.title}](meeting://${meeting.id}?date=${meeting.startTime}&status=${meeting.status})`}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </Modal>
  );
}

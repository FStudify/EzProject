import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Video,
  Plus,
  Calendar,
  MapPin,
  Link,
  Users,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { getMeetings, createMeeting as apiCreateMeeting, updateMeeting as apiUpdateMeeting, deleteMeeting as apiDeleteMeeting, rsvpMeeting } from '@/api/meeting.api';
import { projectService } from '@/services';
import type { Meeting, MeetingStatus } from '@/api/types';
import { Button, Modal, ProjectMemberAvatar } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';

const STATUS_VARIANTS: Record<MeetingStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function apiMeetingToLocal(
  m: Meeting,
): import('@/types').Meeting {
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    description: m.description ?? undefined,
    startTime: m.startTime,
    endTime: m.endTime,
    type: m.type.toLowerCase() as 'online' | 'offline',
    location: m.location ?? undefined,
    meetingLink: m.meetingLink ?? undefined,
    status: m.status.toLowerCase().replace('_', '_') as import('@/types').MeetingStatus,
    organizer: {
      id: m.organizer.id,
      name: m.organizer.fullName,
      email: '',
      avatar: m.organizer.avatar ?? '',
    },
    attendees: m.attendees.map((a) => ({
      id: a.user.id,
      name: a.user.fullName,
      email: '',
      avatar: a.user.avatar ?? '',
      willAttend: a.willAttend,
      declineReason: a.declineReason,
    })),
    attendeeResponses: Object.fromEntries(
      m.attendees
        .filter((a) => a.willAttend !== null)
        .map((a) => [
          a.user.id,
          { willAttend: a.willAttend === true, declineReason: a.declineReason ?? undefined },
        ]),
    ),
    createdAt: m.createdAt,
  };
}

function localMeetingToApi(
  m: import('@/types').Meeting,
): Meeting {
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    description: m.description ?? null,
    startTime: m.startTime,
    endTime: m.endTime,
    type: m.type.toUpperCase() as Meeting['type'],
    location: m.location ?? null,
    meetingLink: m.meetingLink ?? null,
    status: m.status.toUpperCase() as Meeting['status'],
    organizer: {
      id: m.organizer.id,
      fullName: m.organizer.name,
      avatar: m.organizer.avatar ?? null,
    },
    attendees: m.attendees.map((a) => ({
      user: { id: a.id, fullName: a.name, avatar: a.avatar ?? null },
      willAttend: a.willAttend,
      declineReason: a.declineReason,
    })),
    createdAt: m.createdAt,
  };
}

export default function MeetingList() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useLanguage();

  const [meetings, setMeetings] = useState<import('@/types').Meeting[]>([]);
  const [projectMembers, setProjectMembers] = useState<import('@/types').ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<import('@/types').Meeting | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<import('@/types').Meeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<import('@/types').Meeting | null>(null);
  const [declineTarget, setDeclineTarget] = useState<import('@/types').Meeting | null>(null);
  const [meetingSummaries, setMeetingSummaries] = useState<Record<string, string>>({});
  const [meetingTasksCreated, setMeetingTasksCreated] = useState<Record<string, string[]>>({});

  const getStatusLabel = (status: MeetingStatus) => {
    const labels: Record<MeetingStatus, string> = {
      SCHEDULED: t('scheduled'),
      IN_PROGRESS: t('in_progress'),
      COMPLETED: t('completed'),
      CANCELLED: t('cancelled'),
    };
    return labels[status];
  };

  const handleAdd = (meeting: import('@/types').Meeting) => {
    setMeetings((prev) => [...prev, meeting]);
    setIsAddOpen(false);
  };

  const handleUpdate = (updated: import('@/types').Meeting) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m)),
    );
    setEditingMeeting(null);
  };

  const handleDelete = () => {
    if (deleteTarget && projectId) {
      apiDeleteMeeting(projectId, deleteTarget.id)
        .then(() => {
          setMeetings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
          setDeleteTarget(null);
        })
        .catch((err) => console.error('Failed to delete meeting:', err));
    }
  };

  const handleConfirmAttendance = (
    meeting: import('@/types').Meeting,
    willAttend: boolean,
    declineReason?: string,
  ) => {
    if (!projectId) return;
    rsvpMeeting(projectId, meeting.id, { willAttend, declineReason })
      .then(() => {
        setMeetings((prev) =>
          prev.map((m) =>
            m.id === meeting.id
              ? {
                  ...m,
                  attendeeResponses: {
                    ...m.attendeeResponses,
                  },
                }
              : m,
          ),
        );
        setDeclineTarget(null);
      })
      .catch((err) => console.error('Failed to RSVP:', err));
  };

  const handleCreateTaskFromMeeting = (meeting: import('@/types').Meeting) => {
    const created = import('@/services').taskService.addTask({
      projectId: meeting.projectId,
      title: `${t('follow_up_task')}: ${meeting.title}`,
      description: meeting.description
        ? `${t('follow_up_task_created')}: ${meeting.description}`
        : t('follow_up_task_created'),
      status: 'BACKLOG',
      priority: 'MEDIUM',
      assignee: meeting.organizer,
      deadline: new Date(new Date(meeting.endTime).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    setMeetingTasksCreated((prev) => ({
      ...prev,
      [meeting.id]: [...(prev[meeting.id] ?? []), created.title],
    }));
    setMeetingSummaries((prev) => ({
      ...prev,
      [meeting.id]: prev[meeting.id] ?? `${t('meeting_summary')}: ${meeting.title}.`,
    }));
  };

  useEffect(() => {
    if (!projectId) {
      setMeetings([]);
      setProjectMembers([]);
      return;
    }

    setIsLoading(true);
    Promise.all([
      getMeetings(projectId),
      projectService.getProject(projectId),
    ])
      .then(([meetingsData, projectData]) => {
        setMeetings(meetingsData.map(apiMeetingToLocal));
        setProjectMembers(
          projectData.members.map((pm) => ({
            member: {
              id: pm.user.id,
              name: pm.user.fullName,
              email: '',
              avatar: pm.user.avatar ?? '',
            },
            isOwner: pm.isOwner,
            role: pm.role.toLowerCase() as import('@/types').ProjectRole,
          })),
        );
      })
      .catch((err) => {
        console.error('Failed to load meetings or project:', err);
        setMeetings([]);
        setProjectMembers([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('meetings')}</h2>
          <p className="text-sm text-slate-600">
            {t('schedule_and_manage')}
          </p>
        </div>
        <Button variant="accent" size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('new_meeting')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
          <Video className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">{t('no_meetings_yet')}</p>
          <p className="mt-1 text-xs text-slate-500">
            {t('create_meeting_to_start')}
          </p>
          <Button
            variant="accent"
            size="sm"
            className="mt-4"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t('new_meeting')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const myResponse = meeting.attendeeResponses?.[projectMembers[0]?.member.id];
            const isInvited = meeting.attendees.some(
              (a) => a.id === projectMembers[0]?.member.id,
            );
            return (
            <article
              key={meeting.id}
              onClick={() => setDetailMeeting(meeting)}
              className="relative cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
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
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {meeting.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_VARIANTS[meeting.status.toUpperCase() as MeetingStatus]}`}
                    >
                      {getStatusLabel(meeting.status.toUpperCase() as MeetingStatus)}
                    </span>
                  </div>
                  {meeting.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {meeting.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(meeting.startTime)} –{' '}
                      {new Date(meeting.endTime).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {meeting.type === 'offline' && meeting.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {meeting.location}
                      </span>
                    )}
                    {meeting.type === 'online' && meeting.meetingLink && (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Link className="h-4 w-4" />
                        {meeting.meetingLink}
                      </a>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">{t('organizer')}:</span>
                    <ProjectMemberAvatar
                      member={meeting.organizer}
                      projectMembers={projectMembers}
                      size="sm"
                    />
                    <span className="text-sm text-slate-700">
                      {meeting.organizer.name}
                    </span>
                    {meeting.attendees.length > 1 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="h-3.5 w-3.5" />
                        +{meeting.attendees.length - 1} {t('attendees_count')}
                      </span>
                    )}
                  </div>
                  {isInvited && meeting.status !== 'cancelled' && (
                    <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant={myResponse?.willAttend ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handleConfirmAttendance(meeting, true)}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        {t('will_attend_label')}
                      </Button>
                      <Button
                        variant={myResponse?.willAttend === false ? 'danger' : 'ghost'}
                        size="sm"
                        onClick={() => setDeclineTarget(meeting)}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        {t('decline_label')}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setEditingMeeting(meeting)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    aria-label={t('edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(meeting)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    aria-label={t('delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          );
          })}
        </div>
      )}

      {/* Add Meeting Modal */}
      <AddMeetingModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAdd}
        projectId={projectId ?? ''}
        members={projectMembers.map((pm) => pm.member)}
      />

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          isOpen={!!editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onSave={handleUpdate}
          members={projectMembers.map((pm) => pm.member)}
        />
      )}

      {/* Meeting Detail Modal */}
      {detailMeeting && (
        <MeetingDetailModal
          meeting={detailMeeting}
          isOpen={!!detailMeeting}
          onClose={() => setDetailMeeting(null)}
          onEdit={() => {
            setDetailMeeting(null);
            setEditingMeeting(detailMeeting);
          }}
          onCreateTask={handleCreateTaskFromMeeting}
          summary={detailMeeting ? meetingSummaries[detailMeeting.id] : undefined}
          createdTasks={detailMeeting ? meetingTasksCreated[detailMeeting.id] : undefined}
          projectMembers={projectMembers}
        />
      )}

      {/* Decline reason popup */}
      {declineTarget && (
        <DeclineMeetingModal
          meeting={declineTarget}
          isOpen={!!declineTarget}
          onClose={() => setDeclineTarget(null)}
          onConfirm={(reason) => handleConfirmAttendance(declineTarget, false, reason)}
        />
      )}

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('delete_meeting')}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-slate-600">
              {t('meeting_delete_confirm')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                {t('cancel')}
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                {t('delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface MeetingDetailModalProps {
  meeting: import('@/types').Meeting;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCreateTask: (meeting: import('@/types').Meeting) => void;
  summary?: string;
  createdTasks?: string[];
  projectMembers: import('@/types').ProjectMember[];
}

function MeetingDetailModal({
  meeting,
  isOpen,
  onClose,
  onEdit,
  onCreateTask,
  summary,
  createdTasks,
  projectMembers,
}: MeetingDetailModalProps) {
  const { t } = useLanguage();
  const attending = meeting.attendees.filter(
    (a) => meeting.attendeeResponses?.[a.id]?.willAttend === true,
  );
  const declined = meeting.attendees.filter(
    (a) => meeting.attendeeResponses?.[a.id]?.willAttend === false,
  );
  const pending = meeting.attendees.filter(
    (a) => meeting.attendeeResponses?.[a.id] === undefined,
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={meeting.title} size="lg">
      <div className="space-y-5">
        {meeting.type === 'online' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t('online_label')}
          </span>
        )}
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
              {new Date(meeting.endTime).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {meeting.type === 'offline' && meeting.location && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('location_label')}</h4>
              <p className="flex items-center gap-1.5 text-sm text-slate-600">
                <MapPin className="h-4 w-4 shrink-0" />
                {meeting.location}
              </p>
            </div>
          )}
          {meeting.type === 'online' && meeting.meetingLink && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('meeting_link_label')}</h4>
              <a
                href={meeting.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Link className="h-4 w-4 shrink-0" />
                {meeting.meetingLink}
              </a>
            </div>
          )}
        </div>
        <div>
          <h4 className="mb-1 text-sm font-semibold text-slate-700">{t('organizer')}</h4>
          <div className="flex items-center gap-2">
            <ProjectMemberAvatar
              member={meeting.organizer}
              projectMembers={projectMembers}
              size="sm"
            />
            <span className="text-sm text-slate-700">{meeting.organizer.name}</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-700">
            {t('attendees_label')} ({attending.length})
          </h4>
          {attending.length === 0 ? (
            <p className="text-sm text-slate-500">{t('no_attendees')}</p>
          ) : (
            <ul className="space-y-2">
              {attending.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <ProjectMemberAvatar member={m} projectMembers={projectMembers} size="sm" />
                  <span className="text-sm text-slate-700">{m.name}</span>
                  <CheckCircle className="ml-auto h-4 w-4 text-emerald-500" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {pending.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">
              {t('pending_label')} ({pending.length})
            </h4>
            <ul className="space-y-2">
              {pending.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-slate-500">
                  <ProjectMemberAvatar member={m} projectMembers={projectMembers} size="sm" />
                  <span className="text-sm">{m.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-700">{t('meeting_summary')}</h4>
              <p className="text-xs text-slate-500">{t('summary_placeholder')}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onCreateTask(meeting)}>
              <Plus className="mr-1.5 h-4 w-4" /> {t('create_task_from_meeting')}
            </Button>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {summary ?? t('summary_placeholder')}
          </p>
          {createdTasks?.length ? (
            <div className="mt-3 space-y-2">
              <h5 className="text-sm font-semibold text-slate-700">{t('my_tasks')}</h5>
              <ul className="space-y-1 text-sm text-slate-600">
                {createdTasks.map((taskTitle) => (
                  <li key={taskTitle} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    {taskTitle}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-700">
            {t('declined_label')} ({declined.length})
          </h4>
          {declined.length === 0 ? (
            <p className="text-sm text-slate-500">{t('no_declined')}</p>
          ) : (
            <ul className="space-y-3">
              {declined.map((m) => {
                const resp = meeting.attendeeResponses?.[m.id];
                const reason = resp?.declineReason;
                return (
                  <li key={m.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <ProjectMemberAvatar member={m} projectMembers={projectMembers} size="sm" />
                      <span className="text-sm font-medium text-slate-700">{m.name}</span>
                      <XCircle className="ml-auto h-4 w-4 text-rose-500" />
                    </div>
                    {reason && (
                      <p className="mt-2 pl-10 text-sm text-slate-600 italic">
                        {t('reason')}: {reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="ghost" onClick={onClose}>
            {t('close')}
          </Button>
          <Button variant="primary" onClick={onEdit}>
            <Pencil className="mr-1.5 h-4 w-4" />
            {t('edit_meeting')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface DeclineMeetingModalProps {
  meeting: import('@/types').Meeting;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function DeclineMeetingModal({
  isOpen,
  onClose,
  onConfirm,
}: DeclineMeetingModalProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onConfirm(reason.trim());
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('decline_meeting')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {t('decline_modal_text')}
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('reason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reason_placeholder')}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={handleSubmit}>
            {t('confirm_decline')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (meeting: import('@/types').Meeting) => void;
  projectId: string;
  members: import('@/types').Member[];
}

function AddMeetingModal({
  isOpen,
  onClose,
  onAdd,
  projectId,
  members,
}: AddMeetingModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [organizerId, setOrganizerId] = useState(members[0]?.id ?? '');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !startTime || !endTime || !organizerId) return;
    if (meetingType === 'offline' && !location.trim()) return;
    if (meetingType === 'online' && !meetingLink.trim()) return;

    const organizer = members.find((m) => m.id === organizerId) ?? members[0];
    const attendees = members.filter((m) =>
      attendeeIds.includes(m.id) || m.id === organizerId,
    );

    setIsSubmitting(true);
    try {
      const created = await apiCreateMeeting(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        type: meetingType.toUpperCase() as 'ONLINE' | 'OFFLINE',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        location: meetingType === 'offline' ? location.trim() : undefined,
        meetingLink: meetingType === 'online' ? meetingLink.trim() : undefined,
        attendeeIds: attendees.map((a) => a.id),
      });
      const localMeeting: import('@/types').Meeting = {
        id: created.id,
        projectId: created.projectId,
        title: created.title,
        description: created.description ?? undefined,
        startTime: created.startTime,
        endTime: created.endTime,
        type: created.type.toLowerCase() as 'online' | 'offline',
        location: created.location ?? undefined,
        meetingLink: created.meetingLink ?? undefined,
        status: created.status.toLowerCase().replace('_', '_') as import('@/types').MeetingStatus,
        organizer: {
          id: created.organizer.id,
          name: created.organizer.fullName,
          email: '',
          avatar: created.organizer.avatar ?? '',
        },
        attendees: created.attendees.map((a) => ({
          id: a.user.id,
          name: a.user.fullName,
          email: '',
          avatar: a.user.avatar ?? '',
          willAttend: a.willAttend,
          declineReason: a.declineReason,
        })),
        createdAt: created.createdAt,
      };
      onAdd(localMeeting);
    } catch (err) {
      console.error('Failed to create meeting:', err);
    } finally {
      setIsSubmitting(false);
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setLocation('');
      setMeetingLink('');
      setAttendeeIds([]);
      onClose();
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('new_meeting')} size="lg">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>{t('title')} *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('meeting_topic')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('meeting_notes')}
            rows={2}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('start')} *</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('end')} *</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>{t('meeting_location')}</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="meetingType"
                checked={meetingType === 'online'}
                onChange={() => setMeetingType('online')}
                className="rounded-full border-slate-300"
              />
              <span className="text-sm">{t('online')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="meetingType"
                checked={meetingType === 'offline'}
                onChange={() => setMeetingType('offline')}
                className="rounded-full border-slate-300"
              />
              <span className="text-sm">{t('offline')}</span>
            </label>
          </div>
        </div>
        {meetingType === 'online' ? (
          <div>
            <label className={labelClass}>{t('meeting_link')} *</label>
            <input
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass}>{t('address')} *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('meeting_location')}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>{t('organizer')} *</label>
          <select
            value={organizerId}
            onChange={(e) => setOrganizerId(e.target.value)}
            className={inputClass}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t('attendees')}</label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const checked = attendeeIds.includes(m.id) || m.id === organizerId;
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={m.id === organizerId}
                    onChange={(e) => {
                      if (m.id === organizerId) return;
                      setAttendeeIds((prev) =>
                        e.target.checked
                          ? [...prev, m.id]
                          : prev.filter((id) => id !== m.id),
                      );
                    }}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">{m.name}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !title.trim() ||
              !startTime ||
              !endTime ||
              (meetingType === 'offline' && !location.trim()) ||
              (meetingType === 'online' && !meetingLink.trim())
            }
          >
            {isSubmitting ? t('creating') : t('create_meeting')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface EditMeetingModalProps {
  meeting: import('@/types').Meeting;
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: import('@/types').Meeting) => void;
  members: import('@/types').Member[];
}

function EditMeetingModal({
  meeting,
  isOpen,
  onClose,
  onSave,
  members,
}: EditMeetingModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(meeting.title);
  const [description, setDescription] = useState(meeting.description ?? '');
  const [startTime, setStartTime] = useState(
    meeting.startTime.slice(0, 16),
  );
  const [endTime, setEndTime] = useState(meeting.endTime.slice(0, 16));
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>(meeting.type);
  const [location, setLocation] = useState(meeting.location ?? '');
  const [meetingLink, setMeetingLink] = useState(meeting.meetingLink ?? '');
  const [status, setStatus] = useState<import('@/types').MeetingStatus>(meeting.status);
  const [organizerId, setOrganizerId] = useState(meeting.organizer.id);
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    meeting.attendees.map((a) => a.id),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTitle(meeting.title);
    setDescription(meeting.description ?? '');
    setStartTime(meeting.startTime.slice(0, 16));
    setEndTime(meeting.endTime.slice(0, 16));
    setMeetingType(meeting.type);
    setLocation(meeting.location ?? '');
    setMeetingLink(meeting.meetingLink ?? '');
    setStatus(meeting.status);
    setOrganizerId(meeting.organizer.id);
    setAttendeeIds(meeting.attendees.map((a) => a.id));
  }, [meeting]);

  const handleSubmit = async () => {
    if (!projectId) return;
    const organizer = members.find((m) => m.id === organizerId) ?? meeting.organizer;
    const attendees = members.filter((m) =>
      attendeeIds.includes(m.id) || m.id === organizerId,
    );
    setIsSubmitting(true);
    try {
      const updated = await apiUpdateMeeting(projectId, meeting.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        type: meetingType.toUpperCase() as 'ONLINE' | 'OFFLINE',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        location: meetingType === 'offline' ? location.trim() : undefined,
        meetingLink: meetingType === 'online' ? meetingLink.trim() : undefined,
        status: status.toUpperCase() as MeetingStatus,
      });
      const localMeeting: import('@/types').Meeting = {
        id: updated.id,
        projectId: updated.projectId,
        title: updated.title,
        description: updated.description ?? undefined,
        startTime: updated.startTime,
        endTime: updated.endTime,
        type: updated.type.toLowerCase() as 'online' | 'offline',
        location: updated.location ?? undefined,
        meetingLink: updated.meetingLink ?? undefined,
        status: updated.status.toLowerCase().replace('_', '_') as import('@/types').MeetingStatus,
        organizer: {
          id: updated.organizer.id,
          name: updated.organizer.fullName,
          email: '',
          avatar: updated.organizer.avatar ?? '',
        },
        attendees: updated.attendees.map((a) => ({
          id: a.user.id,
          name: a.user.fullName,
          email: '',
          avatar: a.user.avatar ?? '',
          willAttend: a.willAttend,
          declineReason: a.declineReason,
        })),
        attendeeResponses: Object.fromEntries(
          updated.attendees
            .filter((a) => a.willAttend !== null)
            .map((a) => [
              a.user.id,
              { willAttend: a.willAttend === true, declineReason: a.declineReason ?? undefined },
            ]),
        ),
        createdAt: updated.createdAt,
      };
      onSave(localMeeting);
    } catch (err) {
      console.error('Failed to update meeting:', err);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('edit_meeting')} size="lg">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>{t('title')} *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('start')} *</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('end')} *</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>{t('meeting_location')}</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="meetingTypeEdit"
                checked={meetingType === 'online'}
                onChange={() => setMeetingType('online')}
                className="rounded-full border-slate-300"
              />
              <span className="text-sm">{t('online')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="meetingTypeEdit"
                checked={meetingType === 'offline'}
                onChange={() => setMeetingType('offline')}
                className="rounded-full border-slate-300"
              />
              <span className="text-sm">{t('offline')}</span>
            </label>
          </div>
        </div>
        {meetingType === 'online' ? (
          <div>
            <label className={labelClass}>{t('meeting_link')} *</label>
            <input
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass}>{t('address')} *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('meeting_location')}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>{t('status')}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as import('@/types').MeetingStatus)}
            className={inputClass}
          >
            <option value="scheduled">{t('scheduled')}</option>
            <option value="in_progress">{t('in_progress')}</option>
            <option value="completed">{t('completed')}</option>
            <option value="cancelled">{t('cancelled')}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{t('organizer')}</label>
          <select
            value={organizerId}
            onChange={(e) => setOrganizerId(e.target.value)}
            className={inputClass}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

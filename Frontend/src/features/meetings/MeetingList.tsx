import { useState, useEffect, useCallback } from 'react';
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
  List,
  CalendarDays,
} from 'lucide-react';
import {
  getMeetings,
  createMeeting as apiCreateMeeting,
  updateMeeting as apiUpdateMeeting,
  deleteMeeting as apiDeleteMeeting,
  rsvpMeeting,
  addMeetingAttendees,
  removeMeetingAttendee,
} from '@/api/meeting.api';
import { getProjectMembers } from '@/api/member.api';
import { projectService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import type { Meeting, ProjectMember } from '@/types';
import { Button, Modal, ProjectMemberAvatar, useToast } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChatSocket } from '@/contexts/ChatSocketContext';
import MeetingCalendar from './MeetingCalendar';

type LocalMeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_VARIANTS: Record<string, string> = {
  scheduled: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
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

type DisplayView = 'list' | 'calendar';

export default function MeetingList() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { socket, isConnected } = useChatSocket();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserIsOwner, setCurrentUserIsOwner] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [displayView, setDisplayView] = useState<DisplayView>('list');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Meeting | null>(null);

  // canCreate is true when we have resolved role info and user is OWNER/SUPERVISOR
  const canCreate = currentUserRole !== '' && (currentUserIsOwner || currentUserRole === 'SUPERVISOR');
  const canEdit = (meeting: Meeting) => {
    if (currentUserRole === '' || currentUserRole === 'MEMBER') return false;
    if (currentUserIsOwner) return true;
    if (currentUserRole === 'SUPERVISOR') return meeting.organizer.id === authUser?.id;
    return false;
  };
  const canDelete = canEdit;

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      scheduled: t('scheduled'),
      in_progress: t('in_progress'),
      completed: t('completed'),
      cancelled: t('cancelled'),
    };
    return map[status] ?? status;
  };

  const loadData = useCallback(async () => {
    if (!projectId) {
      setMeetings([]);
      setProjectMembers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const [meetingsData, projectData] = await Promise.allSettled([
      getMeetings(projectId),
      projectService.getById(projectId),
    ]);

    if (meetingsData.status === 'fulfilled' && meetingsData.value) {
      setMeetings(meetingsData.value);
    }

    if (projectData.status === 'fulfilled' && projectData.value) {
      const membersPayload = Array.isArray(projectData.value.members) ? projectData.value.members : [];
      const loadedMembers: ProjectMember[] = membersPayload.map((pm) => ({
        member: {
          id: pm.member.id,
          name: pm.member.fullName,
          fullName: pm.member.fullName,
          email: pm.member.email,
          avatar: pm.member.avatar,
        },
        isOwner: pm.isOwner,
        role: pm.role,
      }));
      setProjectMembers(loadedMembers);
      const myMembership = loadedMembers.find((pm) => pm.member.id === authUser?.id);
      setCurrentUserRole(myMembership?.role ?? '');
      setCurrentUserIsOwner(myMembership?.isOwner ?? false);
    } else {
      // Fallback: load members from member API
      try {
        const fallbackMembers = await getProjectMembers(projectId);
        const mapped: ProjectMember[] = fallbackMembers.map((tm) => ({
          member: {
            id: tm.user.id,
            name: tm.user.fullName,
            fullName: tm.user.fullName,
            email: tm.user.email,
            avatar: tm.user.avatar ?? '',
          },
          isOwner: tm.isOwner,
          role: tm.role,
        }));
        setProjectMembers(mapped);
        const myFallback = mapped.find((pm) => pm.member.id === authUser?.id);
        setCurrentUserRole(myFallback?.role ?? '');
        setCurrentUserIsOwner(myFallback?.isOwner ?? false);
      } catch {
        setProjectMembers([]);
        setCurrentUserRole('');
        setCurrentUserIsOwner(false);
      }
    }

    setIsLoading(false);
  }, [projectId, authUser?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Socket realtime
  useEffect(() => {
    if (!socket || !isConnected || !projectId) return;

    const hCreated = (data: Meeting) => {
      if (data.projectId === projectId) {
        setMeetings((prev) => prev.some((m) => m.id === data.id) ? prev : [data, ...prev]);
        toast(t('meeting_created'), 'success');
      }
    };
    const hUpdated = (data: Meeting) => {
      if (data.projectId === projectId) setMeetings((prev) => prev.map((m) => m.id === data.id ? data : m));
    };
    const hDeleted = (data: { _id: string }) => {
      setMeetings((prev) => prev.filter((m) => m.id !== data._id));
      setDetailMeeting((cur) => cur?.id === data._id ? null : cur);
    };
    const hAttendeeAdded = (data: Meeting) => {
      if (data.projectId === projectId) setMeetings((prev) => prev.map((m) => m.id === data.id ? data : m));
    };
    const hAttendeeRemoved = (data: Meeting) => {
      if (data.projectId === projectId) setMeetings((prev) => prev.map((m) => m.id === data.id ? data : m));
    };
    const hRsvpUpdated = (data: Meeting) => {
      if (data.projectId === projectId) setMeetings((prev) => prev.map((m) => m.id === data.id ? data : m));
    };

    socket.on('meeting.created', hCreated);
    socket.on('meeting.updated', hUpdated);
    socket.on('meeting.deleted', hDeleted);
    socket.on('meeting.attendee.added', hAttendeeAdded);
    socket.on('meeting.attendee.removed', hAttendeeRemoved);
    socket.on('meeting.response.updated', hRsvpUpdated);

    return () => {
      socket.off('meeting.created', hCreated);
      socket.off('meeting.updated', hUpdated);
      socket.off('meeting.deleted', hDeleted);
      socket.off('meeting.attendee.added', hAttendeeAdded);
      socket.off('meeting.attendee.removed', hAttendeeRemoved);
      socket.off('meeting.response.updated', hRsvpUpdated);
    };
  }, [socket, isConnected, projectId, t, toast]);

  const handleAdd = (meeting: Meeting) => {
    setMeetings((prev) => [meeting, ...prev]);
    setIsAddOpen(false);
    toast(t('meeting_created'), 'success');
  };

  const handleUpdate = (updated: Meeting) => {
    setMeetings((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    setEditingMeeting(null);
    setDetailMeeting(updated);
  };

  const handleDelete = () => {
    if (!deleteTarget || !projectId) return;
    apiDeleteMeeting(projectId, deleteTarget.id)
      .then(() => {
        setMeetings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        setDeleteTarget(null);
        toast(t('meeting_deleted'), 'success');
      })
      .catch(() => toast(t('error'), 'error'));
  };

  const handleConfirmAttendance = (meeting: Meeting, willAttend: boolean, declineReason?: string) => {
    if (!projectId) return;
    rsvpMeeting(projectId, meeting.id, { willAttend, declineReason })
      .then((updated) => {
        setMeetings((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        setDeclineTarget(null);
        setDetailMeeting((cur) => cur?.id === updated.id ? updated : cur);
      })
      .catch(() => toast(t('error'), 'error'));
  };

  const handleCreateTaskFromMeeting = (meeting: Meeting) => {
    import('@/services').taskService.addTask({
      projectId: meeting.projectId,
      title: `${t('follow_up_task')}: ${meeting.title}`,
      description: meeting.description ? `${t('follow_up_task_created')}: ${meeting.description}` : t('follow_up_task_created'),
      status: 'BACKLOG',
      priority: 'MEDIUM',
      assignee: meeting.organizer,
      deadline: new Date(new Date(meeting.endTime).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    toast(t('task_created'), 'success');
  };

  const allMemberOptions = projectMembers.map((pm) => pm.member);

  return (
    <div className="space-y-6">
      {/* Header — always rendered */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('meetings')}</h2>
          <p className="text-sm text-slate-600">{t('schedule_and_manage')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-border bg-surface p-1">
            <button type="button" onClick={() => setDisplayView('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${displayView === 'list' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'}`}>
              <List className="h-4 w-4" />{t('list')}
            </button>
            <button type="button" onClick={() => setDisplayView('calendar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${displayView === 'calendar' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'}`}>
              <CalendarDays className="h-4 w-4" />{t('calendar')}
            </button>
          </div>

          {/* Create button */}
          {currentUserRole !== '' && (
            <Button variant="accent" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />{t('new_meeting')}
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : displayView === 'calendar' ? (
        <MeetingCalendar
          meetings={meetings}
          onSelectMeeting={(m) => setDetailMeeting(m)}
          onCreateMeeting={currentUserRole !== '' ? () => setIsAddOpen(true) : undefined}
        />
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
          <Video className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">{t('no_meetings_yet')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('create_meeting_to_start')}</p>
          {currentUserRole !== '' && (
            <Button variant="accent" size="sm" className="mt-4" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />{t('new_meeting')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const myResponse = meeting.attendeeResponses?.[authUser?.id ?? ''];
            const isInvited = meeting.attendees.some((a) => a.id === authUser?.id);
            const meetingStatus = (meeting.status in STATUS_VARIANTS ? meeting.status : 'scheduled') as LocalMeetingStatus;
            return (
              <article
                key={meeting.id}
                onClick={() => setDetailMeeting(meeting)}
                className="relative cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {meeting.type === 'online' && (
                  <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" title={t('online_label')} aria-hidden />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900">{meeting.title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_VARIANTS[meetingStatus]}`}>
                        {getStatusLabel(meetingStatus)}
                      </span>
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
                        <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-primary hover:underline">
                          <Link className="h-4 w-4" />{t('meeting_link_label')}
                        </a>
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
                    {isInvited && meeting.status !== 'cancelled' && meeting.status !== 'completed' && (
                      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={myResponse?.willAttend ? 'primary' : 'ghost'} size="sm"
                          onClick={() => handleConfirmAttendance(meeting, true)}>
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />{t('will_attend_label')}
                        </Button>
                        <Button
                          variant={myResponse?.willAttend === false ? 'danger' : 'ghost'} size="sm"
                          onClick={() => setDeclineTarget(meeting)}>
                          <XCircle className="mr-1 h-3.5 w-3.5" />{t('decline_label')}
                        </Button>
                      </div>
                    )}
                  </div>
                  {currentUserRole !== '' && canEdit(meeting) && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setEditingMeeting(meeting)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        aria-label={t('edit')}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(meeting)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        aria-label={t('delete')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add Meeting Modal */}
      {isAddOpen && (
        <AddMeetingModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAdd={handleAdd}
          projectId={projectId ?? ''}
          members={allMemberOptions}
          currentUserId={authUser?.id ?? ''}
        />
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          isOpen={!!editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onSave={handleUpdate}
          members={allMemberOptions}
          projectId={projectId ?? ''}
        />
      )}

      {/* Meeting Detail Modal */}
      {detailMeeting && (
        <MeetingDetailModal
          meeting={detailMeeting}
          isOpen={!!detailMeeting}
          onClose={() => setDetailMeeting(null)}
          onEdit={() => { setDetailMeeting(null); setEditingMeeting(detailMeeting); }}
          onCreateTask={handleCreateTaskFromMeeting}
          onAddAttendees={async (attendeeIds) => {
            if (!projectId) return;
            const updated = await addMeetingAttendees(projectId, detailMeeting.id, attendeeIds);
            setMeetings((prev) => prev.map((m) => m.id === updated.id ? updated : m));
            setDetailMeeting(updated);
          }}
          onRemoveAttendee={async (userId) => {
            if (!projectId) return;
            const updated = await removeMeetingAttendee(projectId, detailMeeting.id, userId);
            setMeetings((prev) => prev.map((m) => m.id === updated.id ? updated : m));
            setDetailMeeting(updated);
          }}
          projectMembers={projectMembers}
          currentUserRole={currentUserRole}
          currentUserIsOwner={currentUserIsOwner}
          authUserId={authUser?.id ?? ''}
        />
      )}

      {/* Decline reason */}
      {declineTarget && (
        <DeclineMeetingModal
          isOpen={!!declineTarget}
          onClose={() => setDeclineTarget(null)}
          onConfirm={(reason) => handleConfirmAttendance(declineTarget, false, reason)}
        />
      )}

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('delete_meeting')}>
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-slate-600">{t('meeting_delete_confirm')}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>{t('cancel')}</Button>
              <Button variant="danger" onClick={handleDelete}>{t('delete')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── MeetingDetailModal ─────────────────────────────────────────────────────────

interface MeetingDetailModalProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCreateTask: (meeting: Meeting) => void;
  onAddAttendees: (attendeeIds: string[]) => Promise<void>;
  onRemoveAttendee: (userId: string) => Promise<void>;
  projectMembers: ProjectMember[];
  currentUserRole: string;
  currentUserIsOwner: boolean;
  authUserId: string;
}

function MeetingDetailModal({
  meeting, isOpen, onClose, onEdit, onCreateTask,
  onAddAttendees, onRemoveAttendee,
  projectMembers, currentUserRole, currentUserIsOwner, authUserId,
}: MeetingDetailModalProps) {
  const { t } = useLanguage();
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [addingAttendee, setAddingAttendee] = useState(false);

  const attending = meeting.attendees.filter((a) => meeting.attendeeResponses?.[a.id]?.willAttend === true);
  const declined = meeting.attendees.filter((a) => meeting.attendeeResponses?.[a.id]?.willAttend === false);
  const pending = meeting.attendees.filter((a) => meeting.attendeeResponses?.[a.id] === undefined);

  const isOwner = currentUserIsOwner || currentUserRole === 'OWNER';
  const isOrganizer = meeting.organizer.id === authUserId;
  const canManageAttendees = isOwner || (currentUserRole === 'SUPERVISOR' && isOrganizer);

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
              <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Link className="h-4 w-4 shrink-0" />{meeting.meetingLink}
              </a>
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
          <Button variant="ghost" onClick={onClose}>{t('close')}</Button>
          <Button variant="ghost" size="sm" onClick={() => onCreateTask(meeting)}>
            <Plus className="mr-1 h-4 w-4" />{t('create_task_from_meeting')}
          </Button>
          {canManageAttendees && (
            <Button variant="primary" size="sm" onClick={onEdit}>
              <Pencil className="mr-1 h-4 w-4" />{t('edit_meeting')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── DeclineMeetingModal ──────────────────────────────────────────────────────

interface DeclineMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function DeclineMeetingModal({ isOpen, onClose, onConfirm }: DeclineMeetingModalProps) {
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
        <p className="text-sm text-slate-600">{t('decline_modal_text')}</p>
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
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="danger" onClick={handleSubmit}>{t('confirm_decline')}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── AddMeetingModal ──────────────────────────────────────────────────────────

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (meeting: Meeting) => void;
  projectId: string;
  members: import('@/types').Member[];
  currentUserId: string;
}

function AddMeetingModal({ isOpen, onClose, onAdd, projectId, members, currentUserId }: AddMeetingModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
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
      setEndDate('');
      setEndTimeInput('');
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
    if (!endDate || !endTimeInput) { setErrorMsg(t('end') + ' ' + t('required')); return false; }

    const start = new Date(`${startDate}T${startTimeInput}`);
    const end = new Date(`${endDate}T${endTimeInput}`);
    const now = new Date();

    if (Number.isNaN(start.getTime())) { setErrorMsg(t('invalid_date')); return false; }
    if (Number.isNaN(end.getTime())) { setErrorMsg(t('invalid_date')); return false; }
    if (start <= now) { setErrorMsg(t('start_must_be_future')); return false; }
    if (end <= start) { setErrorMsg(t('end_after_start')); return false; }

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
    const startIso = new Date(`${startDate}T${startTimeInput}`).toISOString();
    const endIso = new Date(`${endDate}T${endTimeInput}`).toISOString();

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

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

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

        {/* End datetime */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('end')} *</label>
            <input type="date" required value={endDate} min={startDate || today}
              onChange={(e) => { setEndDate(e.target.value); setErrorMsg(''); }}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('meeting_time')} *</label>
            <input type="time" required value={endTimeInput}
              onChange={(e) => { setEndTimeInput(e.target.value); setErrorMsg(''); }}
              className={inputClass} />
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

// ── EditMeetingModal ──────────────────────────────────────────────────────────

interface EditMeetingModalProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Meeting) => void;
  members: import('@/types').Member[];
  projectId: string;
}

function EditMeetingModal({ meeting, isOpen, onClose, onSave, members, projectId }: EditMeetingModalProps) {
  const { t } = useLanguage();

  const toDate = (iso: string) => iso.split('T')[0];
  const toTime = (iso: string) => iso.split('T')[1]?.slice(0, 5) ?? '';

  const [title, setTitle] = useState(meeting.title);
  const [description, setDescription] = useState(meeting.description ?? '');
  const [startDate, setStartDate] = useState(toDate(meeting.startTime));
  const [startTimeInput, setStartTimeInput] = useState(toTime(meeting.startTime));
  const [endDate, setEndDate] = useState(toDate(meeting.endTime));
  const [endTimeInput, setEndTimeInput] = useState(toTime(meeting.endTime));
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>(meeting.type);
  const [location, setLocation] = useState(meeting.location ?? '');
  const [meetingLink, setMeetingLink] = useState(meeting.meetingLink ?? '');
  const [status, setStatus] = useState<LocalMeetingStatus>(meeting.status);
  const [attendeeIds, setAttendeeIds] = useState<string[]>(meeting.attendees.map((a) => a.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const alreadyStarted = new Date(meeting.startTime) <= new Date();

  useEffect(() => {
    setTitle(meeting.title);
    setDescription(meeting.description ?? '');
    setStartDate(toDate(meeting.startTime));
    setStartTimeInput(toTime(meeting.startTime));
    setEndDate(toDate(meeting.endTime));
    setEndTimeInput(toTime(meeting.endTime));
    setMeetingType(meeting.type);
    setLocation(meeting.location ?? '');
    setMeetingLink(meeting.meetingLink ?? '');
    setStatus(meeting.status);
    setAttendeeIds(meeting.attendees.map((a) => a.id));
  }, [meeting]);

  const validate = () => {
    if (!title.trim()) { setErrorMsg(t('title') + ' ' + t('required')); return false; }
    if (!startDate || !startTimeInput) { setErrorMsg(t('start') + ' ' + t('required')); return false; }
    if (!endDate || !endTimeInput) { setErrorMsg(t('end') + ' ' + t('required')); return false; }

    const start = new Date(`${startDate}T${startTimeInput}`);
    const end = new Date(`${endDate}T${endTimeInput}`);
    const now = new Date();

    if (Number.isNaN(start.getTime())) { setErrorMsg(t('invalid_date')); return false; }
    if (Number.isNaN(end.getTime())) { setErrorMsg(t('invalid_date')); return false; }
    if (!alreadyStarted && start <= now) { setErrorMsg(t('start_must_be_future')); return false; }
    if (end <= start) { setErrorMsg(t('end_after_start')); return false; }

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
    try {
      const updated = await apiUpdateMeeting(projectId, meeting.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        type: meetingType.toUpperCase() as 'ONLINE' | 'OFFLINE',
        startTime: alreadyStarted ? undefined : new Date(`${startDate}T${startTimeInput}`).toISOString(),
        endTime: new Date(`${endDate}T${endTimeInput}`).toISOString(),
        location: meetingType === 'offline' ? location.trim() : undefined,
        meetingLink: meetingType === 'online' ? meetingLink.trim() : undefined,
        status: status.toUpperCase() as Meeting['status'],
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

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('end')} *</label>
            <input type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setErrorMsg(''); }}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('meeting_time')} *</label>
            <input type="time" value={endTimeInput}
              onChange={(e) => { setEndTimeInput(e.target.value); setErrorMsg(''); }}
              className={inputClass} />
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
            <option value="scheduled">{t('scheduled')}</option>
            <option value="in_progress">{t('in_progress')}</option>
            <option value="completed">{t('completed')}</option>
            <option value="cancelled">{t('cancelled')}</option>
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

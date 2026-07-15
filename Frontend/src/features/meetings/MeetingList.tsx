/**
 * MeetingList — top-level meeting management view.
 *
 * Layout:
 *   1. Header with view toggle (List / Calendar) and "New meeting" CTA.
 *   2. List view: phase filter tabs + grouped sections (Upcoming / Ongoing / Ended).
 *   3. Calendar view: delegates to MeetingCalendar.
 *   4. Mounts the Add / Edit / Detail / Decline / Delete modals.
 *
 * Realtime updates are pushed by the chat socket (meeting.created,
 * meeting.updated, etc.) — see the effect below.
 *
 * Sub-components (MeetingCard, MeetingSection, MeetingDetailModal,
 * DeclineMeetingModal, AddMeetingModal, EditMeetingModal) and helpers
 * (STATUS_VARIANTS, formatDateTime, getStatusLabel) live in their own
 * files in this folder.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus,
  Video,
  List,
  CalendarDays,
  History,
  PlayCircle,
  LayoutList,
} from 'lucide-react';
import {
  getMeetings,
  deleteMeeting as apiDeleteMeeting,
  rsvpMeeting,
  addMeetingAttendees,
  removeMeetingAttendee,
  joinMeeting,
  classifyMeeting,
  isMeetingJoinable,
} from '@/api/meeting.api';
import { getProjectMembers } from '@/api/member.api';
import { projectService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import type { Meeting, ProjectMember } from '@/types';
import { Button, Modal, useToast, EmptyState } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChatSocket } from '@/contexts/ChatSocketContext';
import MeetingCalendar from './MeetingCalendar';
import MeetingSection from './MeetingSection';
import MeetingDetailModal from './MeetingDetailModal';
import DeclineMeetingModal from './DeclineMeetingModal';
import AddMeetingModal from './AddMeetingModal';
import EditMeetingModal from './EditMeetingModal';
import type { DisplayView, PhaseFilter } from './helpers';

const PHASE_TABS: { id: PhaseFilter; icon: typeof CalendarDays }[] = [
  { id: 'ALL', icon: LayoutList },
  { id: 'UPCOMING', icon: CalendarDays },
  { id: 'ONGOING', icon: PlayCircle },
  { id: 'ENDED', icon: History },
];

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
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('ALL');
  // `now` tick mỗi 30s để phase ONGOING -> ENDED chuyển đúng lúc khi user
  // đang mở trang (không cần đợi reload).
  const [now, setNow] = useState<Date>(() => new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Meeting | null>(null);

  // canEdit is true when we have resolved role info and user is OWNER/SUPERVISOR
  const canEdit = (meeting: Meeting) => {
    if (currentUserRole === '' || currentUserRole === 'MEMBER') return false;
    if (currentUserIsOwner) return true;
    if (currentUserRole === 'SUPERVISOR') return meeting.organizer.id === authUser?.id;
    return false;
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

  // Tick mỗi 30 giây để chuyển trạng thái UPCOMING/ONGOING/ENDED theo giờ thực.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Phân nhóm meeting theo phase hiện tại. useMemo để tránh tính lại mỗi render.
  const groupedMeetings = useMemo(() => {
    const upcoming: Meeting[] = [];
    const ongoing: Meeting[] = [];
    const ended: Meeting[] = [];
    for (const m of meetings) {
      const phase = classifyMeeting(m, now);
      if (phase === 'UPCOMING') upcoming.push(m);
      else if (phase === 'ONGOING') ongoing.push(m);
      else ended.push(m);
    }
    // Sắp xếp: sắp tới theo startTime tăng dần (gần nhất trước),
    // đang diễn ra + đã kết thúc theo startTime giảm dần (mới nhất trước).
    upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    ongoing.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    ended.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return { upcoming, ongoing, ended };
  }, [meetings, now]);

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

  /**
   * Click vào link meeting: luôn hỏi server trước để server xác nhận còn
   * trong thời gian hợp lệ. Nếu server từ chối (đã kết thúc / bị huỷ / chưa tới
   * giờ) thì hiện toast lỗi — đảm bảo quy tắc "không cho click sau khi kết thúc"
   * được thực thi ở cả client lẫn server.
   */
  const handleJoinMeeting = (meeting: Meeting) => {
    if (!projectId) return;
    if (!isMeetingJoinable(meeting, now)) {
      const phase = classifyMeeting(meeting, now);
      if (phase === 'ENDED') toast(t('meeting_ended_cant_join'), 'error');
      else if (phase === 'UPCOMING') toast(t('meeting_not_started'), 'error');
      else toast(t('meeting_cancelled'), 'error');
      return;
    }
    joinMeeting(projectId, meeting.id)
      .then(({ meetingLink }) => window.open(meetingLink, '_blank', 'noopener,noreferrer'))
      .catch((err: { message?: string }) => {
        toast(err?.message || t('meeting_ended_cant_join'), 'error');
      });
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
        <div className="bg-surface rounded-xl border border-border p-8">
          <EmptyState
            icon={<Video className="h-7 w-7 text-ink-muted" />}
            title={t('no_meetings') || 'Chưa có cuộc họp'}
            description={t('no_meetings_yet') || 'Chưa có cuộc họp nào được lên lịch.'}
            actionLabel={currentUserRole !== '' ? t('new_meeting') || 'Lên lịch họp' : undefined}
            onAction={currentUserRole !== '' ? () => setIsAddOpen(true) : undefined}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Phase filter tabs */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-1.5 w-fit">
            {PHASE_TABS.map(({ id, icon: Icon }) => {
              const active = phaseFilter === id;
              const count =
                id === 'ALL'
                  ? meetings.length
                  : id === 'UPCOMING'
                  ? groupedMeetings.upcoming.length
                  : id === 'ONGOING'
                  ? groupedMeetings.ongoing.length
                  : groupedMeetings.ended.length;
              const labelKey =
                id === 'ALL'
                  ? 'meeting_filter_all'
                  : id === 'UPCOMING'
                  ? 'meeting_filter_upcoming'
                  : id === 'ONGOING'
                  ? 'meeting_filter_ongoing'
                  : 'meeting_filter_ended';
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPhaseFilter(id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-ink-muted hover:bg-surface-strong hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                  <span
                    className={`ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                      active ? 'bg-white/20 text-white' : 'bg-ink-muted/10 text-ink-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {phaseFilter === 'ALL' || phaseFilter === 'UPCOMING' ? (
            <MeetingSection
              title={t('meeting_section_upcoming')}
              icon={<CalendarDays className="h-4 w-4" />}
              emptyHint={t('meeting_section_upcoming_empty')}
              meetings={groupedMeetings.upcoming}
              now={now}
              projectMembers={projectMembers}
              authUserId={authUser?.id ?? ''}
              currentUserRole={currentUserRole}
              canEdit={canEdit}
              onSelect={setDetailMeeting}
              onEdit={setEditingMeeting}
              onDelete={setDeleteTarget}
              onJoin={handleJoinMeeting}
              onRsvp={(meeting, willAttend) => handleConfirmAttendance(meeting, willAttend)}
              onDecline={setDeclineTarget}
            />
          ) : null}

          {phaseFilter === 'ALL' || phaseFilter === 'ONGOING' ? (
            <MeetingSection
              title={t('meeting_section_ongoing')}
              icon={<PlayCircle className="h-4 w-4" />}
              emptyHint={t('meeting_section_ongoing_empty')}
              meetings={groupedMeetings.ongoing}
              now={now}
              projectMembers={projectMembers}
              authUserId={authUser?.id ?? ''}
              currentUserRole={currentUserRole}
              canEdit={canEdit}
              onSelect={setDetailMeeting}
              onEdit={setEditingMeeting}
              onDelete={setDeleteTarget}
              onJoin={handleJoinMeeting}
              onRsvp={(meeting, willAttend) => handleConfirmAttendance(meeting, willAttend)}
              onDecline={setDeclineTarget}
            />
          ) : null}

          {phaseFilter === 'ALL' || phaseFilter === 'ENDED' ? (
            <MeetingSection
              title={t('meeting_section_ended')}
              icon={<History className="h-4 w-4" />}
              emptyHint={t('meeting_section_ended_empty')}
              meetings={groupedMeetings.ended}
              now={now}
              projectMembers={projectMembers}
              authUserId={authUser?.id ?? ''}
              currentUserRole={currentUserRole}
              canEdit={canEdit}
              onSelect={setDetailMeeting}
              onEdit={setEditingMeeting}
              onDelete={setDeleteTarget}
              onJoin={handleJoinMeeting}
              onRsvp={(meeting, willAttend) => handleConfirmAttendance(meeting, willAttend)}
              onDecline={setDeclineTarget}
            />
          ) : null}
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
          onDelete={() => { setDetailMeeting(null); setDeleteTarget(detailMeeting); }}
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

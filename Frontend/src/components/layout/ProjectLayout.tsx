import { useEffect } from 'react';
import { Outlet, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { Info, CheckSquare, FileText, Users, Video, TrendingUp, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import AIChatDialog from '@/features/chat/AIChatDialog';

const projectTabs = [
  { to: '', icon: Info, labelKey: 'nav_overview' },
  { to: 'tasks', icon: CheckSquare, labelKey: 'nav_tasks' },
  { to: 'documents', icon: FileText, labelKey: 'nav_documents' },
  { to: 'members', icon: Users, labelKey: 'nav_members' },
  { to: 'meetings', icon: Video, labelKey: 'nav_meetings' },
  { to: 'chat', icon: MessageCircle, labelKey: 'nav_chat' },
  { to: 'performance', icon: TrendingUp, labelKey: 'nav_performance' },
] as const;

export default function ProjectLayout() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const taskId = searchParams.get('taskId');
    const meetingId = searchParams.get('meetingId');

    if (taskId) {
      // TODO: Fetch task by taskId and open TaskModal
      console.log(`[Deep Link] Navigate/Open Task Modal for task: ${taskId}`);
    }

    if (meetingId) {
      // TODO: Fetch meeting by meetingId and open MeetingDetailModal
      console.log(`[Deep Link] Navigate/Open Meeting Modal for meeting: ${meetingId}`);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col">
      <nav className="mb-6 border-b border-border" aria-label="Project navigation">
        <ul className="-mb-px flex items-center gap-1">
          {projectTabs.map(({ to, icon: Icon, labelKey }) => (
            <li key={to || 'overview'}>
              <NavLink
                to={to}
                end={to === ''}
                className={({ isActive }) =>
                  `flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-ink-muted hover:border-border-strong hover:text-ink'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {t(labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
      {projectId && <AIChatDialog projectId={projectId} />}
    </div>
  );
}

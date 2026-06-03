import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, Search, Users, Loader2 } from 'lucide-react';
import { getPerformance } from '@/api/member.api';
import { getProject } from '@/api/project.api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MemberPerformance, MemberEvaluation, Project } from '@/types';
import ProgressBar from '@/components/ui/ProgressBar';
import MemberPerformanceCard from './MemberPerformanceCard';

export default function PerformancePage() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [performanceList, setPerformanceList] = useState<MemberPerformance[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, MemberEvaluation>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectData, perfData] = await Promise.all([
        getProject(projectId),
        getPerformance(projectId),
      ]);
      setProject(projectData as Project | null);
      setPerformanceList(
        perfData.map((p) => ({
          ...p,
          member: {
            id: p.member.id,
            name: p.member.fullName,
            fullName: p.member.fullName,
            email: '', // API doesn't expose email in performance response
            avatar: p.member.avatar ?? '',
          },
        })),
      );
    } catch {
      setProject(null);
      setPerformanceList([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = memberSearch.trim()
    ? performanceList.filter(p =>
        p.member.fullName.toLowerCase().includes(memberSearch.toLowerCase()),
      )
    : performanceList;

  const completedTasks = performanceList.reduce((sum, p) => sum + p.tasksCompleted, 0);
  const tasksInProgress = performanceList.reduce((sum, p) => sum + p.tasksInProgress, 0);
  const overdueTasks = performanceList.reduce((sum, p) => sum + (p.tasksTodo > 0 ? 1 : 0), 0);
  const totalTasks = completedTasks + tasksInProgress + performanceList.reduce((sum, p) => sum + p.tasksTodo, 0);
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleSave = (memberId: string, rating: number, feedback: string) => {
    setEvaluations(prev => ({
      ...prev,
      [memberId]: { rating, feedback, evaluatedAt: new Date().toISOString() },
    }));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-ink-muted">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-ink">{t('performance')}</h1>
          {project && <p className="text-sm text-ink-muted">{project.name}</p>}
        </div>
      </div>

      {project && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-semibold text-ink">{t('completed_tasks')}</p>
            <p className="text-3xl font-bold text-success">{completedTasks}</p>
            <p className="mt-1 text-xs text-ink-muted">/ {totalTasks} {t('nav_tasks')}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-semibold text-ink">{t('pending_tasks')}</p>
            <p className="text-3xl font-bold text-warning">{tasksInProgress}</p>
            <p className="mt-1 text-xs text-ink-muted">{t('in_progress_label')}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-semibold text-ink">{t('overdue_tasks')}</p>
            <p className="text-3xl font-bold text-danger">{overdueTasks}</p>
            <p className="mt-1 text-xs text-ink-muted">{t('need_attention')}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-semibold text-ink">{t('progress')}</p>
            <p className="text-3xl font-bold text-primary">{progressPct}%</p>
            <div className="mt-2">
              <ProgressBar value={progressPct} size="sm" />
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-ink">{t('nav_members')}</h2>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink-muted">{filtered.length}</span>
        </div>

        {performanceList.length > 3 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder={`${t('nav_members')}...`}
              className="ez-input w-full pl-9 text-sm"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <MemberPerformanceCard
              key={p.member.id}
              performance={p}
              evaluation={evaluations[p.member.id]}
              onSaveEvaluation={handleSave}
              projectMembers={project?.members ?? []}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-muted">{t('no_results')}</p>
        )}
      </div>
    </div>
  );
}

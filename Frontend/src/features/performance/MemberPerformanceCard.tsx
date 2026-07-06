/**
 * MemberPerformanceCard — Section 5 of plan
 *
 * Renders one card per project member with:
 *   - avatar + name + role badge
 *   - Performance Score (0-100)
 *   - Contribution % (vs team)
 *   - Rank (medal for top 3, numeric otherwise)
 *   - Completed / In Progress / Overdue tasks
 *   - Activity heatmap (compact)
 *
 * Clicking anywhere on the card opens the PerformanceDetailModal.
 */

import type { MemberPerformance, MemberEvaluation, ProjectMember } from '@/types';
import type { ProjectRole } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, ProjectMemberAvatar, Badge } from '@/components/ui';
import { CheckCircle, Clock, AlertTriangle, Eye } from 'lucide-react';
import { scoreToStatusVariant } from './utils';
import ActivityHeatmap from './ActivityHeatmap';
import RankingBadge from './RankingBadge';

interface MemberPerformanceCardProps {
  performance: MemberPerformance;
  /** Member's rank (1-based) within the project, sorted by score desc. */
  rank: number;
  /**
   * Score to display on the card — derived from the active ranking mode
   * (system / leader / supervisor / averages). May be null if the chosen
   * mode has no evaluation for this member yet.
   */
  displayScore: number | null;
  /** Member's contribution % vs the team's total score (0-100). */
  contributionPct: number;
  /** Number of overdue tasks for this member — derived from project task list. */
  overdueTasks: number;
  /** All project members for ProjectMemberAvatar role badges. */
  projectMembers?: ProjectMember[];
  /** Latest evaluation, if any. */
  evaluation?: MemberEvaluation | null;
  /** Click handler — opens PerformanceDetailModal. */
  onOpen: () => void;
}

export default function MemberPerformanceCard({
  performance,
  rank,
  displayScore,
  contributionPct,
  overdueTasks,
  projectMembers = [],
  evaluation,
  onOpen,
}: MemberPerformanceCardProps) {
  const { t } = useLanguage();
  const { member, tasksCompleted, tasksInProgress, contributions } = performance;

  // Fall back to system score if the active ranking mode has no evaluation for this member.
  const score = displayScore ?? performance.score;
  const status = scoreToStatusVariant(score);

  const localMember = {
    id: member.id,
    name: member.fullName,
    fullName: member.fullName,
    email: member.email,
    avatar: member.avatar,
  };

  return (
    <article
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className="group flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {/* Header: avatar + name + rank */}
      <header className="flex items-center gap-3">
        <ProjectMemberAvatar member={localMember} projectMembers={projectMembers} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{member.fullName}</p>
          <p className="truncate text-[11px] text-ink-muted">
            {roleLabel(t, performance.role as ProjectRole, performance.isOwner)}
          </p>
        </div>
        <RankingBadge rank={rank} />
      </header>

      {/* Performance score + contribution */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-canvas px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {t('perf_score')}
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-lg font-bold tabular-nums text-${status.variant}`}>
              {score}
            </span>
            <span className="text-[10px] text-ink-muted">{t('perf_score_out_of')}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-canvas px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {t('contribution')}
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-bold tabular-nums text-primary">
              {contributionPct}
            </span>
            <span className="text-[10px] text-ink-muted">%</span>
          </div>
        </div>
      </div>

      {/* Task counts */}
      <div className="grid grid-cols-3 gap-2">
        <TaskMini icon={CheckCircle} value={tasksCompleted} label={t('completed_tasks')} tone="text-success" />
        <TaskMini icon={Clock} value={tasksInProgress} label={t('in_progress_tasks')} tone="text-warning" />
        <TaskMini icon={AlertTriangle} value={overdueTasks} label={t('overdue_tasks')} tone="text-danger" />
      </div>

      {/* Heatmap (compact) */}
      <ActivityHeatmap contributions={contributions} compact />

      {/* Optional evaluation hint */}
      {evaluation?.feedback && (
        <Badge variant="primary" className="self-start">
          {t('evaluated_feedback')}
        </Badge>
      )}

      {/* Footer action — opens the Performance Detail Modal.
          stopPropagation() để không double-trigger với onClick của <article>. */}
      <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="primary"
          size="sm"
          onClick={onOpen}
          className="w-full"
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          {t('view_details')}
        </Button>
      </div>
    </article>
  );
}

function TaskMini({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof CheckCircle;
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-canvas px-2 py-2 text-center">
      <Icon className={`mx-auto h-3.5 w-3.5 ${tone}`} />
      <p className="mt-1 text-sm font-bold tabular-nums text-ink">{value}</p>
      <p className="text-[10px] leading-tight text-ink-muted">{label}</p>
    </div>
  );
}

/** Returns the member's role label, falling back to "Thành viên / Member". */
function roleLabel(
  t: (k: import('@/i18n/dict').DictKey) => string,
  role: ProjectRole,
  isOwner: boolean,
): string {
  const keyByRole: Record<ProjectRole, import('@/i18n/dict').DictKey> = {
    LEADER: 'role_leader',
    VICE_LEADER: 'role_vice_leader',
    SUPERVISOR: 'role_supervisor',
    MEMBER: 'role_member',
  };
  const base = t(keyByRole[role] ?? 'role_member');
  return isOwner && role === 'LEADER' ? `${base} (${t('owner')})` : base;
}
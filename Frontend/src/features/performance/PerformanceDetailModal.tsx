/**
 * PerformanceDetailModal — Section 7 of plan
 *
 * Detailed popup explaining a member's performance with 7 sections:
 *  7.1 Performance Summary  (score, rank, contribution, status)
 *  7.2 Work Summary          (assigned / completed / in progress / overdue / completion rate)
 *  7.3 Deadline Analysis     (on-time / late / avg delay) — placeholder until backend support
 *  7.4 Recent Activities     (timeline, fetched via getActivities filtered to member)
 *  7.5 Contribution Heatmap  (reuses ActivityHeatmap)
 *  7.6 Contribution Breakdown (percentage by category)
 *  7.7 Contribution Evidence (counted from existing project data)
 */

import { useMemo } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  PlayCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  MessageCircle,
  FileUp,
  Award,
} from 'lucide-react';
import type {
  MemberPerformance,
  MemberEvaluation,
  ProjectMember,
  ProjectRole,
  Task,
  Activity,
  DetailedEvaluation,
} from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal, ProjectMemberAvatar, Badge, ProgressBar } from '@/components/ui';
import ActivityHeatmap from './ActivityHeatmap';
import RankingBadge from './RankingBadge';
import ComparisonCard from './ComparisonCard';
import EvaluationSection from './EvaluationSection';
import {
  breakdownToPercentages,
  computeBreakdown,
  computeContributionShare,
  scoreToStatusVariant,
} from './utils';

interface PerformanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  performance: MemberPerformance;
  rank: number;
  totalTeamScore: number;
  /** Project id — required so the evaluation sub-sections can call the right API. */
  projectId: string;
  /** All project tasks — used for work summary + deadline analysis placeholder. */
  tasks: Task[];
  /** Project-wide activity feed (already fetched at the page level — see Section 7.4). */
  activities: Activity[];
  projectMembers?: ProjectMember[];
  evaluation?: MemberEvaluation | null;
  leaderEvaluation: DetailedEvaluation | null;
  supervisorEvaluation: DetailedEvaluation | null;
  currentUserRole: ProjectRole | null;
  onLeaderEvaluationUpdated: (next: DetailedEvaluation) => void;
  onSupervisorEvaluationUpdated: (next: DetailedEvaluation) => void;
}

export default function PerformanceDetailModal({
  isOpen,
  onClose,
  performance,
  rank,
  totalTeamScore,
  projectId,
  tasks,
  activities,
  projectMembers = [],
  evaluation,
  leaderEvaluation,
  supervisorEvaluation,
  currentUserRole,
  onLeaderEvaluationUpdated,
  onSupervisorEvaluationUpdated,
}: PerformanceDetailModalProps) {
  const { t, lang } = useLanguage();
  const { member, tasksCompleted, tasksInProgress, contributions, score } = performance;

  const localMember = {
    id: member.id,
    name: member.fullName,
    fullName: member.fullName,
    email: member.email,
    avatar: member.avatar,
  };

  const status = scoreToStatusVariant(score);
  const statusLabelKey = {
    excellent: 'status_excellent',
    good: 'status_good',
    average: 'status_average',
    needsImprovement: 'status_needs_improvement',
  }[status.tone] as 'status_excellent' | 'status_good' | 'status_average' | 'status_needs_improvement';

  const contributionPct = computeContributionShare(score, totalTeamScore);

  // ── 7.2 Work Summary ─────────────────────────────────────────
  const myTasks = useMemo(
    () => tasks.filter((task) => task.assignee?.id === performance.member.id),
    [tasks, performance.member.id],
  );
  const now = Date.now();
  const myOverdue = myTasks.filter(
    (tk) =>
      tk.status !== 'DONE' &&
      tk.status !== 'CANCELLED' &&
      tk.deadline != null &&
      new Date(tk.deadline).getTime() < now,
  ).length;
  const myCompletionRate =
    myTasks.length > 0 ? Math.round((tasksCompleted / myTasks.length) * 100) : 0;

  // ── 7.4 Recent Activities (filter project-wide feed to this member) ──
  const myActivities = useMemo(
    () =>
      [...activities]
        .filter((a) => a.user.id === performance.member.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10),
    [activities, performance.member.id],
  );

  // ── 7.6 Contribution Breakdown ───────────────────────────────
  const breakdown = useMemo(() => computeBreakdown(performance), [performance]);
  const breakdownPct = useMemo(() => breakdownToPercentages(breakdown), [breakdown]);

  // ── 7.7 Contribution Evidence ────────────────────────────────
  // Each evidence item is sourced exclusively from the backend performance
  // payload — no values are invented. If a metric isn't tracked yet, the
  // item is omitted (TODO notes mark future API additions).
  const evidence = useMemo(
    () => [
      {
        icon: CheckCircle2,
        label: t('evidence_completed_task'),
        count: performance.tasksCompleted,
        tone: 'text-success',
      },
      {
        icon: FileUp,
        label: t('evidence_uploaded_doc'),
        count: performance.documentsUploaded,
        tone: 'text-primary',
      },
      {
        icon: MessageCircle,
        label: t('evidence_commented'),
        count: performance.commentsCount,
        tone: 'text-secondary',
      },
      // TODO(backend): expose `tasksCreatedByMember` so we can surface
      //   "Created N tasks" as a separate evidence item.
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [performance, lang],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('member_detail_title')}: ${member.fullName}`}
      size="lg"
      bodyScrollable
    >
      <div className="space-y-6">
        {/* 7.1 Performance Summary */}
        <section aria-labelledby="perf-summary-heading">
          <h3 id="perf-summary-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Award className="h-4 w-4 text-primary" />
            {t('perf_score')}
          </h3>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ProjectMemberAvatar member={localMember} projectMembers={projectMembers} size="lg" />
                <div>
                  <p className="text-base font-semibold text-ink">{member.fullName}</p>
                  <p className="text-xs text-ink-muted truncate max-w-[200px]">{member.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RankingBadge rank={rank} variant="both" size="md" />
                <Badge variant={status.variant}>{t(statusLabelKey)}</Badge>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <SummaryStat label={t('perf_score')} value={`${score}/100`} accent={status.variant} />
              <SummaryStat
                label={t('rank_label')}
                value={rank > 0 ? `#${rank}` : t('no_rank')}
                accent="default"
              />
              <SummaryStat
                label={t('contribution')}
                value={`${contributionPct}%`}
                accent="primary"
              />
            </div>

            {evaluation?.feedback && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary-50 px-4 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-primary">{t('evaluated_feedback')}</p>
                  {evaluation.rating > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                      {evaluation.rating}/5
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-ink-secondary">{evaluation.feedback}</p>
              </div>
            )}
          </div>
        </section>

        {/* 8.1 Comparison Card — surfaces System / Leader / Supervisor scores side-by-side. */}
        <ComparisonCard
          systemScore={score}
          leaderEvaluation={leaderEvaluation}
          supervisorEvaluation={supervisorEvaluation}
          hasEvidence={
            performance.tasksCompleted +
              performance.documentsUploaded +
              performance.commentsCount +
              performance.tasksInProgress >
            0
          }
        />

        {/* 7.8 Leader Evaluation */}
        {currentUserRole && projectId && (
          <EvaluationSection
            kind="leader"
            projectId={projectId}
            memberId={performance.member.id}
            memberName={member.fullName}
            currentUserRole={currentUserRole}
            evaluation={leaderEvaluation}
            onUpdated={onLeaderEvaluationUpdated}
          />
        )}

        {/* 7.9 Supervisor Evaluation */}
        {currentUserRole && projectId && (
          <EvaluationSection
            kind="supervisor"
            projectId={projectId}
            memberId={performance.member.id}
            memberName={member.fullName}
            currentUserRole={currentUserRole}
            evaluation={supervisorEvaluation}
            onUpdated={onSupervisorEvaluationUpdated}
          />
        )}

        {/* 7.2 Work Summary */}
        <section aria-labelledby="work-summary-heading">
          <h3 id="work-summary-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <ClipboardList className="h-4 w-4 text-primary" />
            {t('work_summary')}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <WorkStat icon={ClipboardList} label={t('assigned_tasks')} value={myTasks.length} tone="text-ink" />
            <WorkStat icon={CheckCircle2} label={t('completed_tasks')} value={tasksCompleted} tone="text-success" />
            <WorkStat icon={PlayCircle} label={t('in_progress_tasks')} value={tasksInProgress} tone="text-warning" />
            <WorkStat icon={AlertTriangle} label={t('overdue_tasks')} value={myOverdue} tone="text-danger" />
            <WorkStat icon={TrendingUp} label={t('completion_rate')} value={`${myCompletionRate}%`} tone="text-primary" />
          </div>
          {myTasks.length > 0 && (
            <div className="mt-3">
              <ProgressBar value={myCompletionRate} size="sm" />
            </div>
          )}
        </section>

        {/* 7.3 Deadline Analysis */}
        <section aria-labelledby="deadline-analysis-heading">
          <h3 id="deadline-analysis-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock className="h-4 w-4 text-primary" />
            {t('deadline_analysis')}
          </h3>
          {/* TODO(backend): currently no `completedAt` is stored on the Task model,
              and the performance endpoint doesn't return completed tasks with timestamps.
              Once backend exposes these, compute on-time rate here from real data only. */}
          <div className="rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-center">
            <p className="text-sm text-ink-muted">{t('no_deadline_data')}</p>
            <p className="mt-1 text-[11px] text-ink-muted/80">{t('no_deadline_data_hint')}</p>
          </div>
        </section>

        {/* 7.4 Recent Activities */}
        <section aria-labelledby="recent-activities-heading">
          <h3 id="recent-activities-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock className="h-4 w-4 text-primary" />
            {t('recent_activities')}
          </h3>
          {myActivities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-center">
              <p className="text-sm text-ink-muted">{t('no_recent_activities')}</p>
            </div>
          ) : (
            <ol className="relative space-y-2 border-l border-border pl-4">
              {myActivities.map((act) => (
                <li key={act.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 inline-block h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm text-ink-secondary">
                    <span className="font-semibold text-ink">{act.action}</span>{' '}
                    <span className="font-medium text-ink">{act.target}</span>
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {new Date(act.timestamp).toLocaleString(
                      lang === 'vi' ? 'vi-VN' : 'en-US',
                      { dateStyle: 'medium', timeStyle: 'short' },
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* 7.5 Contribution Heatmap */}
        <section aria-labelledby="contrib-heatmap-heading">
          <h3 id="contrib-heatmap-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t('activity_heatmap')}
          </h3>
          <ActivityHeatmap contributions={contributions} />
        </section>

        {/* 7.6 Contribution Breakdown */}
        <section aria-labelledby="contrib-breakdown-heading">
          <h3 id="contrib-breakdown-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t('contribution_breakdown')}
          </h3>
          {breakdown.total > 0 ? (
            <div className="space-y-2.5 rounded-xl border border-border bg-surface p-4">
              <BreakdownBar
                label={t('cat_tasks_completion')}
                pct={breakdownPct.tasksCompletion}
                count={breakdown.tasksCompletion}
                barClass="bg-emerald-500"
              />
              <BreakdownBar
                label={t('cat_documents')}
                pct={breakdownPct.documents}
                count={breakdown.documents}
                barClass="bg-primary"
              />
              <BreakdownBar
                label={t('cat_comments')}
                pct={breakdownPct.comments}
                count={breakdown.comments}
                barClass="bg-secondary"
              />
              <BreakdownBar
                label={t('cat_meetings')}
                pct={breakdownPct.meetings}
                count={breakdown.meetings}
                barClass="bg-amber-500"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-center">
              <p className="text-sm text-ink-muted">{t('contribution_breakdown_no_data')}</p>
            </div>
          )}
        </section>

        {/* 7.7 Contribution Evidence */}
        <section aria-labelledby="contrib-evidence-heading">
          <h3 id="contrib-evidence-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t('contribution_evidence')}
          </h3>
          <ul className="space-y-2">
            {evidence.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${item.tone}`} />
                  <span className="flex-1 text-sm text-ink-secondary">{item.label}</span>
                  <span className="text-sm font-bold tabular-nums text-ink">{item.count}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </Modal>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'success' | 'warning' | 'danger' | 'primary' | 'default';
}) {
  const accentClass: Record<typeof accent, string> = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    primary: 'text-primary',
    default: 'text-ink',
  };
  return (
    <div className="rounded-lg border border-border bg-canvas px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${accentClass[accent]}`}>{value}</p>
    </div>
  );
}

function WorkStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function BreakdownBar({
  label,
  pct,
  count,
  barClass,
}: {
  label: string;
  pct: number;
  count: number;
  barClass: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-ink-secondary">{label}</span>
        <span className="tabular-nums text-ink-muted">
          {pct}% <span className="text-ink-muted/70">({count})</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full rounded-full transition-all duration-500 ease-out ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
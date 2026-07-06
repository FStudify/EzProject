/**
 * PerformancePage — Performance Analytics Module (plan-hieusuat.md)
 *
 * Layout:
 *   1. Header (project name)
 *   2. Team Overview Stats (5 summary cards)
 *   3. Member Performance Cards (one per member, sorted by rank)
 *   4. Click a card → Performance Detail Modal:
 *        - Performance Summary
 *        - Comparison Card (System / Leader / Supervisor)
 *        - Leader Evaluation (§7.8)
 *        - Supervisor Evaluation (§7.9)
 *        - Work Summary, Deadline Analysis, Recent Activities,
 *          Contribution Heatmap, Breakdown, Evidence.
 *
 * Reuses existing APIs: getPerformance, getProject, getTasks,
 * getActivities, getLeaderEvaluation, getSupervisorEvaluation.
 * All metrics are derived from real data — see `utils.ts` for the helpers.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, Search, Users, Loader2, ScrollText, ArrowUpDown } from 'lucide-react';
import { getPerformance, getActivities, getLeaderEvaluation, getSupervisorEvaluation } from '@/api/member.api';
import { getProject } from '@/api/project.api';
import { getTasks } from '@/api/task.api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui';
import type { MemberEvaluation, Project, ProjectRole, Task, Activity, DetailedEvaluation } from '@/types';
import TeamOverviewStats from './TeamOverviewStats';
import MemberPerformanceCard from './MemberPerformanceCard';
import PerformanceDetailModal from './PerformanceDetailModal';
import PerformanceRulesModal from './PerformanceRulesModal';
import {
  computeContributionShare,
  rankByScore,
  rankByPicker,
  buildScorePicker,
  displayScorePicker,
  type RankMode,
  type ScorePicker,
} from './utils';

export default function PerformancePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [performanceList, setPerformanceList] = useState<import('@/api/types').MemberPerformance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  /**
   * In-page evaluation cache keyed by memberId. The existing
   * `evaluateMember` API writes to the server; this map lets the UI
   * reflect the just-saved evaluation without a refetch.
   * Currently unused — kept for future quick-evaluate from the detail modal.
   */
  const [evaluations] = useState<Record<string, MemberEvaluation>>({});
  const [leaderEvaluations, setLeaderEvaluations] = useState<Record<string, DetailedEvaluation>>({});
  const [supervisorEvaluations, setSupervisorEvaluations] = useState<Record<string, DetailedEvaluation>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [rankingMode, setRankingMode] = useState<RankMode>('system');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectData, perfData, taskData, activityData] = await Promise.all([
        getProject(projectId),
        getPerformance(projectId),
        getTasks(projectId),
        getActivities(projectId, 100),
      ]);
      setProject(projectData as Project | null);
      setPerformanceList(perfData);
      setTasks(taskData as Task[]);
      setActivities(activityData);

      // Best-effort: try to fetch the latest Leader + Supervisor
      // evaluations for every project member. If a particular call
      // fails (e.g. older backend build) we keep the map empty.
      try {
        const results = await Promise.allSettled(
          perfData.flatMap((p) => [
            getLeaderEvaluation(projectId, p.member.id).then((r) => ({ kind: 'leader' as const, id: p.member.id, r })),
            getSupervisorEvaluation(projectId, p.member.id).then((r) => ({ kind: 'supervisor' as const, id: p.member.id, r })),
          ]),
        );
        const leader: Record<string, DetailedEvaluation> = {};
        const supervisor: Record<string, DetailedEvaluation> = {};
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          const { kind, id, r: list } = r.value;
          if (list?.latest) {
            if (kind === 'leader') leader[id] = list.latest;
            else supervisor[id] = list.latest;
          }
        }
        setLeaderEvaluations(leader);
        setSupervisorEvaluations(supervisor);
      } catch {
        // Soft fail — Comparison Card will simply show "—" for missing entries.
      }
    } catch {
      setProject(null);
      setPerformanceList([]);
      setTasks([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Resolve the current viewer's role inside this project.
  const currentUserRole: ProjectRole | null = useMemo(() => {
    const uid = user?.id;
    if (!uid) return null;
    const me = performanceList.find((p) => p.member.id === uid);
    return me?.role ?? null;
  }, [user, performanceList]);

  // ── Derived ──────────────────────────────────────────────────
  // The ranking view supports multiple lenses: system (default), Leader,
  // Supervisor, and 2-averages. Re-rank automatically when the user
  // picks a different mode.
  // SUPERVISOR members do not appear in performance rankings.
  const rankedPerformance = useMemo(
    () => performanceList.filter((p) => p.role !== 'SUPERVISOR'),
    [performanceList],
  );

  const ranks = useMemo(
    () =>
      rankByPicker(
        rankedPerformance,
        buildScorePicker(rankingMode, leaderEvaluations, supervisorEvaluations),
      ),
    [rankedPerformance, leaderEvaluations, supervisorEvaluations, rankingMode],
  );

  /** Score picker for the active ranking mode — used to display the right score on cards. */
  const displayPicker = useMemo<ScorePicker>(
    () => displayScorePicker(rankingMode, leaderEvaluations, supervisorEvaluations),
    [rankingMode, leaderEvaluations, supervisorEvaluations],
  );

  /** Backwards-compatible alias — used by the detail modal. */
  const systemRanks = useMemo(() => rankByScore(rankedPerformance), [rankedPerformance]);
  const totalTeamScore = useMemo(
    () => rankedPerformance.reduce((sum, p) => sum + p.score, 0),
    [rankedPerformance],
  );

  // Overdue task count per member (used in card grid).
  const overdueByMember = useMemo(() => {
    const map = new Map<string, number>();
    const now = Date.now();
    for (const tk of tasks) {
      if (
        tk.assignee?.id &&
        tk.status !== 'DONE' &&
        tk.status !== 'CANCELLED' &&
        tk.deadline != null &&
        new Date(tk.deadline).getTime() < now
      ) {
        map.set(tk.assignee.id, (map.get(tk.assignee.id) ?? 0) + 1);
      }
    }
    return map;
  }, [tasks]);

  const filtered = useMemo(() => {
    // SUPERVISOR role members do not appear in performance rankings.
    const ranked = performanceList.filter((p) => p.role !== 'SUPERVISOR');
    const list = memberSearch.trim()
      ? ranked.filter((p) =>
          p.member.fullName.toLowerCase().includes(memberSearch.toLowerCase()),
        )
      : ranked;
    // Always render by rank ascending (top performer first).
    return [...list].sort(
      (a, b) => (ranks.get(a.member.id) ?? 0) - (ranks.get(b.member.id) ?? 0),
    );
  }, [performanceList, memberSearch, ranks]);

  const selectedPerformance =
    selectedMemberId != null
      ? performanceList.find((p) => p.member.id === selectedMemberId) ?? null
      : null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-ink-muted">{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-ink">{t('performance')}</h1>
            {project && <p className="text-sm text-ink-muted">{project.name}</p>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRules(true)}
          className="ml-auto"
        >
          <ScrollText className="mr-1.5 h-4 w-4" />
          {t('performance_rules')}
        </Button>
      </div>

      {/* 4. Team Overview */}
      <TeamOverviewStats performanceList={performanceList} tasks={tasks} />

      {/* 5. Member Performance Cards */}
      <section aria-labelledby="member-cards-heading">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 id="member-cards-heading" className="text-sm font-semibold text-ink">
              {t('ranking_label')}
            </h2>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink-muted">
              {filtered.length}
            </span>
          </div>

          {performanceList.length > 0 && (
            <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:flex-nowrap">
              {/* Ranking-mode picker — same height as search input */}
              <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface pl-2.5 pr-1 text-xs text-ink-muted">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
                <label htmlFor="ranking-mode-select" className="sr-only">
                  {t('ranking_mode_label')}
                </label>
                <select
                  id="ranking-mode-select"
                  value={rankingMode}
                  onChange={(e) => setRankingMode(e.target.value as RankMode)}
                  className="h-full bg-transparent pr-1 text-xs font-medium text-ink outline-none"
                >
                  <option value="system">{t('ranking_mode_system')}</option>
                  <option value="leader">{t('ranking_mode_leader')}</option>
                  <option value="supervisor">{t('ranking_mode_supervisor')}</option>
                  <option value="leader_supervisor_avg">{t('ranking_mode_leader_supervisor_avg')}</option>
                  <option value="all_avg">{t('ranking_mode_all_avg')}</option>
                </select>
              </div>
              {/* Search — wider than the picker */}
              <div className="relative w-full min-w-0 flex-1 sm:w-80 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder={t('search_members')}
                  className="ez-input h-9 w-full !py-0 pl-9 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas px-4 py-10 text-center">
            <p className="text-sm text-ink-muted">{t('no_performance_data')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <MemberPerformanceCard
                key={p.member.id}
                performance={p}
                rank={ranks.get(p.member.id) ?? 0}
                displayScore={displayPicker(p)}
                contributionPct={computeContributionShare(p.score, totalTeamScore)}
                overdueTasks={overdueByMember.get(p.member.id) ?? 0}
                projectMembers={project?.members ?? []}
                evaluation={evaluations[p.member.id]}
                onOpen={() => setSelectedMemberId(p.member.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 7. Performance Detail Modal */}
      {selectedPerformance && projectId && (
        <PerformanceDetailModal
          isOpen={selectedMemberId != null}
          onClose={() => setSelectedMemberId(null)}
          performance={selectedPerformance}
          rank={systemRanks.get(selectedPerformance.member.id) ?? 0}
          totalTeamScore={totalTeamScore}
          projectId={projectId}
          tasks={tasks}
          activities={activities}
          projectMembers={project?.members ?? []}
          evaluation={evaluations[selectedPerformance.member.id]}
          leaderEvaluation={leaderEvaluations[selectedPerformance.member.id] ?? null}
          supervisorEvaluation={supervisorEvaluations[selectedPerformance.member.id] ?? null}
          currentUserRole={currentUserRole}
          onLeaderEvaluationUpdated={(next) =>
            setLeaderEvaluations((prev) => ({
              ...prev,
              [selectedPerformance.member.id]: next,
            }))
          }
          onSupervisorEvaluationUpdated={(next) =>
            setSupervisorEvaluations((prev) => ({
              ...prev,
              [selectedPerformance.member.id]: next,
            }))
          }
        />
      )}

      {/* Performance Rules Modal — quy tắc chấm điểm */}
      <PerformanceRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
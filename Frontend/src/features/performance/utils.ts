/**
 * ============================================================
 * Performance Analytics — derived metrics helpers
 * ============================================================
 *
 * Pure functions that compute lightweight, presentation-only
 * metrics from existing project data. They NEVER invent data —
 * any value they can't compute from the input is returned as
 * `null` so the UI can show a clear "no data" placeholder.
 */

import type { MemberPerformance, DetailedEvaluation } from '@/api/types';

export interface TeamTotals {
  total: number;
  completed: number;
  inProgress: number;
  /** Tasks not started or in review (still open). */
  todo: number;
  /** Tasks whose deadline has passed and status is not DONE/CANCELLED. */
  overdue: number;
  /** 0-100 — integer percentage of completed vs total. */
  completionRate: number;
}

export function computeTeamTotals(list: MemberPerformance[]): TeamTotals {
  let total = 0;
  let completed = 0;
  let inProgress = 0;
  let todo = 0;
  for (const m of list) {
    completed += m.tasksCompleted;
    inProgress += m.tasksInProgress;
    todo += m.tasksTodo;
  }
  total = completed + inProgress + todo;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Overdue is computed by the parent (it requires Task deadline data).
  return { total, completed, inProgress, todo, overdue: 0, completionRate };
}

/**
 * Sum a member's total contribution weight across the categories
 * that the backend actually tracks. Used for the percentage bars
 * in the contribution breakdown section.
 *
 * Per plan §7.6 the plan mentions Meetings — the current backend
 * doesn't expose meeting participation yet, so that category
 * starts at 0 until backend support lands (see TODO in modal).
 */
export interface ContributionBreakdown {
  tasksCompletion: number;
  documents: number;
  comments: number;
  /** Reserved for future: meeting participation (currently 0). */
  meetings: number;
  total: number;
}

export function computeBreakdown(m: MemberPerformance): ContributionBreakdown {
  const tasksCompletion = m.tasksCompleted;
  const documents = m.documentsUploaded;
  const comments = m.commentsCount;
  const meetings = 0; // TODO: wire to meeting API when available
  const total = tasksCompletion + documents + comments + meetings;
  return { tasksCompletion, documents, comments, meetings, total };
}

export function breakdownToPercentages(b: ContributionBreakdown): Record<
  'tasksCompletion' | 'documents' | 'comments' | 'meetings',
  number
> {
  if (b.total <= 0) {
    return { tasksCompletion: 0, documents: 0, comments: 0, meetings: 0 };
  }
  return {
    tasksCompletion: Math.round((b.tasksCompletion / b.total) * 100),
    documents: Math.round((b.documents / b.total) * 100),
    comments: Math.round((b.comments / b.total) * 100),
    meetings: Math.round((b.meetings / b.total) * 100),
  };
}

/** Map a 0-100 score into a status variant + i18n key. */
export function scoreToStatusVariant(
  score: number,
): { variant: 'success' | 'warning' | 'danger' | 'default'; tone: 'excellent' | 'good' | 'average' | 'needsImprovement' } {
  if (score >= 85) return { variant: 'success', tone: 'excellent' };
  if (score >= 70) return { variant: 'success', tone: 'good' };
  if (score >= 50) return { variant: 'warning', tone: 'average' };
  return { variant: 'danger', tone: 'needsImprovement' };
}

/** Sum score across members to derive each member's share of team contribution. */
export function computeContributionShare(score: number, totalScore: number): number {
  if (totalScore <= 0) return 0;
  return Math.round((score / totalScore) * 100);
}

/**
 * Sort options for the team ranking view. The default `system` rank uses
 * the auto-grading score. The others mix in Leader / Supervisor subjective
 * evaluations so managers can re-rank the same team by different lenses.
 *
 * Members without a leader/supervisor evaluation contribute `null` to
 * averages — they are sorted last regardless of direction.
 */
export type RankMode = 'system' | 'leader' | 'supervisor' | 'leader_supervisor_avg' | 'all_avg';

/** Score value extracted from a single (member, mode) pair. `null` = not yet evaluated. */
type ScoreValue = number | null;

/**
 * Re-exported as `displayScorePicker` so call sites can show the
 * active ranking-mode score on each card instead of always showing
 * the system score.
 */
export { buildScorePicker as displayScorePicker };

/** Picker returns the score to sort by for one member under `mode`. */
export type ScorePicker = (m: MemberPerformance) => ScoreValue;

/**
 * Default picker for `system` mode — uses the auto-graded score, always present.
 */
function systemScore(m: MemberPerformance): ScoreValue {
  return m.score;
}

/**
 * Picker factory: builds a picker that reads `leaderMap` / `supervisorMap`
 * for the chosen RankMode. Evaluations stored in the maps come from the
 * `getLeaderEvaluation` / `getSupervisorEvaluation` API calls performed
 * by the Performance page.
 */
export function buildScorePicker(
  mode: RankMode,
  leaderMap: Record<string, DetailedEvaluation>,
  supervisorMap: Record<string, DetailedEvaluation>,
): ScorePicker {
  if (mode === 'system') return systemScore;
  return (m) => {
    const id = m.member.id;
    const leader = leaderMap[id]?.totalScore ?? null;
    const supervisor = supervisorMap[id]?.totalScore ?? null;
    switch (mode) {
      case 'leader':
        return leader;
      case 'supervisor':
        return supervisor;
      case 'leader_supervisor_avg': {
        if (leader == null && supervisor == null) return null;
        const sum = (leader ?? 0) + (supervisor ?? 0);
        const count = (leader != null ? 1 : 0) + (supervisor != null ? 1 : 0);
        return sum / count;
      }
      case 'all_avg': {
        const sys = systemScore(m);
        if (sys == null && leader == null && supervisor == null) return null;
        const sum = (sys ?? 0) + (leader ?? 0) + (supervisor ?? 0);
        const count =
          (sys != null ? 1 : 0) + (leader != null ? 1 : 0) + (supervisor != null ? 1 : 0);
        return count === 0 ? null : sum / count;
      }
      default:
        return systemScore(m);
    }
  };
}

/**
 * Ranks `list` according to `picker`. Members whose picker returns
 * `null` (no evaluation available) are pushed to the bottom regardless
 * of the sort direction, so unrated members don't compete in a sorted
 * ranking.
 */
export function rankByPicker(list: MemberPerformance[], picker: ScorePicker): Map<string, number> {
  const sorted = [...list].sort((a, b) => {
    const av = picker(a);
    const bv = picker(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;   // unrated -> bottom
    if (bv == null) return -1;  // rated   -> above unrated
    if (av === bv) return 0;
    return bv - av;
  });
  const ranks = new Map<string, number>();
  let lastValue: ScoreValue = null;
  let lastRank = 0;
  sorted.forEach((m, idx) => {
    const v = picker(m);
    const rank = v !== null && v === lastValue ? lastRank : idx + 1;
    ranks.set(m.member.id, rank);
    lastValue = v;
    lastRank = rank;
  });
  return ranks;
}

/** Backwards-compatible alias — preserves existing call sites. */
export function rankByScore(list: MemberPerformance[]): Map<string, number> {
  return rankByPicker(list, systemScore);
}
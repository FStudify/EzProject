import { mockMembers } from './members';
import type { MemberPerformance, ContributionDay } from '../types';

function generateContributions(
  memberIndex: number,
  baseActivity: number
): ContributionDay[] {
  const contributions: ContributionDay[] = [];
  const startDate = new Date('2025-12-22');
  const endDate = new Date('2026-03-15');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
    const dayIndex = Math.floor((d.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    // Weekends have lower activity (0-1 contributions)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendFactor = isWeekend ? 0.3 : 1;

    // Deterministic variation: use member index and day index for pseudo-random but reproducible pattern
    const seed = (memberIndex * 31 + dayIndex * 7) % 100;
    const variation = (seed / 100) * 2; // 0-2 extra variance

    // Base count: most days 0-3, some 4-6 based on baseActivity and variation
    let count = Math.floor(baseActivity * weekendFactor + variation);
    if (seed > 85) count += 2; // Occasional spike
    if (seed < 15) count = Math.max(0, count - 1); // Occasional low day
    count = Math.min(6, Math.max(0, count));

    contributions.push({ date: dateStr, count });
  }

  return contributions;
}

export const mockPerformance: MemberPerformance[] = [
  {
    member: mockMembers[0],
    tasksCompleted: 8,
    tasksInProgress: 2,
    tasksTodo: 1,
    documentsUploaded: 4,
    commentsCount: 15,
    contributions: generateContributions(0, 2.5), // Alice - most active
    score: 92,
  },
  {
    member: mockMembers[1],
    tasksCompleted: 6,
    tasksInProgress: 1,
    tasksTodo: 2,
    documentsUploaded: 3,
    commentsCount: 10,
    contributions: generateContributions(1, 2.0),
    score: 78,
  },
  {
    member: mockMembers[2],
    tasksCompleted: 5,
    tasksInProgress: 2,
    tasksTodo: 1,
    documentsUploaded: 2,
    commentsCount: 8,
    contributions: generateContributions(2, 1.6),
    score: 72,
  },
  {
    member: mockMembers[3],
    tasksCompleted: 4,
    tasksInProgress: 1,
    tasksTodo: 2,
    documentsUploaded: 3,
    commentsCount: 12,
    contributions: generateContributions(3, 1.4),
    score: 68,
  },
  {
    member: mockMembers[4],
    tasksCompleted: 3,
    tasksInProgress: 1,
    tasksTodo: 1,
    documentsUploaded: 1,
    commentsCount: 5,
    contributions: generateContributions(4, 1.0), // Edward - least active
    score: 55,
  },
];

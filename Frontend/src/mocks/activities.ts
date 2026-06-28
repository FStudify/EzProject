import type { Activity } from '../types';
import { mockMembers } from './members';

export const mockActivities: Activity[] = [
  {
    id: 'act-1',
    projectId: 'proj-1',
    user: mockMembers[2],
    action: 'updated status of task',
    target: 'Build shopping cart component',
    timestamp: '2026-03-15T09:30:00Z',
  },
  {
    id: 'act-2',
    projectId: 'proj-3',
    user: mockMembers[3],
    action: 'added a comment',
    target: 'Finalize conclusion section',
    timestamp: '2026-03-14T16:20:00Z',
  },
  {
    id: 'act-3',
    projectId: 'proj-3',
    user: mockMembers[2],
    action: 'uploaded a document',
    target: 'Experiment Results',
    timestamp: '2026-03-12T11:45:00Z',
  },
  {
    id: 'act-4',
    projectId: 'proj-1',
    user: mockMembers[2],
    action: 'uploaded a document',
    target: 'Source Code v0.2',
    timestamp: '2026-03-10T16:45:00Z',
  },
  {
    id: 'act-5',
    projectId: 'proj-2',
    user: mockMembers[0],
    action: 'uploaded a document',
    target: 'User Research Notes',
    timestamp: '2026-03-08T10:00:00Z',
  },
  {
    id: 'act-6',
    projectId: 'proj-3',
    user: mockMembers[2],
    action: 'completed a task',
    target: 'Run experiments',
    timestamp: '2026-03-10T14:00:00Z',
  },
  {
    id: 'act-7',
    projectId: 'proj-2',
    user: mockMembers[4],
    action: 'assigned a task',
    target: 'Design color palette',
    timestamp: '2026-03-05T11:15:00Z',
  },
  {
    id: 'act-8',
    projectId: 'proj-1',
    user: mockMembers[1],
    action: 'completed a task',
    target: 'Implement product catalog API',
    timestamp: '2026-03-01T09:00:00Z',
  },
];

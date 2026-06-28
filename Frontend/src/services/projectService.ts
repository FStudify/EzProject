import { getProjects, getProject } from '@/api/project.api';
import { getTasks } from '@/api/task.api';
import { getDocuments } from '@/api/document.api';
import { getActivities } from '@/api/member.api';

export const projectService = {
  getAll: () => getProjects(),
  getById: (id: string) => getProject(id),
  getTasks: (projectId: string) => getTasks(projectId),
  getDocuments: (projectId: string) => getDocuments(projectId),
  getActivities: (projectId?: string) =>
    projectId ? getActivities(projectId) : Promise.resolve([]),
};

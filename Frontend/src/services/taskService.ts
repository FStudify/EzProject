import type { Task } from '../types';
import { mockTasks } from '../mocks/tasks';

const taskList: Task[] = [...mockTasks];

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const taskService = {
  getAll() {
    return [...taskList];
  },

  getByProject(projectId: string) {
    return taskList.filter((task) => task.projectId === projectId);
  },

  addTask(task: Omit<Task, 'id' | 'createdAt'>) {
    const newTask: Task = {
      ...task,
      id: generateId('task'),
      createdAt: new Date().toISOString(),
    };
    taskList.push(newTask);
    return newTask;
  },

  updateTask(updatedTask: Task) {
    const index = taskList.findIndex((task) => task.id === updatedTask.id);
    if (index === -1) return null;
    taskList[index] = { ...taskList[index], ...updatedTask };
    return taskList[index];
  },

  deleteTask(taskId: string) {
    const index = taskList.findIndex((task) => task.id === taskId);
    if (index !== -1) {
      taskList.splice(index, 1);
      return true;
    }
    return false;
  },
};

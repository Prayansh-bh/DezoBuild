import type { DependencyType } from '../constants/task-dependency.constants';

export interface TaskDependencyEntity {
  id: string;
  tenantId: string;
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: DependencyType;
  lagDays: number;
  createdAt: Date;
  updatedAt: Date;
  predecessorTask?: {
    id: string;
    name: string;
    status: string;
  };
  successorTask?: {
    id: string;
    name: string;
    status: string;
  };
}

export interface CreateTaskDependencyParams {
  id?: string;
  tenantId: string;
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType?: DependencyType;
  lagDays?: number;
}

export interface ITaskDependencyRepository {
  findById(tenantId: string, projectId: string, dependencyId: string): Promise<TaskDependencyEntity | null>;
  findByTasks(predecessorTaskId: string, successorTaskId: string): Promise<TaskDependencyEntity | null>;
  findAllByProject(tenantId: string, projectId: string): Promise<TaskDependencyEntity[]>;
  findByTaskId(tenantId: string, projectId: string, taskId: string): Promise<TaskDependencyEntity[]>;
  create(params: CreateTaskDependencyParams): Promise<TaskDependencyEntity>;
  delete(tenantId: string, projectId: string, dependencyId: string): Promise<void>;
}

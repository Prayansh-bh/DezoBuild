import type { TaskStatus, TaskPriority } from '../constants/task.constants';

export interface TaskEntity {
  id: string;
  tenantId: string;
  projectId: string;
  wbsNodeId: string | null;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  isMilestone: boolean;
  progressPct: number;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  assignedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  wbsNode?: {
    id: string;
    code: string;
    name: string;
  } | null;
  assignedUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  _count?: {
    predecessors?: number;
    successors?: number;
  };
}

export interface CreateTaskParams {
  id?: string;
  tenantId: string;
  projectId: string;
  wbsNodeId?: string | null;
  name: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  isMilestone?: boolean;
  progressPct?: number;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  assignedUserId?: string | null;
}

export interface UpdateTaskParams {
  wbsNodeId?: string | null;
  name?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  isMilestone?: boolean;
  progressPct?: number;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  assignedUserId?: string | null;
}

export interface TaskFilterParams {
  wbsNodeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  isMilestone?: boolean;
  assignedUserId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ITaskRepository {
  findById(tenantId: string, projectId: string, taskId: string): Promise<TaskEntity | null>;
  findMany(tenantId: string, projectId: string, filters?: TaskFilterParams): Promise<TaskEntity[]>;
  create(params: CreateTaskParams): Promise<TaskEntity>;
  update(tenantId: string, projectId: string, taskId: string, params: UpdateTaskParams): Promise<TaskEntity>;
  delete(tenantId: string, projectId: string, taskId: string): Promise<void>;
  countByProject(tenantId: string, projectId: string, filters?: TaskFilterParams): Promise<number>;
}

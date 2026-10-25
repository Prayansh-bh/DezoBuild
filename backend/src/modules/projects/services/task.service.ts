import type { PrismaClient } from '@prisma/client';
import type { ITaskRepository, TaskEntity } from '../repositories/task.repository.interface';
import { PrismaTaskRepository } from '../repositories/prisma-task.repository';
import type { CreateTaskDto, UpdateTaskDto, ListTasksQuery } from '../dto/task.dto';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { DatabaseService } from '../../../database/database.service';

export interface TaskServiceDependencies {
  taskRepository?: ITaskRepository;
  authorizationService?: AuthorizationService;
  prisma?: PrismaClient;
}

export class TaskService {
  private static instance: TaskService;
  private readonly taskRepo: ITaskRepository;
  private readonly authService: AuthorizationService;
  private readonly prisma: any;

  constructor(deps?: TaskServiceDependencies) {
    this.taskRepo = deps?.taskRepository ?? new PrismaTaskRepository();
    this.authService = deps?.authorizationService ?? AuthorizationService.getInstance();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: TaskServiceDependencies): TaskService {
    if (!TaskService.instance || deps) {
      TaskService.instance = new TaskService(deps);
    }
    return TaskService.instance;
  }

  public static resetInstance(): void {
    TaskService.instance = undefined as unknown as TaskService;
  }

  /**
   * Creates a new task / milestone under a project.
   */
  async createTask(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: CreateTaskDto
  ): Promise<TaskEntity> {
    if (!tenantId || !projectId) {
      throw new BadRequestError('Tenant and project contexts are required.');
    }

    // 1. Authorize project scope & permission
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:manage'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    // 2. Validate WBS Node belongs to same project & tenant if provided
    if (dto.wbsNodeId) {
      const wbsNode = await this.prisma.wbsNode.findFirst({
        where: { id: dto.wbsNodeId, projectId, tenantId },
      });
      if (!wbsNode) {
        throw new BadRequestError('WBS node not found or does not belong to this project.');
      }
    }

    // 3. Validate Assigned User belongs to same tenant if provided
    if (dto.assignedUserId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.assignedUserId, tenantId },
      });
      if (!user) {
        throw new BadRequestError('Assigned user not found or does not belong to this tenant.');
      }
    }

    return this.taskRepo.create({
      id: dto.id,
      tenantId,
      projectId,
      wbsNodeId: dto.wbsNodeId ?? null,
      name: dto.name,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      isMilestone: dto.isMilestone ?? false,
      progressPct: dto.progressPct ?? 0,
      plannedStartDate: dto.plannedStartDate,
      plannedEndDate: dto.plannedEndDate,
      actualStartDate: dto.actualStartDate,
      actualEndDate: dto.actualEndDate,
      assignedUserId: dto.assignedUserId ?? null,
    });
  }

  /**
   * Retrieves single task details with project scope validation.
   */
  async getTaskById(
    tenantId: string,
    userId: string,
    projectId: string,
    taskId: string
  ): Promise<TaskEntity> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const task = await this.taskRepo.findById(tenantId, projectId, taskId);
    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    return task;
  }

  /**
   * Lists tasks for a project with optional filters.
   */
  async listTasks(
    tenantId: string,
    userId: string,
    projectId: string,
    query?: ListTasksQuery
  ): Promise<TaskEntity[]> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    return this.taskRepo.findMany(tenantId, projectId, query);
  }

  /**
   * Updates task details.
   */
  async updateTask(
    tenantId: string,
    userId: string,
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto
  ): Promise<TaskEntity> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:manage'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const task = await this.taskRepo.findById(tenantId, projectId, taskId);
    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    if (dto.wbsNodeId) {
      const wbsNode = await this.prisma.wbsNode.findFirst({
        where: { id: dto.wbsNodeId, projectId, tenantId },
      });
      if (!wbsNode) {
        throw new BadRequestError('WBS node not found or does not belong to this project.');
      }
    }

    if (dto.assignedUserId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.assignedUserId, tenantId },
      });
      if (!user) {
        throw new BadRequestError('Assigned user not found or does not belong to this tenant.');
      }
    }

    return this.taskRepo.update(tenantId, projectId, taskId, dto);
  }

  /**
   * Deletes a task.
   */
  async deleteTask(
    tenantId: string,
    userId: string,
    projectId: string,
    taskId: string
  ): Promise<void> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:manage'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const task = await this.taskRepo.findById(tenantId, projectId, taskId);
    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    await this.taskRepo.delete(tenantId, projectId, taskId);
  }
}

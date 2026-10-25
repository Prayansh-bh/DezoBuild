import type { PrismaClient } from '@prisma/client';
import type {
  ITaskDependencyRepository,
  TaskDependencyEntity,
} from '../repositories/task-dependency.repository.interface';
import { PrismaTaskDependencyRepository } from '../repositories/prisma-task-dependency.repository';
import type { CreateTaskDependencyDto } from '../dto/task-dependency.dto';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { DatabaseService } from '../../../database/database.service';

export interface TaskDependencyServiceDependencies {
  dependencyRepository?: ITaskDependencyRepository;
  authorizationService?: AuthorizationService;
  prisma?: PrismaClient;
}

export class TaskDependencyService {
  private static instance: TaskDependencyService;
  private readonly depRepo: ITaskDependencyRepository;
  private readonly authService: AuthorizationService;
  private readonly prisma: any;

  constructor(deps?: TaskDependencyServiceDependencies) {
    this.depRepo = deps?.dependencyRepository ?? new PrismaTaskDependencyRepository();
    this.authService = deps?.authorizationService ?? AuthorizationService.getInstance();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: TaskDependencyServiceDependencies): TaskDependencyService {
    if (!TaskDependencyService.instance || deps) {
      TaskDependencyService.instance = new TaskDependencyService(deps);
    }
    return TaskDependencyService.instance;
  }

  public static resetInstance(): void {
    TaskDependencyService.instance = undefined as unknown as TaskDependencyService;
  }

  /**
   * Creates a new directed dependency between two tasks with DAG cycle detection.
   */
  async createDependency(
    tenantId: string,
    userId: string,
    projectId: string,
    predecessorTaskId: string,
    successorTaskId: string,
    dto: CreateTaskDependencyDto
  ): Promise<TaskDependencyEntity> {
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

    // 2. Prevent self-dependency
    if (predecessorTaskId === successorTaskId) {
      throw new BadRequestError('A task cannot depend on itself (self-dependency not allowed).');
    }

    // 3. Verify predecessor task exists in this project & tenant
    const predTask = await this.prisma.task.findFirst({
      where: { id: predecessorTaskId, projectId, tenantId },
    });
    if (!predTask) {
      throw new BadRequestError('Predecessor task not found or belongs to another project/tenant.');
    }

    // 4. Verify successor task exists in this project & tenant
    const succTask = await this.prisma.task.findFirst({
      where: { id: successorTaskId, projectId, tenantId },
    });
    if (!succTask) {
      throw new BadRequestError('Successor task not found or belongs to another project/tenant.');
    }

    // 5. Check for duplicate dependency
    const existing = await this.depRepo.findByTasks(predecessorTaskId, successorTaskId);
    if (existing) {
      throw new ConflictError('A dependency between these two tasks already exists.');
    }

    // 6. In-memory DFS DAG cycle detection
    const allProjectDeps = await this.depRepo.findAllByProject(tenantId, projectId);
    const graph = new Map<string, string[]>();

    for (const dep of allProjectDeps) {
      const list = graph.get(dep.predecessorTaskId) || [];
      list.push(dep.successorTaskId);
      graph.set(dep.predecessorTaskId, list);
    }

    // If there is already a path from successorTaskId -> predecessorTaskId,
    // adding predecessorTaskId -> successorTaskId will create a directed cycle.
    const visited = new Set<string>();
    const hasPath = (current: string, target: string): boolean => {
      if (current === target) return true;
      visited.add(current);
      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasPath(neighbor, target)) return true;
        }
      }
      return false;
    };

    if (hasPath(successorTaskId, predecessorTaskId)) {
      throw new ConflictError(
        'Circular task dependency detected: adding this relationship would create a cycle.'
      );
    }

    return this.depRepo.create({
      id: dto.id,
      tenantId,
      projectId,
      predecessorTaskId,
      successorTaskId,
      dependencyType: dto.dependencyType,
      lagDays: dto.lagDays,
    });
  }

  /**
   * Lists dependencies for a project or specific task.
   */
  async listDependencies(
    tenantId: string,
    userId: string,
    projectId: string,
    taskId?: string
  ): Promise<TaskDependencyEntity[]> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (taskId) {
      return this.depRepo.findByTaskId(tenantId, projectId, taskId);
    }

    return this.depRepo.findAllByProject(tenantId, projectId);
  }

  /**
   * Deletes a task dependency.
   */
  async deleteDependency(
    tenantId: string,
    userId: string,
    projectId: string,
    dependencyId: string
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

    const dependency = await this.depRepo.findById(tenantId, projectId, dependencyId);
    if (!dependency) {
      throw new NotFoundError('Task dependency not found.');
    }

    await this.depRepo.delete(tenantId, projectId, dependencyId);
  }
}

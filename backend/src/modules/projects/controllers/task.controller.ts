import type { IncomingMessage } from 'node:http';
import { TaskService } from '../services/task.service';
import { CreateTaskSchema, UpdateTaskSchema, ListTasksQuerySchema } from '../dto/task.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { TaskEntity } from '../repositories/task.repository.interface';

export class TaskController {
  private readonly taskService: TaskService;

  constructor(taskService?: TaskService) {
    this.taskService = taskService || TaskService.getInstance();
  }

  public async listTasks(
    req: IncomingMessage & { params?: { projectId?: string }; query?: Record<string, string> }
  ): Promise<ApiResponse<TaskEntity[]>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const query = DtoValidator.validate(ListTasksQuerySchema, req.query || {});

    const tasks = await this.taskService.listTasks(
      principal.tenantId,
      principal.userId,
      projectId,
      query
    );

    return createSuccessResponse(tasks, 'Tasks retrieved successfully');
  }

  public async getTask(
    req: IncomingMessage & { params?: { projectId?: string; taskId?: string } }
  ): Promise<ApiResponse<TaskEntity>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const taskId = req.params?.taskId || '';

    const task = await this.taskService.getTaskById(
      principal.tenantId,
      principal.userId,
      projectId,
      taskId
    );

    return createSuccessResponse(task, 'Task details retrieved successfully');
  }

  public async createTask(
    req: IncomingMessage & { params?: { projectId?: string }; body?: unknown }
  ): Promise<ApiResponse<TaskEntity>> {
    await RbacGuard.requirePermission(req, 'projects:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dto = DtoValidator.validate(CreateTaskSchema, req.body || {});

    const task = await this.taskService.createTask(
      principal.tenantId,
      principal.userId,
      projectId,
      dto
    );

    return createSuccessResponse(task, 'Task created successfully');
  }

  public async updateTask(
    req: IncomingMessage & { params?: { projectId?: string; taskId?: string }; body?: unknown }
  ): Promise<ApiResponse<TaskEntity>> {
    await RbacGuard.requirePermission(req, 'projects:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const taskId = req.params?.taskId || '';
    const dto = DtoValidator.validate(UpdateTaskSchema, req.body || {});

    const task = await this.taskService.updateTask(
      principal.tenantId,
      principal.userId,
      projectId,
      taskId,
      dto
    );

    return createSuccessResponse(task, 'Task updated successfully');
  }

  public async deleteTask(
    req: IncomingMessage & { params?: { projectId?: string; taskId?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requirePermission(req, 'projects:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const taskId = req.params?.taskId || '';

    await this.taskService.deleteTask(
      principal.tenantId,
      principal.userId,
      projectId,
      taskId
    );

    return createSuccessResponse({ deleted: true }, 'Task deleted successfully');
  }
}

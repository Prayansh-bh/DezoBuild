import type { IncomingMessage } from 'node:http';
import { TaskDependencyService } from '../services/task-dependency.service';
import { CreateTaskDependencySchema } from '../dto/task-dependency.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { TaskDependencyEntity } from '../repositories/task-dependency.repository.interface';
import { BadRequestError } from '../../../common/errors/app-error';

export class TaskDependencyController {
  private readonly dependencyService: TaskDependencyService;

  constructor(dependencyService?: TaskDependencyService) {
    this.dependencyService = dependencyService || TaskDependencyService.getInstance();
  }

  public async listDependencies(
    req: IncomingMessage & { params?: { projectId?: string; taskId?: string } }
  ): Promise<ApiResponse<TaskDependencyEntity[]>> {
    await RbacGuard.requirePermission(req, 'projects:view');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const taskId = req.params?.taskId;

    const dependencies = await this.dependencyService.listDependencies(
      principal.tenantId,
      principal.userId,
      projectId,
      taskId
    );

    return createSuccessResponse(dependencies, 'Task dependencies retrieved successfully');
  }

  public async createDependency(
    req: IncomingMessage & { params?: { projectId?: string; taskId?: string }; body?: unknown }
  ): Promise<ApiResponse<TaskDependencyEntity>> {
    await RbacGuard.requirePermission(req, 'projects:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const pathTaskId = req.params?.taskId;
    const dto = DtoValidator.validate(CreateTaskDependencySchema, req.body || {});

    let predecessorTaskId: string;
    let successorTaskId: string;

    if (dto.predecessorTaskId && dto.successorTaskId) {
      predecessorTaskId = dto.predecessorTaskId;
      successorTaskId = dto.successorTaskId;
    } else if (pathTaskId && dto.successorTaskId) {
      predecessorTaskId = pathTaskId;
      successorTaskId = dto.successorTaskId;
    } else if (pathTaskId && dto.predecessorTaskId) {
      predecessorTaskId = dto.predecessorTaskId;
      successorTaskId = pathTaskId;
    } else {
      throw new BadRequestError('Both predecessorTaskId and successorTaskId must be identified.');
    }

    const dependency = await this.dependencyService.createDependency(
      principal.tenantId,
      principal.userId,
      projectId,
      predecessorTaskId,
      successorTaskId,
      dto
    );

    return createSuccessResponse(dependency, 'Task dependency created successfully');
  }

  public async deleteDependency(
    req: IncomingMessage & { params?: { projectId?: string; taskId?: string; dependencyId?: string } }
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await RbacGuard.requirePermission(req, 'projects:manage');
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.projectId || '';
    const dependencyId = req.params?.dependencyId || '';

    await this.dependencyService.deleteDependency(
      principal.tenantId,
      principal.userId,
      projectId,
      dependencyId
    );

    return createSuccessResponse({ deleted: true }, 'Task dependency deleted successfully');
  }
}

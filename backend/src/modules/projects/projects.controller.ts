import type { IncomingMessage } from 'node:http';
import { ProjectsService } from './services/projects.service';
import { CreateProjectSchema } from './dto/create-project.dto';
import { UpdateProjectSchema } from './dto/update-project.dto';
import { TransitionStatusSchema } from './dto/transition-status.dto';
import { ListProjectsQuerySchema } from './dto/list-projects.dto';
import { requireAuth } from '../auth/auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../common/dto/api-response.dto';
import type { ProjectEntity } from './repositories/project.repository.interface';

export class ProjectsController {
  private readonly projectsService: ProjectsService;

  constructor(projectsService?: ProjectsService) {
    this.projectsService = projectsService || ProjectsService.getInstance();
  }

  public async createProject(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<ProjectEntity>> {
    // 1. RBAC Permission Gate
    await RbacGuard.requirePermission(req, 'projects:create');
    // 2. Feature Entitlement Gate
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(CreateProjectSchema, req.body || {});

    const project = await this.projectsService.createProject(
      principal.tenantId,
      principal.userId,
      dto
    );

    return createSuccessResponse(project, 'Project created successfully');
  }

  public async getProject(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<ProjectEntity>> {
    // 1. RBAC Permission Gate
    await RbacGuard.requirePermission(req, 'projects:view');
    // 2. Feature Entitlement Gate
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.id || '';

    const project = await this.projectsService.getProjectById(
      principal.tenantId,
      principal.userId,
      projectId
    );

    return createSuccessResponse(project, 'Project details retrieved successfully');
  }

  public async listProjects(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<ProjectEntity[]>> {
    // 1. RBAC Permission Gate
    await RbacGuard.requirePermission(req, 'projects:view');
    // 2. Feature Entitlement Gate
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(ListProjectsQuerySchema, req.query || {});

    const projects = await this.projectsService.listProjects(
      principal.tenantId,
      principal.userId,
      query
    );

    return createSuccessResponse(projects, 'Projects retrieved successfully');
  }

  public async updateProject(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<ProjectEntity>> {
    // 1. RBAC Permission Gate
    await RbacGuard.requirePermission(req, 'projects:manage');
    // 2. Feature Entitlement Gate
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.id || '';
    const dto = DtoValidator.validate(UpdateProjectSchema, req.body || {});

    const project = await this.projectsService.updateProject(
      principal.tenantId,
      principal.userId,
      projectId,
      dto
    );

    return createSuccessResponse(project, 'Project updated successfully');
  }

  public async transitionStatus(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<ProjectEntity>> {
    // 1. RBAC Permission Gate
    await RbacGuard.requirePermission(req, 'projects:manage');
    // 2. Feature Entitlement Gate
    await EntitlementGuard.requireFeature(req, 'projects:core');

    const principal = await requireAuth(req);
    const projectId = req.params?.id || '';
    const dto = DtoValidator.validate(TransitionStatusSchema, req.body || {});

    const project = await this.projectsService.transitionStatus(
      principal.tenantId,
      principal.userId,
      projectId,
      dto
    );

    return createSuccessResponse(
      project,
      `Project status transitioned to ${project.status} successfully`
    );
  }
}

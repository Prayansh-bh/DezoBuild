import type { PrismaClient } from '@prisma/client';
import type { IProjectRepository, ProjectEntity } from '../repositories/project.repository.interface';
import { PrismaProjectRepository } from '../repositories/prisma-project.repository';
import type { CreateProjectDto } from '../dto/create-project.dto';
import type { UpdateProjectDto } from '../dto/update-project.dto';
import type { TransitionStatusDto } from '../dto/transition-status.dto';
import type { ListProjectsQuery } from '../dto/list-projects.dto';
import {
  isValidProjectTransition,
  requiresCapacityCheck,
  type ProjectStatus,
} from '../constants/project.constants';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { CapacityService } from '../../subscriptions/services/capacity.service';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { DatabaseService } from '../../../database/database.service';

export interface ProjectsServiceDependencies {
  projectRepository?: IProjectRepository;
  capacityService?: CapacityService;
  authorizationService?: AuthorizationService;
  prisma?: PrismaClient;
}

export class ProjectsService {
  private static instance: ProjectsService;
  private readonly projectRepo: IProjectRepository;
  private readonly capacityService: CapacityService;
  private readonly authService: AuthorizationService;
  private readonly prisma: any;

  constructor(deps?: ProjectsServiceDependencies) {
    this.projectRepo = deps?.projectRepository ?? new PrismaProjectRepository();
    this.capacityService = deps?.capacityService ?? CapacityService.getInstance();
    this.authService = deps?.authorizationService ?? AuthorizationService.getInstance();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: ProjectsServiceDependencies): ProjectsService {
    if (!ProjectsService.instance || deps) {
      ProjectsService.instance = new ProjectsService(deps);
    }
    return ProjectsService.instance;
  }

  public static resetInstance(): void {
    ProjectsService.instance = undefined as unknown as ProjectsService;
  }

  /**
   * Creates a new capital project in the tenant.
   * Enforces capacity limit if initial status is ACTIVE.
   */
  async createProject(
    tenantId: string,
    userId: string,
    dto: CreateProjectDto
  ): Promise<ProjectEntity> {
    if (!tenantId) {
      throw new BadRequestError('Tenant context is required.');
    }

    // 1. Verify company exists in this tenant
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundError('Company not found in tenant.');
    }

    // 2. Verify code uniqueness in tenant
    const existing = await this.projectRepo.findByCode(tenantId, dto.code);
    if (existing) {
      throw new ConflictError(`Project with code '${dto.code}' already exists in this tenant.`);
    }

    // 3. Enforce capacity limit if creating in ACTIVE status
    const initialStatus = dto.status ?? 'PLANNING';
    if (initialStatus === 'ACTIVE') {
      await this.capacityService.assertProjectCapacity(tenantId);
    }

    // 4. Validate initial members belong to caller's tenant
    if (dto.initialMembers && dto.initialMembers.length > 0) {
      const memberUserIds = dto.initialMembers.map((m) => m.userId);
      const tenantUsers = await this.prisma.user.findMany({
        where: {
          id: { in: memberUserIds },
          tenantId,
        },
      });

      if (tenantUsers.length !== memberUserIds.length) {
        throw new BadRequestError('All project members must belong to the caller tenant.');
      }
    }

    // 5. Create project and initial member assignment atomically
    const project = await this.projectRepo.create({
      id: dto.id,
      tenantId,
      companyId: dto.companyId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      projectType: dto.projectType,
      location: dto.location,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      status: initialStatus,
      plannedStartDate: dto.plannedStartDate,
      plannedEndDate: dto.plannedEndDate,
      actualStartDate: dto.actualStartDate,
      actualEndDate: dto.actualEndDate,
      estimatedBudget: dto.estimatedBudget,
      contractValue: dto.contractValue,
      currency: dto.currency ?? 'INR',
      siteAreaSqft: dto.siteAreaSqft,
      builtUpAreaSqft: dto.builtUpAreaSqft,
    });

    // Add creator as lead project member if not explicitly provided
    const memberRecords: Array<{
      tenantId: string;
      projectId: string;
      userId: string;
      projectRole: string;
      isLead: boolean;
    }> = [];

    if (dto.initialMembers && dto.initialMembers.length > 0) {
      for (const m of dto.initialMembers) {
        memberRecords.push({
          tenantId,
          projectId: project.id,
          userId: m.userId,
          projectRole: m.projectRole || 'MEMBER',
          isLead: m.isLead ?? false,
        });
      }
    } else {
      memberRecords.push({
        tenantId,
        projectId: project.id,
        userId,
        projectRole: 'PROJECT_MANAGER',
        isLead: true,
      });
    }

    for (const mem of memberRecords) {
      await this.prisma.projectMember.create({
        data: mem,
      });
    }

    return (await this.projectRepo.findById(tenantId, project.id))!;
  }

  /**
   * Retrieves single project details with strict scope check.
   */
  async getProjectById(
    tenantId: string,
    userId: string,
    projectId: string
  ): Promise<ProjectEntity> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const project = await this.projectRepo.findById(tenantId, projectId);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    return project;
  }

  /**
   * Lists projects accessible to the caller.
   * Org-wide users see all tenant projects; project-scoped users see assigned projects.
   */
  async listProjects(
    tenantId: string,
    userId: string,
    query?: ListProjectsQuery
  ): Promise<ProjectEntity[]> {
    const isOwner = await this.authService.hasRole(tenantId, userId, 'COMPANY_OWNER');
    const isAdmin = await this.authService.hasRole(tenantId, userId, 'COMPANY_ADMIN');
    const isViewer = await this.authService.hasRole(tenantId, userId, 'VIEWER');

    if (isOwner || isAdmin || isViewer) {
      return this.projectRepo.findMany(tenantId, query);
    }

    return this.projectRepo.findUserAccessibleProjects(tenantId, userId, query);
  }

  /**
   * Updates project metadata with strict project scope authorization.
   */
  async updateProject(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: UpdateProjectDto
  ): Promise<ProjectEntity> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:manage'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const project = await this.projectRepo.findById(tenantId, projectId);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    if (project.status === 'ARCHIVED') {
      throw new ConflictError('Cannot update an archived project.');
    }

    return this.projectRepo.update(tenantId, projectId, dto);
  }

  /**
   * Transitions project status via the authoritative state machine.
   */
  async transitionStatus(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: TransitionStatusDto
  ): Promise<ProjectEntity> {
    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:manage'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    const project = await this.projectRepo.findById(tenantId, projectId);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    const currentStatus = project.status;
    const targetStatus = dto.status;

    if (!isValidProjectTransition(currentStatus, targetStatus)) {
      throw new ConflictError(
        `Invalid project state transition from '${currentStatus}' to '${targetStatus}'.`
      );
    }

    // Capacity limit check for transitions into ACTIVE status
    if (requiresCapacityCheck(targetStatus)) {
      await this.capacityService.assertProjectCapacity(tenantId);
    }

    const extraUpdates: Partial<{ actualStartDate: Date | null; actualEndDate: Date | null }> = {};
    if (targetStatus === 'ACTIVE' && currentStatus === 'PLANNING' && !project.actualStartDate) {
      extraUpdates.actualStartDate = new Date();
    }
    if (targetStatus === 'COMPLETED' && !project.actualEndDate) {
      extraUpdates.actualEndDate = new Date();
    }

    return this.projectRepo.updateStatus(tenantId, projectId, targetStatus, extraUpdates);
  }

  // Explicit lifecycle shortcut methods
  async activateProject(tenantId: string, userId: string, projectId: string): Promise<ProjectEntity> {
    return this.transitionStatus(tenantId, userId, projectId, { status: 'ACTIVE' });
  }

  async pauseProject(tenantId: string, userId: string, projectId: string): Promise<ProjectEntity> {
    return this.transitionStatus(tenantId, userId, projectId, { status: 'ON_HOLD' });
  }

  async resumeProject(tenantId: string, userId: string, projectId: string): Promise<ProjectEntity> {
    return this.transitionStatus(tenantId, userId, projectId, { status: 'ACTIVE' });
  }

  async completeProject(tenantId: string, userId: string, projectId: string): Promise<ProjectEntity> {
    return this.transitionStatus(tenantId, userId, projectId, { status: 'COMPLETED' });
  }

  async archiveProject(tenantId: string, userId: string, projectId: string): Promise<ProjectEntity> {
    return this.transitionStatus(tenantId, userId, projectId, { status: 'ARCHIVED' });
  }
}

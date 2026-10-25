import type { PrismaClient } from '@prisma/client';
import type {
  IDprRepository,
  DailyProgressReportWithRelations,
} from '../repositories/dpr.repository.interface';
import { PrismaDprRepository } from '../repositories/prisma-dpr.repository';
import type {
  CreateDprDto,
  UpdateDprDto,
  SubmitDprDto,
  ApproveDprDto,
  RejectDprDto,
  ListDprQueryDto,
} from '../dto/dpr.dto';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import { DatabaseService } from '../../../database/database.service';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export interface DprServiceDependencies {
  dprRepository?: IDprRepository;
  authorizationService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class DprService {
  private static instance: DprService;
  private readonly dprRepo: IDprRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: any;

  constructor(deps?: DprServiceDependencies) {
    this.dprRepo = deps?.dprRepository ?? new PrismaDprRepository();
    this.authService = deps?.authorizationService ?? AuthorizationService.getInstance();
    this.entitlementService = deps?.entitlementService ?? new EntitlementService();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: DprServiceDependencies): DprService {
    if (!DprService.instance || deps) {
      DprService.instance = new DprService(deps);
    }
    return DprService.instance;
  }

  public static resetInstance(): void {
    DprService.instance = undefined as unknown as DprService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(tenantId, 'projects:core');
    if (!isEntitled) {
      throw new ForbiddenError('Feature entitlement projects:core required for Daily Progress Reports.');
    }
  }

  /**
   * List Daily Progress Reports for a project.
   */
  async listDprs(
    tenantId: string,
    userId: string,
    projectId: string,
    query?: ListDprQueryDto
  ): Promise<{ items: DailyProgressReportWithRelations[]; total: number }> {
    if (!tenantId || !projectId) {
      throw new BadRequestError('Tenant and project contexts are required.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    await this.verifyEntitlement(tenantId);

    return this.dprRepo.findMany(tenantId, projectId, query);
  }

  /**
   * Get single DPR with all child records.
   */
  async getDprById(
    tenantId: string,
    userId: string,
    projectId: string,
    dprId: string
  ): Promise<DailyProgressReportWithRelations> {
    if (!tenantId || !projectId || !dprId) {
      throw new BadRequestError('Missing required identifiers.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    await this.verifyEntitlement(tenantId);

    const dpr = await this.dprRepo.findById(tenantId, projectId, dprId);
    if (!dpr) {
      throw new NotFoundError('Daily Progress Report not found.');
    }

    return dpr;
  }

  /**
   * Create a new Daily Progress Report in DRAFT state.
   */
  async createDpr(
    tenantId: string,
    userId: string,
    projectId: string,
    dto: CreateDprDto
  ): Promise<DailyProgressReportWithRelations> {
    if (!tenantId || !projectId) {
      throw new BadRequestError('Tenant and project contexts are required.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:dpr:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Permission projects:dpr:create or project access denied.');
    }

    await this.verifyEntitlement(tenantId);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in tenant.');
    }

    // Daily uniqueness check
    const reportDate = new Date(dto.reportDate);
    const existing = await this.dprRepo.findByDate(tenantId, projectId, reportDate);
    if (existing) {
      throw new ConflictError(
        `A Daily Progress Report already exists for project on date ${dto.reportDate}`
      );
    }

    // Validate child activity references
    for (const item of dto.activityProgress) {
      if (item.taskId) {
        const task = await this.prisma.task.findFirst({
          where: { id: item.taskId, projectId, tenantId },
        });
        if (!task) {
          throw new BadRequestError(`Referenced task ID ${item.taskId} not found in this project.`);
        }
      }

      if (item.wbsNodeId) {
        const wbs = await this.prisma.wbsNode.findFirst({
          where: { id: item.wbsNodeId, projectId, tenantId },
        });
        if (!wbs) {
          throw new BadRequestError(`Referenced WBS node ID ${item.wbsNodeId} not found in this project.`);
        }
      }
    }

    const cleanDate = dto.reportDate.replace(/-/g, '');
    const dprNumber = `DPR-${project.code}-${cleanDate}`;

    return this.dprRepo.create(tenantId, projectId, userId, dprNumber, dto);
  }

  /**
   * Update draft or rejected DPR.
   */
  async updateDpr(
    tenantId: string,
    userId: string,
    projectId: string,
    dprId: string,
    dto: UpdateDprDto
  ): Promise<DailyProgressReportWithRelations> {
    if (!tenantId || !projectId || !dprId) {
      throw new BadRequestError('Missing required identifiers.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:dpr:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Permission projects:dpr:create or project access denied.');
    }

    await this.verifyEntitlement(tenantId);

    const dpr = await this.dprRepo.findById(tenantId, projectId, dprId);
    if (!dpr) {
      throw new NotFoundError('Daily Progress Report not found.');
    }

    if (dpr.status === 'SUBMITTED') {
      throw new BadRequestError('A submitted DPR is locked for editing. It must be rejected first.');
    }
    if (dpr.status === 'APPROVED') {
      throw new BadRequestError('An approved DPR is permanently immutable and cannot be updated.');
    }

    if (dto.activityProgress) {
      for (const item of dto.activityProgress) {
        if (item.taskId) {
          const task = await this.prisma.task.findFirst({
            where: { id: item.taskId, projectId, tenantId },
          });
          if (!task) {
            throw new BadRequestError(`Referenced task ID ${item.taskId} not found in this project.`);
          }
        }

        if (item.wbsNodeId) {
          const wbs = await this.prisma.wbsNode.findFirst({
            where: { id: item.wbsNodeId, projectId, tenantId },
          });
          if (!wbs) {
            throw new BadRequestError(`Referenced WBS node ID ${item.wbsNodeId} not found in this project.`);
          }
        }
      }
    }

    return this.dprRepo.update(tenantId, projectId, dprId, dto);
  }

  /**
   * Submit DPR for managerial review.
   */
  async submitDpr(
    tenantId: string,
    userId: string,
    projectId: string,
    dprId: string,
    _dto?: SubmitDprDto
  ): Promise<DailyProgressReportWithRelations> {
    if (!tenantId || !projectId || !dprId) {
      throw new BadRequestError('Missing required identifiers.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:dpr:submit'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Permission projects:dpr:submit or project access denied.');
    }

    await this.verifyEntitlement(tenantId);

    const dpr = await this.dprRepo.findById(tenantId, projectId, dprId);
    if (!dpr) {
      throw new NotFoundError('Daily Progress Report not found.');
    }

    if (dpr.status === 'SUBMITTED') {
      throw new BadRequestError('DPR is already in submitted status.');
    }
    if (dpr.status === 'APPROVED') {
      throw new BadRequestError('Approved DPR is terminal and cannot be resubmitted.');
    }

    // Require non-empty operational content
    const hasActivities = dpr.activityProgress && dpr.activityProgress.length > 0;
    const hasManpower = dpr.manpowerLogs && dpr.manpowerLogs.length > 0;
    const hasEquipment = dpr.equipmentLogs && dpr.equipmentLogs.length > 0;

    if (!hasActivities && !hasManpower && !hasEquipment) {
      throw new BadRequestError(
        'DPR must contain at least one activity progress item, manpower log, or equipment log before submission.'
      );
    }

    return this.dprRepo.submit(tenantId, projectId, dprId, userId);
  }

  /**
   * Reject a submitted DPR with mandatory rejection reason.
   */
  async rejectDpr(
    tenantId: string,
    userId: string,
    projectId: string,
    dprId: string,
    dto: RejectDprDto
  ): Promise<DailyProgressReportWithRelations> {
    if (!tenantId || !projectId || !dprId) {
      throw new BadRequestError('Missing required identifiers.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:dpr:approve'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Permission projects:dpr:approve or project access denied.');
    }

    await this.verifyEntitlement(tenantId);

    const dpr = await this.dprRepo.findById(tenantId, projectId, dprId);
    if (!dpr) {
      throw new NotFoundError('Daily Progress Report not found.');
    }

    if (dpr.status === 'DRAFT') {
      throw new BadRequestError('Cannot reject a DPR that is still in draft status.');
    }
    if (dpr.status === 'REJECTED') {
      throw new BadRequestError('DPR is already in rejected status.');
    }
    if (dpr.status === 'APPROVED') {
      throw new BadRequestError('An approved DPR is permanent and cannot be rejected.');
    }

    if (!dto.rejectionReason || dto.rejectionReason.trim().length === 0) {
      throw new BadRequestError('rejectionReason is mandatory when rejecting a DPR.');
    }

    return this.dprRepo.reject(tenantId, projectId, dprId, userId, dto.rejectionReason.trim());
  }

  /**
   * Approve DPR and atomically commit progress to Tasks and WBS nodes.
   * STRICT SEGREGATION OF DUTIES (SoD): Approver cannot be creator or submitter.
   */
  async approveDpr(
    tenantId: string,
    userId: string,
    projectId: string,
    dprId: string,
    dto?: ApproveDprDto
  ): Promise<DailyProgressReportWithRelations> {
    if (!tenantId || !projectId || !dprId) {
      throw new BadRequestError('Missing required identifiers.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:dpr:approve'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Permission projects:dpr:approve or project access denied.');
    }

    await this.verifyEntitlement(tenantId);

    const dpr = await this.dprRepo.findById(tenantId, projectId, dprId);
    if (!dpr) {
      throw new NotFoundError('Daily Progress Report not found.');
    }

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      tenantId,
      'DAILY_PROGRESS_REPORT',
      dprId
    );

    if (dpr.status === 'DRAFT') {

      throw new BadRequestError('Cannot approve a DPR that has not been submitted.');
    }
    if (dpr.status === 'APPROVED') {
      throw new BadRequestError('DPR is already approved.');
    }
    if (dpr.status === 'REJECTED') {
      throw new BadRequestError('Cannot approve a rejected DPR. It must be revised and resubmitted.');
    }

    // STRICT SEGREGATION OF DUTIES
    if (dpr.createdById === userId || dpr.submittedById === userId) {
      throw new ForbiddenError(
        'Segregation of Duties violation: The creator or submitter of a Daily Progress Report cannot approve it.'
      );
    }

    return this.dprRepo.approveAndCommitProgress(
      tenantId,
      projectId,
      dprId,
      userId,
      dto?.approvalRemarks
    );
  }

  /**
   * Delete a DPR (allowed only for DRAFT status).
   */
  async deleteDpr(
    tenantId: string,
    userId: string,
    projectId: string,
    dprId: string
  ): Promise<void> {
    if (!tenantId || !projectId || !dprId) {
      throw new BadRequestError('Missing required identifiers.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      projectId,
      'projects:dpr:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Permission projects:dpr:create or project access denied.');
    }

    await this.verifyEntitlement(tenantId);

    const dpr = await this.dprRepo.findById(tenantId, projectId, dprId);
    if (!dpr) {
      throw new NotFoundError('Daily Progress Report not found.');
    }

    if (dpr.status === 'SUBMITTED') {
      throw new BadRequestError('Submitted DPR cannot be deleted.');
    }
    if (dpr.status === 'APPROVED') {
      throw new BadRequestError('Approved DPR is permanently immutable and cannot be deleted.');
    }
    if (dpr.status === 'REJECTED') {
      throw new BadRequestError('Rejected DPR cannot be deleted directly.');
    }

    await this.dprRepo.delete(tenantId, projectId, dprId);
  }
}

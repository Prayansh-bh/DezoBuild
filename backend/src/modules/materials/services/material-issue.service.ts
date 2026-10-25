import { PrismaClient } from '@prisma/client';
import type {
  IMaterialIssueRepository,
  MaterialIssueWithRelations,
} from '../repositories/material-issue.repository.interface';
import { PrismaMaterialIssueRepository } from '../repositories/prisma-material-issue.repository';
import type { IStoreRepository } from '../repositories/store.repository.interface';
import { PrismaStoreRepository } from '../repositories/prisma-store.repository';
import type { IMaterialRepository } from '../repositories/material.repository.interface';
import { PrismaMaterialRepository } from '../repositories/prisma-material.repository';
import type {
  CreateMaterialIssueDto,
  UpdateMaterialIssueDto,
  SubmitMaterialIssueDto,
  ApproveMaterialIssueDto,
  IssueMaterialIssueDto,
  CancelMaterialIssueDto,
  ListMaterialIssuesQueryDto,
} from '../dto/material-issue.dto';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import { DatabaseService } from '../../../database/database.service';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';

import {
  MATERIAL_ISSUE_ENTITLEMENT,
  MATERIAL_ISSUE_PERMISSIONS,
} from '../constants/material-issue.constants';

export interface MaterialIssueServiceDependencies {
  materialIssueRepository?: IMaterialIssueRepository;
  storeRepository?: IStoreRepository;
  materialRepository?: IMaterialRepository;
  authorizationService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class MaterialIssueService {
  private static instance: MaterialIssueService;
  private readonly issueRepo: IMaterialIssueRepository;
  private readonly storeRepo: IStoreRepository;
  private readonly materialRepo: IMaterialRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: any;

  constructor(deps?: MaterialIssueServiceDependencies) {
    this.issueRepo =
      deps?.materialIssueRepository ??
      PrismaMaterialIssueRepository.getInstance();
    this.storeRepo =
      deps?.storeRepository ?? PrismaStoreRepository.getInstance();
    this.materialRepo =
      deps?.materialRepository ?? PrismaMaterialRepository.getInstance();
    this.authService =
      deps?.authorizationService ?? AuthorizationService.getInstance();
    this.entitlementService =
      deps?.entitlementService ?? new EntitlementService();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(
    deps?: MaterialIssueServiceDependencies
  ): MaterialIssueService {
    if (!MaterialIssueService.instance || deps) {
      MaterialIssueService.instance = new MaterialIssueService(deps);
    }
    return MaterialIssueService.instance;
  }

  public static resetInstance(): void {
    MaterialIssueService.instance =
      undefined as unknown as MaterialIssueService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(
      tenantId,
      MATERIAL_ISSUE_ENTITLEMENT
    );
    if (!isEntitled) {
      throw new ForbiddenError(
        `Feature entitlement ${MATERIAL_ISSUE_ENTITLEMENT} required for Material Issue.`
      );
    }
  }

  public async listMaterialIssues(
    tenantId: string,
    userId: string,
    query?: ListMaterialIssuesQueryDto
  ): Promise<{ items: MaterialIssueWithRelations[]; total: number }> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_ISSUE_PERMISSIONS.VIEW
    );
    if (!hasViewPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_ISSUE_PERMISSIONS.VIEW}`
      );
    }

    const authCtx = await this.authService.getUserAuthorizationContext(
      tenantId,
      userId
    );
    let allowedProjectIds: string[] | undefined;

    if (!authCtx.isTenantAdmin) {
      allowedProjectIds = authCtx.projectIds;
      if (allowedProjectIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    if (query?.projectId) {
      const access = await this.authService.hasProjectAccess(
        tenantId,
        userId,
        query.projectId,
        MATERIAL_ISSUE_PERMISSIONS.VIEW
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to project denied.');
      }
    }

    return this.issueRepo.findMany(tenantId, allowedProjectIds, query);
  }

  public async getMaterialIssueById(
    tenantId: string,
    userId: string,
    id: string,
    projectId?: string
  ): Promise<MaterialIssueWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const issue = await this.issueRepo.findById(tenantId, id, projectId);
    if (!issue) {
      throw new NotFoundError('Material issue note not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      issue.projectId,
      MATERIAL_ISSUE_PERMISSIONS.VIEW
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    return issue;
  }

  public async createMaterialIssue(
    tenantId: string,
    userId: string,
    dto: CreateMaterialIssueDto
  ): Promise<MaterialIssueWithRelations> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const hasIssuePerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_ISSUE_PERMISSIONS.ISSUE
    );
    if (!hasIssuePerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_ISSUE_PERMISSIONS.ISSUE}`
      );
    }

    // 1. Verify Project
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId },
    });
    if (!project) {
      throw new NotFoundError(
        `Project with ID ${dto.projectId} not found in this tenant.`
      );
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      dto.projectId,
      MATERIAL_ISSUE_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    // 2. Verify Store
    const store = await this.storeRepo.findById(tenantId, dto.storeId);
    if (!store) {
      throw new NotFoundError(
        `Store with ID ${dto.storeId} not found in this tenant.`
      );
    }

    if (store.status !== 'ACTIVE') {
      throw new BadRequestError(
        `Source store ${store.code} is inactive. Issues can only be made from ACTIVE stores.`
      );
    }

    const isCentral =
      (store as any).isCentralWarehouse === true ||
      (store as any).storeType === 'CENTRAL';
    if (!isCentral && store.projectId !== dto.projectId) {
      throw new BadRequestError(
        `Store ${store.code} belongs to project ${store.projectId} and is not valid for issue project ${dto.projectId}. Must be a site store of the issue project or a central warehouse.`
      );
    }

    // 3. Verify Lines
    await this.validateLineItems(tenantId, dto.projectId, dto.lines);

    // 4. Allocate Issue Number
    const issueNumber = await this.issueRepo.allocateIssueNumber(
      tenantId,
      dto.projectId,
      project.code,
      dto.issueDate ? new Date(dto.issueDate) : new Date()
    );

    return this.issueRepo.create(tenantId, userId, issueNumber, dto);
  }

  public async updateMaterialIssue(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateMaterialIssueDto
  ): Promise<MaterialIssueWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const issue = await this.issueRepo.findById(tenantId, id);
    if (!issue) {
      throw new NotFoundError('Material issue not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      issue.projectId,
      MATERIAL_ISSUE_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (issue.status !== 'DRAFT') {
      throw new BadRequestError(
        `Only DRAFT material issues can be updated. Current status: ${issue.status}`
      );
    }

    if (dto.storeId) {
      const store = await this.storeRepo.findById(tenantId, dto.storeId);
      if (!store) {
        throw new NotFoundError(
          `Store with ID ${dto.storeId} not found in this tenant.`
        );
      }
      if (store.status !== 'ACTIVE') {
        throw new BadRequestError(`Source store ${store.code} is inactive.`);
      }
      const isCentral =
        (store as any).isCentralWarehouse === true ||
        (store as any).storeType === 'CENTRAL';
      if (!isCentral && store.projectId !== issue.projectId) {
        throw new BadRequestError(
          `Store ${store.code} belongs to project ${store.projectId} and is not valid for issue project ${issue.projectId}.`
        );
      }
    }

    if (dto.lines && dto.lines.length > 0) {
      await this.validateLineItems(tenantId, issue.projectId, dto.lines);
    }

    return this.issueRepo.update(tenantId, id, dto);
  }

  public async submitMaterialIssue(
    tenantId: string,
    userId: string,
    id: string,
    dto?: SubmitMaterialIssueDto
  ): Promise<MaterialIssueWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const issue = await this.issueRepo.findById(tenantId, id);
    if (!issue) {
      throw new NotFoundError('Material issue not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      issue.projectId,
      MATERIAL_ISSUE_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (issue.status !== 'DRAFT') {
      throw new BadRequestError(
        `Only DRAFT material issues can be submitted. Current status: ${issue.status}`
      );
    }

    return this.issueRepo.submit(tenantId, id, userId, dto?.remarks);
  }

  public async approveMaterialIssue(
    tenantId: string,
    userId: string,
    id: string,
    dto?: ApproveMaterialIssueDto
  ): Promise<MaterialIssueWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const issue = await this.issueRepo.findById(tenantId, id);
    if (!issue) {
      throw new NotFoundError('Material issue not found.');
    }

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      tenantId,
      'MATERIAL_ISSUE',
      id
    );


    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      issue.projectId,
      MATERIAL_ISSUE_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (issue.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material issues can be approved. Current status: ${issue.status}`
      );
    }

    if (issue.requestedById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Approver cannot be the requester of the material issue.'
      );
    }

    return this.issueRepo.approve(tenantId, id, userId, dto?.approvalRemarks);
  }

  public async issueMaterialIssue(
    tenantId: string,
    userId: string,
    id: string,
    dto?: IssueMaterialIssueDto
  ): Promise<MaterialIssueWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const issue = await this.issueRepo.findById(tenantId, id);
    if (!issue) {
      throw new NotFoundError('Material issue not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      issue.projectId,
      MATERIAL_ISSUE_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (issue.status === 'ISSUED') {
      return issue;
    }

    if (issue.status !== 'APPROVED' && issue.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only APPROVED or SUBMITTED material issues can be issued. Current status: ${issue.status}`
      );
    }

    if (issue.requestedById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Issuer cannot be the requester of the material issue.'
      );
    }

    return this.issueRepo.issue(
      tenantId,
      id,
      userId,
      dto?.issuedLines,
      dto?.remarks
    );
  }

  public async cancelMaterialIssue(
    tenantId: string,
    userId: string,
    id: string,
    dto?: CancelMaterialIssueDto
  ): Promise<MaterialIssueWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const issue = await this.issueRepo.findById(tenantId, id);
    if (!issue) {
      throw new NotFoundError('Material issue not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      issue.projectId,
      MATERIAL_ISSUE_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (issue.status === 'ISSUED') {
      throw new BadRequestError(
        'Cannot cancel an already ISSUED material issue.'
      );
    }

    if (issue.status === 'CANCELLED') {
      throw new BadRequestError('Material issue is already CANCELLED.');
    }

    return this.issueRepo.cancel(
      tenantId,
      id,
      userId,
      dto?.cancellationReason
    );
  }

  public async deleteMaterialIssue(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const issue = await this.issueRepo.findById(tenantId, id);
    if (!issue) {
      throw new NotFoundError('Material issue not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      issue.projectId,
      MATERIAL_ISSUE_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (issue.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete material issue in status '${issue.status}'. Only DRAFT issues can be deleted.`
      );
    }

    await this.issueRepo.delete(tenantId, id);
  }

  private async validateLineItems(
    tenantId: string,
    projectId: string,
    lines: Array<{
      materialId: string;
      wbsNodeId?: string | null;
      taskId?: string | null;
      uom: string;
    }>
  ): Promise<void> {
    for (const line of lines) {
      const material = await this.materialRepo.findById(
        tenantId,
        line.materialId
      );
      if (!material) {
        throw new NotFoundError(
          `Material with ID ${line.materialId} not found in this tenant.`
        );
      }
      if (material.status !== 'ACTIVE') {
        throw new BadRequestError(
          `Material ${material.name} (${material.itemCode}) is inactive.`
        );
      }

      if (line.wbsNodeId) {
        const wbs = await this.prisma.wbsNode.findFirst({
          where: { id: line.wbsNodeId, tenantId },
        });
        if (!wbs) {
          throw new NotFoundError(
            `WBS Node with ID ${line.wbsNodeId} not found in this tenant.`
          );
        }
        if (wbs.projectId !== projectId) {
          throw new BadRequestError(
            `WBS Node ${wbs.code} belongs to project ${wbs.projectId}, not issue project ${projectId}.`
          );
        }
      }

      if (line.taskId) {
        const task = await this.prisma.task.findFirst({
          where: { id: line.taskId, tenantId },
        });
        if (!task) {
          throw new NotFoundError(
            `Task with ID ${line.taskId} not found in this tenant.`
          );
        }
        if (task.projectId !== projectId) {
          throw new BadRequestError(
            `Task ${task.name} belongs to project ${task.projectId}, not issue project ${projectId}.`
          );
        }
      }
    }
  }
}

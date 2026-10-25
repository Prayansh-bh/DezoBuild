import type { PrismaClient } from '@prisma/client';
import type {
  IMaterialIndentRepository,
  MaterialIndentWithRelations,
} from '../repositories/material-indent.repository.interface';
import { PrismaMaterialIndentRepository } from '../repositories/prisma-material-indent.repository';
import type {
  CreateMaterialIndentDto,
  UpdateMaterialIndentDto,
  SubmitMaterialIndentDto,
  ApproveMaterialIndentDto,
  RejectMaterialIndentDto,
  CancelMaterialIndentDto,
  ListMaterialIndentQueryDto,
} from '../dto/material-indent.dto';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import { DatabaseService } from '../../../database/database.service';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export interface MaterialIndentServiceDependencies {
  indentRepository?: IMaterialIndentRepository;
  authorizationService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class MaterialIndentService {
  private static instance: MaterialIndentService;
  private readonly indentRepo: IMaterialIndentRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: any;

  constructor(deps?: MaterialIndentServiceDependencies) {
    this.indentRepo = deps?.indentRepository ?? new PrismaMaterialIndentRepository();
    this.authService = deps?.authorizationService ?? AuthorizationService.getInstance();
    this.entitlementService = deps?.entitlementService ?? new EntitlementService();
    this.prisma = deps?.prisma ?? DatabaseService.getInstance().getClient();
  }

  public static getInstance(deps?: MaterialIndentServiceDependencies): MaterialIndentService {
    if (!MaterialIndentService.instance || deps) {
      MaterialIndentService.instance = new MaterialIndentService(deps);
    }
    return MaterialIndentService.instance;
  }

  public static resetInstance(): void {
    MaterialIndentService.instance = undefined as unknown as MaterialIndentService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(tenantId, 'materials:core');
    if (!isEntitled) {
      throw new ForbiddenError('Feature entitlement materials:core required for Material Indents.');
    }
  }

  /**
   * List material indents accessible to the user.
   */
  async listIndents(
    tenantId: string,
    userId: string,
    query?: ListMaterialIndentQueryDto
  ): Promise<{ items: MaterialIndentWithRelations[]; total: number }> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(tenantId, userId, 'materials:view');
    if (!hasViewPerm) {
      throw new ForbiddenError('Missing required permission: materials:view');
    }

    const authCtx = await this.authService.getUserAuthorizationContext(tenantId, userId);
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
        'materials:view'
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to project denied.');
      }
    }

    return this.indentRepo.findMany(tenantId, allowedProjectIds, query);
  }

  /**
   * Get single material indent by ID.
   */
  async getIndentById(
    tenantId: string,
    userId: string,
    id: string,
    projectId?: string
  ): Promise<MaterialIndentWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const indent = await this.indentRepo.findById(tenantId, id, projectId);
    if (!indent) {
      throw new NotFoundError('Material indent not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      indent.projectId,
      'materials:view'
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    return indent;
  }

  /**
   * Create a new Material Indent in DRAFT state.
   */
  async createIndent(
    tenantId: string,
    userId: string,
    dto: CreateMaterialIndentDto
  ): Promise<MaterialIndentWithRelations> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      dto.projectId,
      'materials:indent:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:indent:create or project access denied.'
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId },
    });
    if (!project) {
      throw new NotFoundError('Project not found in tenant.');
    }

    if (dto.storeId) {
      const store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, tenantId },
      });
      if (!store) {
        throw new NotFoundError('Store not found in tenant.');
      }
      if (store.projectId && store.projectId !== dto.projectId) {
        throw new BadRequestError('Store belongs to a different project.');
      }
    }

    // Line items validation
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestError('Material indent must contain at least one line item.');
    }

    const materialIds = dto.lines.map((l) => l.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestError(
        'Duplicate material lines are not allowed in an indent. Consolidate quantities into a single line.'
      );
    }

    for (const line of dto.lines) {
      if (line.quantityRequested <= 0) {
        throw new BadRequestError('Requested quantity must be greater than 0.');
      }

      const material = await this.prisma.material.findFirst({
        where: { id: line.materialId, tenantId },
      });
      if (!material) {
        throw new NotFoundError(`Material ID ${line.materialId} not found in tenant.`);
      }
      if (material.status !== 'ACTIVE') {
        throw new BadRequestError(`Material ${material.itemCode} is inactive.`);
      }

      if (line.uom !== material.primaryUom && line.uom !== material.secondaryUom) {
        throw new BadRequestError(
          `UOM ${line.uom} is invalid for material ${material.itemCode}. Must be ${material.primaryUom}${
            material.secondaryUom ? ' or ' + material.secondaryUom : ''
          }.`
        );
      }

      if (line.wbsNodeId) {
        const wbs = await this.prisma.wbsNode.findFirst({
          where: { id: line.wbsNodeId, projectId: dto.projectId, tenantId },
        });
        if (!wbs) {
          throw new BadRequestError(
            `Referenced WBS node ID ${line.wbsNodeId} not found in this project.`
          );
        }
      }

      if (line.taskId) {
        const task = await this.prisma.task.findFirst({
          where: { id: line.taskId, projectId: dto.projectId, tenantId },
        });
        if (!task) {
          throw new BadRequestError(`Referenced task ID ${line.taskId} not found in this project.`);
        }
      }
    }

    const indentNumber = await this.indentRepo.allocateIndentNumber(
      tenantId,
      dto.projectId,
      project.code,
      new Date()
    );

    return this.indentRepo.create(tenantId, dto.projectId, userId, indentNumber, dto);
  }

  /**
   * Update draft or rejected indent.
   */
  async updateIndent(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateMaterialIndentDto
  ): Promise<MaterialIndentWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const indent = await this.indentRepo.findById(tenantId, id);
    if (!indent) {
      throw new NotFoundError('Material indent not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      indent.projectId,
      'materials:indent:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:indent:create or project access denied.'
      );
    }

    if (indent.status === 'SUBMITTED') {
      throw new BadRequestError(
        'A submitted indent is locked for editing. It must be rejected or cancelled first.'
      );
    }
    if (indent.status === 'APPROVED') {
      throw new BadRequestError('An approved indent is permanently immutable and cannot be updated.');
    }
    if (indent.status === 'CANCELLED' || indent.status === 'FULFILLED') {
      throw new BadRequestError(`Cannot update indent in ${indent.status} status.`);
    }

    if (dto.storeId) {
      const store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, tenantId },
      });
      if (!store) {
        throw new NotFoundError('Store not found in tenant.');
      }
      if (store.projectId && store.projectId !== indent.projectId) {
        throw new BadRequestError('Store belongs to a different project.');
      }
    }

    if (dto.lines) {
      if (dto.lines.length === 0) {
        throw new BadRequestError('Material indent must contain at least one line item.');
      }

      const materialIds = dto.lines.map((l) => l.materialId);
      if (new Set(materialIds).size !== materialIds.length) {
        throw new BadRequestError(
          'Duplicate material lines are not allowed in an indent. Consolidate quantities into a single line.'
        );
      }

      for (const line of dto.lines) {
        if (line.quantityRequested <= 0) {
          throw new BadRequestError('Requested quantity must be greater than 0.');
        }

        const material = await this.prisma.material.findFirst({
          where: { id: line.materialId, tenantId },
        });
        if (!material) {
          throw new NotFoundError(`Material ID ${line.materialId} not found in tenant.`);
        }
        if (material.status !== 'ACTIVE') {
          throw new BadRequestError(`Material ${material.itemCode} is inactive.`);
        }

        if (line.uom !== material.primaryUom && line.uom !== material.secondaryUom) {
          throw new BadRequestError(
            `UOM ${line.uom} is invalid for material ${material.itemCode}. Must be ${material.primaryUom}${
              material.secondaryUom ? ' or ' + material.secondaryUom : ''
            }.`
          );
        }

        if (line.wbsNodeId) {
          const wbs = await this.prisma.wbsNode.findFirst({
            where: { id: line.wbsNodeId, projectId: indent.projectId, tenantId },
          });
          if (!wbs) {
            throw new BadRequestError(
              `Referenced WBS node ID ${line.wbsNodeId} not found in this project.`
            );
          }
        }

        if (line.taskId) {
          const task = await this.prisma.task.findFirst({
            where: { id: line.taskId, projectId: indent.projectId, tenantId },
          });
          if (!task) {
            throw new BadRequestError(`Referenced task ID ${line.taskId} not found in this project.`);
          }
        }
      }
    }

    return this.indentRepo.update(tenantId, id, dto);
  }

  /**
   * Submit an indent for approval.
   */
  async submitIndent(
    tenantId: string,
    userId: string,
    id: string,
    _dto?: SubmitMaterialIndentDto
  ): Promise<MaterialIndentWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const indent = await this.indentRepo.findById(tenantId, id);
    if (!indent) {
      throw new NotFoundError('Material indent not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      indent.projectId,
      'materials:indent:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:indent:create or project access denied.'
      );
    }

    if (indent.status === 'SUBMITTED') {
      throw new BadRequestError('Indent is already in submitted status.');
    }
    if (indent.status === 'APPROVED') {
      throw new BadRequestError('An approved indent cannot be resubmitted.');
    }
    if (indent.status === 'CANCELLED' || indent.status === 'FULFILLED') {
      throw new BadRequestError(`Cannot submit an indent in ${indent.status} status.`);
    }

    if (!indent.lines || indent.lines.length === 0) {
      throw new BadRequestError('Indent must contain at least one line item before submission.');
    }

    return this.indentRepo.submit(tenantId, id, userId);
  }

  /**
   * Approve an indent.
   * STRICT SEGREGATION OF DUTIES (SoD): Approver cannot be creator or submitter.
   */
  async approveIndent(
    tenantId: string,
    userId: string,
    id: string,
    dto?: ApproveMaterialIndentDto
  ): Promise<MaterialIndentWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const indent = await this.indentRepo.findById(tenantId, id);
    if (!indent) {
      throw new NotFoundError('Material indent not found.');
    }

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      tenantId,
      'MATERIAL_INDENT',
      id
    );


    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      indent.projectId,
      'materials:indent:approve'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:indent:approve or project access denied.'
      );
    }

    if (indent.status === 'DRAFT') {
      throw new BadRequestError('Cannot approve an indent that has not been submitted.');
    }
    if (indent.status === 'APPROVED') {
      throw new BadRequestError('Indent is already approved.');
    }
    if (indent.status === 'REJECTED') {
      throw new BadRequestError('Cannot approve a rejected indent. It must be revised and resubmitted.');
    }
    if (indent.status !== 'SUBMITTED') {
      throw new BadRequestError(`Cannot approve indent in ${indent.status} status.`);
    }

    // STRICT SEGREGATION OF DUTIES
    if (indent.createdById === userId || indent.submittedById === userId) {
      throw new ForbiddenError(
        'Segregation of Duties violation: The creator or submitter of a Material Indent cannot approve it.'
      );
    }

    return this.indentRepo.approve(tenantId, id, userId, dto?.approvalRemarks);
  }

  /**
   * Reject a submitted indent with mandatory rejection reason.
   */
  async rejectIndent(
    tenantId: string,
    userId: string,
    id: string,
    dto: RejectMaterialIndentDto
  ): Promise<MaterialIndentWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const indent = await this.indentRepo.findById(tenantId, id);
    if (!indent) {
      throw new NotFoundError('Material indent not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      indent.projectId,
      'materials:indent:approve'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:indent:approve or project access denied.'
      );
    }

    if (indent.status === 'DRAFT') {
      throw new BadRequestError('Cannot reject an indent that is still in draft status.');
    }
    if (indent.status === 'REJECTED') {
      throw new BadRequestError('Indent is already in rejected status.');
    }
    if (indent.status === 'APPROVED') {
      throw new BadRequestError('An approved indent cannot be rejected.');
    }
    if (indent.status !== 'SUBMITTED') {
      throw new BadRequestError(`Cannot reject indent in ${indent.status} status.`);
    }

    if (!dto.rejectionReason || dto.rejectionReason.trim().length === 0) {
      throw new BadRequestError('rejectionReason is mandatory when rejecting an indent.');
    }

    return this.indentRepo.reject(tenantId, id, userId, dto.rejectionReason.trim());
  }

  /**
   * Cancel an approved indent before fulfillment.
   */
  async cancelIndent(
    tenantId: string,
    userId: string,
    id: string,
    dto?: CancelMaterialIndentDto
  ): Promise<MaterialIndentWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const indent = await this.indentRepo.findById(tenantId, id);
    if (!indent) {
      throw new NotFoundError('Material indent not found.');
    }

    const canCreate = (
      await this.authService.hasProjectAccess(
        tenantId,
        userId,
        indent.projectId,
        'materials:indent:create'
      )
    ).granted;

    const canApprove = (
      await this.authService.hasProjectAccess(
        tenantId,
        userId,
        indent.projectId,
        'materials:indent:approve'
      )
    ).granted;

    if (!canCreate && !canApprove) {
      throw new ForbiddenError(
        'Permission materials:indent:create or materials:indent:approve required to cancel an indent.'
      );
    }

    if (indent.status === 'CANCELLED') {
      throw new BadRequestError('Indent is already cancelled.');
    }
    if (indent.status === 'FULFILLED') {
      throw new BadRequestError('Cannot cancel a fulfilled indent.');
    }
    if (indent.status !== 'APPROVED') {
      throw new BadRequestError('Only approved indents can be cancelled.');
    }

    const fulfilledTotal = indent.lines.reduce(
      (sum, l) => sum + Number(l.quantityFulfilled),
      0
    );
    if (fulfilledTotal > 0) {
      throw new BadRequestError(
        'Cannot cancel an indent that has already been partially or fully fulfilled.'
      );
    }

    return this.indentRepo.cancel(tenantId, id, userId, dto?.cancellationReason);
  }

  /**
   * Delete a DRAFT indent.
   */
  async deleteIndent(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const indent = await this.indentRepo.findById(tenantId, id);
    if (!indent) {
      throw new NotFoundError('Material indent not found.');
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      indent.projectId,
      'materials:indent:create'
    );
    if (!access.granted) {
      throw new ForbiddenError(
        access.reason || 'Permission materials:indent:create or project access denied.'
      );
    }

    if (indent.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete indent in ${indent.status} status. Only DRAFT indents can be deleted.`
      );
    }

    await this.indentRepo.delete(tenantId, id);
  }
}

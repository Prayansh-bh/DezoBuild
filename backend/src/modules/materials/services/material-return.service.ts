import { PrismaClient } from '@prisma/client';
import type {
  IMaterialReturnRepository,
  MaterialReturnWithRelations,
} from '../repositories/material-return.repository.interface';
import { PrismaMaterialReturnRepository } from '../repositories/prisma-material-return.repository';
import type { IMaterialIssueRepository } from '../repositories/material-issue.repository.interface';
import { PrismaMaterialIssueRepository } from '../repositories/prisma-material-issue.repository';
import type { IStoreRepository } from '../repositories/store.repository.interface';
import { PrismaStoreRepository } from '../repositories/prisma-store.repository';
import type { IMaterialRepository } from '../repositories/material.repository.interface';
import { PrismaMaterialRepository } from '../repositories/prisma-material.repository';
import type {
  CreateMaterialReturnDto,
  UpdateMaterialReturnDto,
  SubmitMaterialReturnDto,
  VerifyMaterialReturnDto,
  RejectMaterialReturnDto,
  CancelMaterialReturnDto,
  ListMaterialReturnsQueryDto,
} from '../dto/material-return.dto';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import { EntitlementService } from '../../subscriptions/services/entitlement.service';
import { DatabaseService } from '../../../database/database.service';
import {
  MATERIAL_RETURN_ENTITLEMENT,
  MATERIAL_RETURN_PERMISSIONS,
} from '../constants/material-return.constants';

export interface MaterialReturnServiceDependencies {
  materialReturnRepository?: IMaterialReturnRepository;
  materialIssueRepository?: IMaterialIssueRepository;
  storeRepository?: IStoreRepository;
  materialRepository?: IMaterialRepository;
  authorizationService?: AuthorizationService;
  entitlementService?: EntitlementService;
  prisma?: PrismaClient;
}

export class MaterialReturnService {
  private static instance: MaterialReturnService;
  private readonly returnRepo: IMaterialReturnRepository;
  private readonly issueRepo: IMaterialIssueRepository;
  private readonly storeRepo: IStoreRepository;
  private readonly materialRepo: IMaterialRepository;
  private readonly authService: AuthorizationService;
  private readonly entitlementService: EntitlementService;
  private readonly prisma: any;

  constructor(deps?: MaterialReturnServiceDependencies) {
    this.returnRepo =
      deps?.materialReturnRepository ??
      PrismaMaterialReturnRepository.getInstance();
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
    deps?: MaterialReturnServiceDependencies
  ): MaterialReturnService {
    if (!MaterialReturnService.instance || deps) {
      MaterialReturnService.instance = new MaterialReturnService(deps);
    }
    return MaterialReturnService.instance;
  }

  public static resetInstance(): void {
    MaterialReturnService.instance =
      undefined as unknown as MaterialReturnService;
  }

  private async verifyEntitlement(tenantId: string): Promise<void> {
    const isEntitled = await this.entitlementService.isFeatureEntitled(
      tenantId,
      MATERIAL_RETURN_ENTITLEMENT
    );
    if (!isEntitled) {
      throw new ForbiddenError(
        `Feature entitlement ${MATERIAL_RETURN_ENTITLEMENT} required for Material Return.`
      );
    }
  }

  public async listMaterialReturns(
    tenantId: string,
    userId: string,
    query?: ListMaterialReturnsQueryDto
  ): Promise<{ items: MaterialReturnWithRelations[]; total: number }> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Tenant and user contexts are required.');
    }

    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_RETURN_PERMISSIONS.VIEW
    );
    if (!hasViewPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_RETURN_PERMISSIONS.VIEW}`
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
        MATERIAL_RETURN_PERMISSIONS.VIEW
      );
      if (!access.granted) {
        throw new ForbiddenError(access.reason || 'Access to project denied.');
      }
    }

    return this.returnRepo.findMany(tenantId, allowedProjectIds, query);
  }

  public async getMaterialReturnById(
    tenantId: string,
    userId: string,
    id: string,
    projectId?: string
  ): Promise<MaterialReturnWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const hasViewPerm = await this.authService.hasPermission(
      tenantId,
      userId,
      MATERIAL_RETURN_PERMISSIONS.VIEW
    );
    if (!hasViewPerm) {
      throw new ForbiddenError(
        `Missing required permission: ${MATERIAL_RETURN_PERMISSIONS.VIEW}`
      );
    }

    const ret = await this.returnRepo.findById(tenantId, id, projectId);
    if (!ret) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      ret.projectId,
      MATERIAL_RETURN_PERMISSIONS.VIEW
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    return ret;
  }

  public async createMaterialReturn(
    tenantId: string,
    userId: string,
    dto: CreateMaterialReturnDto
  ): Promise<MaterialReturnWithRelations> {
    if (!tenantId || !userId) {
      throw new BadRequestError('Missing tenant or user context.');
    }

    await this.verifyEntitlement(tenantId);

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      dto.projectId,
      MATERIAL_RETURN_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    // 1. Verify Project exists
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId },
      select: { id: true, code: true, name: true },
    });
    if (!project) {
      throw new NotFoundError(
        `Project with ID ${dto.projectId} not found in tenant ${tenantId}.`
      );
    }

    // 2. Verify Store exists and is ACTIVE
    const store = await this.storeRepo.findById(tenantId, dto.storeId);
    if (!store) {
      throw new NotFoundError(
        `Store with ID ${dto.storeId} not found in tenant ${tenantId}.`
      );
    }
    if (store.status !== 'ACTIVE') {
      throw new BadRequestError(
        `Store '${store.name}' (${store.code}) is not ACTIVE.`
      );
    }

    // 3. Verify Source MaterialIssue exists and is ISSUED
    const issue = await this.issueRepo.findById(tenantId, dto.materialIssueId);
    if (!issue) {
      throw new NotFoundError(
        `Source material issue with ID ${dto.materialIssueId} not found.`
      );
    }

    if (issue.projectId !== dto.projectId) {
      throw new BadRequestError(
        `Project mismatch: Material issue belongs to project ${issue.projectId}, but return requested for project ${dto.projectId}.`
      );
    }

    if (issue.status !== 'ISSUED') {
      throw new BadRequestError(
        `Material returns can only be created against an ISSUED material issue. Current issue status: ${issue.status}.`
      );
    }

    // 4. Same Store Rule: MaterialReturn.storeId MUST equal MaterialIssue.storeId
    if (issue.storeId !== dto.storeId) {
      throw new BadRequestError(
        `Store mismatch: Material issue was issued from store ${issue.storeId}, but return requested to store ${dto.storeId}. Same store rule requires returns to the original issue store.`
      );
    }

    // 5. Validate Return Lines against Source Issue Lines
    const issueLineMap = new Map(issue.lines.map((l) => [l.id, l]));
    const preparedLines: Array<{
      materialIssueLineId: string;
      materialId: string;
      quantityReturned: number;
      uom: string;
      condition?: string;
      remarks?: string | null;
    }> = [];

    for (const lineDto of dto.lines) {
      const issueLine = issueLineMap.get(lineDto.materialIssueLineId);
      if (!issueLine) {
        throw new BadRequestError(
          `Material issue line ${lineDto.materialIssueLineId} does not belong to source material issue ${issue.issueNumber}.`
        );
      }

      const qtyReturned = Number(lineDto.quantityReturned);
      if (qtyReturned <= 0) {
        throw new BadRequestError(
          `Returned quantity must be strictly greater than 0.`
        );
      }

      // Calculate previously verified returns for this issue line
      const verifiedReturns = await this.prisma.$queryRaw<
        Array<{ total_verified: string | number }>
      >`
        SELECT COALESCE(SUM(mrl.quantity_returned), 0) AS total_verified
        FROM material_return_lines mrl
        JOIN material_returns mr ON mr.id = mrl.material_return_id
        WHERE mr.tenant_id = ${tenantId}::uuid
          AND mr.status = 'VERIFIED'
          AND mrl.material_issue_line_id = ${issueLine.id}::uuid
      `;

      const previouslyReturned = Number(
        verifiedReturns[0]?.total_verified ?? 0
      );
      const issuedQty = Number(issueLine.quantityIssued);
      const returnableQty = issuedQty - previouslyReturned;

      if (qtyReturned > returnableQty + 0.0001) {
        throw new BadRequestError(
          `Over-return rejected: Returned quantity (${qtyReturned}) exceeds returnable quantity (${returnableQty}) for issue line ${issueLine.id}. Issued: ${issuedQty}, Previously returned: ${previouslyReturned}.`
        );
      }

      preparedLines.push({
        materialIssueLineId: issueLine.id,
        materialId: issueLine.materialId,
        quantityReturned: qtyReturned,
        uom: issueLine.uom,
        condition: lineDto.condition || 'GOOD',
        remarks: lineDto.remarks || null,
      });
    }

    // 6. Allocate Sequence and Return Number
    const returnNumber = await this.returnRepo.allocateReturnNumber(
      tenantId,
      dto.projectId,
      project.code,
      dto.returnDate ? new Date(dto.returnDate) : undefined
    );

    // 7. Create DRAFT MaterialReturn
    return this.returnRepo.create(
      tenantId,
      userId,
      returnNumber,
      dto,
      preparedLines
    );
  }

  public async updateMaterialReturn(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateMaterialReturnDto
  ): Promise<MaterialReturnWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const existing = await this.returnRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      existing.projectId,
      MATERIAL_RETURN_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestError(
        `Only DRAFT or REJECTED material returns can be updated. Current status: ${existing.status}`
      );
    }

    let preparedLines:
      | Array<{
          materialIssueLineId: string;
          materialId: string;
          quantityReturned: number;
          uom: string;
          condition?: string;
          remarks?: string | null;
        }>
      | undefined;

    if (dto.lines && dto.lines.length > 0) {
      const issue = await this.issueRepo.findById(
        tenantId,
        existing.materialIssueId
      );
      if (!issue) {
        throw new NotFoundError(
          `Source material issue ${existing.materialIssueId} not found.`
        );
      }

      const issueLineMap = new Map(issue.lines.map((l) => [l.id, l]));
      preparedLines = [];

      for (const lineDto of dto.lines) {
        const issueLine = issueLineMap.get(lineDto.materialIssueLineId);
        if (!issueLine) {
          throw new BadRequestError(
            `Material issue line ${lineDto.materialIssueLineId} does not belong to source material issue ${issue.issueNumber}.`
          );
        }

        const qtyReturned = Number(lineDto.quantityReturned);
        if (qtyReturned <= 0) {
          throw new BadRequestError(
            `Returned quantity must be strictly greater than 0.`
          );
        }

        // Calculate previously verified returns excluding this return
        const verifiedReturns = await this.prisma.$queryRaw<
          Array<{ total_verified: string | number }>
        >`
          SELECT COALESCE(SUM(mrl.quantity_returned), 0) AS total_verified
          FROM material_return_lines mrl
          JOIN material_returns mr ON mr.id = mrl.material_return_id
          WHERE mr.tenant_id = ${tenantId}::uuid
            AND mr.status = 'VERIFIED'
            AND mrl.material_issue_line_id = ${issueLine.id}::uuid
            AND mr.id != ${id}::uuid
        `;

        const previouslyReturned = Number(
          verifiedReturns[0]?.total_verified ?? 0
        );
        const issuedQty = Number(issueLine.quantityIssued);
        const returnableQty = issuedQty - previouslyReturned;

        if (qtyReturned > returnableQty + 0.0001) {
          throw new BadRequestError(
            `Over-return rejected: Returned quantity (${qtyReturned}) exceeds returnable quantity (${returnableQty}) for issue line ${issueLine.id}.`
          );
        }

        preparedLines.push({
          materialIssueLineId: issueLine.id,
          materialId: issueLine.materialId,
          quantityReturned: qtyReturned,
          uom: issueLine.uom,
          condition: lineDto.condition || 'GOOD',
          remarks: lineDto.remarks || null,
        });
      }
    }

    return this.returnRepo.update(tenantId, id, dto, preparedLines);
  }

  public async submitMaterialReturn(
    tenantId: string,
    userId: string,
    id: string,
    dto?: SubmitMaterialReturnDto
  ): Promise<MaterialReturnWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const existing = await this.returnRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      existing.projectId,
      MATERIAL_RETURN_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestError(
        `Only DRAFT or REJECTED material returns can be submitted. Current status: ${existing.status}`
      );
    }

    if (!existing.lines || existing.lines.length === 0) {
      throw new BadRequestError(
        'Cannot submit a material return without line items.'
      );
    }

    // Verify source issue is still ISSUED
    const issue = await this.issueRepo.findById(
      tenantId,
      existing.materialIssueId
    );
    if (!issue || issue.status !== 'ISSUED') {
      throw new BadRequestError(
        `Source material issue must be in ISSUED status (current: ${
          issue?.status || 'NOT_FOUND'
        }).`
      );
    }

    return this.returnRepo.submit(tenantId, id, userId, dto?.remarks);
  }

  public async verifyMaterialReturn(
    tenantId: string,
    userId: string,
    id: string,
    dto?: VerifyMaterialReturnDto
  ): Promise<MaterialReturnWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const existing = await this.returnRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      existing.projectId,
      MATERIAL_RETURN_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (existing.status === 'VERIFIED') {
      // Idempotent return
      return existing;
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material returns can be verified. Current status: ${existing.status}`
      );
    }

    // Segregation of Duties Check
    if (existing.returnedById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Verifier cannot be the return submitter.'
      );
    }

    return this.returnRepo.verify(
      tenantId,
      id,
      userId,
      dto?.verificationRemarks
    );
  }

  public async rejectMaterialReturn(
    tenantId: string,
    userId: string,
    id: string,
    dto: RejectMaterialReturnDto
  ): Promise<MaterialReturnWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const existing = await this.returnRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      existing.projectId,
      MATERIAL_RETURN_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestError(
        `Only SUBMITTED material returns can be rejected. Current status: ${existing.status}`
      );
    }

    // Segregation of Duties Check: verifier/rejector cannot be the return submitter
    if (existing.returnedById === userId) {
      throw new ForbiddenError(
        'Segregation of duties violation: Rejector cannot be the return submitter.'
      );
    }

    return this.returnRepo.reject(
      tenantId,
      id,
      userId,
      dto.rejectionReason
    );
  }

  public async cancelMaterialReturn(
    tenantId: string,
    userId: string,
    id: string,
    dto?: CancelMaterialReturnDto
  ): Promise<MaterialReturnWithRelations> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const existing = await this.returnRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      existing.projectId,
      MATERIAL_RETURN_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (existing.status === 'VERIFIED') {
      throw new BadRequestError(
        'Cannot cancel an already VERIFIED material return.'
      );
    }

    if (existing.status === 'CANCELLED') {
      throw new BadRequestError('Material return is already CANCELLED.');
    }

    return this.returnRepo.cancel(
      tenantId,
      id,
      userId,
      dto?.cancellationReason
    );
  }

  public async deleteMaterialReturn(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    if (!tenantId || !userId || !id) {
      throw new BadRequestError('Missing required identifiers.');
    }

    await this.verifyEntitlement(tenantId);

    const existing = await this.returnRepo.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(`Material return with ID ${id} not found.`);
    }

    const access = await this.authService.hasProjectAccess(
      tenantId,
      userId,
      existing.projectId,
      MATERIAL_RETURN_PERMISSIONS.ISSUE
    );
    if (!access.granted) {
      throw new ForbiddenError(access.reason || 'Access to project denied.');
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete material return in status '${existing.status}'. Only DRAFT returns can be deleted.`
      );
    }

    await this.returnRepo.delete(tenantId, id);
  }
}

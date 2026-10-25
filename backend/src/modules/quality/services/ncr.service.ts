import type { PrismaClient, NonConformanceReport } from '@prisma/client';
import { NcrRepository } from '../repositories/ncr.repository.js';
import { QualitySafetyAuditRepository } from '../repositories/quality-safety-audit.repository.js';
import { getNextQualitySafetySequence } from '../helpers/quality-sequence.helper.js';
import {
  NcrStatus,
  ActionStatus,
  type QualityRequestContext,
} from '../constants/quality.constants.js';
import type {
  CreateNcrDto,
  UpdateDraftNcrDto,
  TransitionActionRequiredNcrDto,
  SubmitVerificationNcrDto,
  VerifyAndCloseNcrDto,
  RejectVerificationNcrDto,
  ReopenNcrDto,
  VoidNcrDto,
  ListNcrsQueryDto,
} from '../dto/ncr.dto.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../common/errors/app-error.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export class NcrService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ncrRepo: NcrRepository,
    private readonly auditRepo: QualitySafetyAuditRepository
  ) {}

  async create(ctx: QualityRequestContext, dto: CreateNcrDto): Promise<NonConformanceReport> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify Project
      const project = await tx.project.findFirst({
        where: { id: dto.projectId, tenantId: ctx.tenantId },
      });
      if (!project) {
        throw new BadRequestError('Invalid projectId: project not found in current tenant');
      }

      // 2. Validate Relations
      if (dto.inspectionRequestId) {
        const insp = await tx.inspectionRequest.findFirst({
          where: { id: dto.inspectionRequestId, tenantId: ctx.tenantId, projectId: dto.projectId },
        });
        if (!insp) throw new BadRequestError('Invalid inspectionRequestId: inspection not found in current project/tenant');
      }
      if (dto.responsibleVendorId) {
        const vendor = await tx.vendor.findFirst({
          where: { id: dto.responsibleVendorId, tenantId: ctx.tenantId },
        });
        if (!vendor) throw new BadRequestError('Invalid responsibleVendorId: vendor not found in current tenant');
      }

      // 3. Target Closure Date >= Today
      const targetDate = new Date(dto.targetClosureDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (targetDate < today) {
        throw new BadRequestError('targetClosureDate cannot be in the past');
      }

      // 4. Allocate Sequence Number
      const ncrNumber = await getNextQualitySafetySequence(ctx.tenantId, 'NCR', tx);

      // 5. Create NCR
      const ncr = await this.ncrRepo.create(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          inspectionRequestId: dto.inspectionRequestId,
          ncrNumber,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          category: dto.category,
          severity: dto.severity,
          status: NcrStatus.OPEN,
          responsibleVendorId: dto.responsibleVendorId,
          responsibleParty: dto.responsibleParty,
          raisedById: ctx.user.id,
          raisedAt: new Date(),
          targetClosureDate: targetDate,
          containmentAction: dto.containmentAction,
        },
        tx
      );

      // 6. Record Audit Log
      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          entityType: 'NON_CONFORMANCE_REPORT',
          entityId: ncr.id,
          action: 'CREATE',
          actorId: ctx.user.id,
          newState: ncr as any,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return (await this.ncrRepo.findById(ctx.tenantId, ncr.id, tx)) as NonConformanceReport;
    });
  }

  async getById(ctx: QualityRequestContext, id: string): Promise<NonConformanceReport> {
    const ncr = await this.ncrRepo.findById(ctx.tenantId, id);
    if (!ncr) {
      throw new NotFoundError(`Non-conformance report with ID '${id}' not found`);
    }
    return ncr;
  }

  async list(
    ctx: QualityRequestContext,
    query: ListNcrsQueryDto
  ): Promise<{ items: NonConformanceReport[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.ncrRepo.list(
      ctx.tenantId,
      {
        projectId: query.projectId,
        status: query.status,
        severity: query.severity,
        category: query.category,
      },
      { skip, take: limit }
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateDraft(ctx: QualityRequestContext, id: string, dto: UpdateDraftNcrDto): Promise<NonConformanceReport> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.ncrRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('NCR not found');

      if (existing.status !== NcrStatus.OPEN) {
        throw new BadRequestError(`Cannot edit NCR in ${existing.status} status. Expected OPEN.`);
      }

      if (existing.raisedById !== ctx.user.id && ctx.user.role !== 'COMPANY_OWNER' && ctx.user.role !== 'COMPANY_ADMIN') {
        throw new ForbiddenError('Only the NCR creator or administrators can edit an open NCR draft.');
      }

      if (dto.responsibleVendorId) {
        const vendor = await tx.vendor.findFirst({
          where: { id: dto.responsibleVendorId, tenantId: ctx.tenantId },
        });
        if (!vendor) throw new BadRequestError('Invalid responsibleVendorId: vendor not found in current tenant');
      }

      const updated = await this.ncrRepo.update(
        ctx.tenantId,
        id,
        {
          title: dto.title,
          description: dto.description,
          location: dto.location,
          category: dto.category,
          severity: dto.severity,
          responsibleVendorId: dto.responsibleVendorId,
          responsibleParty: dto.responsibleParty,
          targetClosureDate: dto.targetClosureDate ? new Date(dto.targetClosureDate) : undefined,
          containmentAction: dto.containmentAction,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'NON_CONFORMANCE_REPORT',
          entityId: id,
          action: 'UPDATE_DRAFT',
          actorId: ctx.user.id,
          previousState: existing as any,
          newState: updated as any,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async requireAction(
    ctx: QualityRequestContext,
    id: string,
    dto: TransitionActionRequiredNcrDto
  ): Promise<NonConformanceReport> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.ncrRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('NCR not found');

      if (existing.status !== NcrStatus.OPEN && existing.status !== NcrStatus.UNDER_VERIFICATION) {
        throw new BadRequestError(`Cannot transition NCR to ACTION_REQUIRED from ${existing.status} status.`);
      }

      const updated = await this.ncrRepo.update(
        ctx.tenantId,
        id,
        {
          status: NcrStatus.ACTION_REQUIRED,
          rootCause: dto.rootCause,
          correctiveAction: dto.correctiveAction,
          preventiveAction: dto.preventiveAction,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'NON_CONFORMANCE_REPORT',
          entityId: id,
          action: 'REQUIRE_ACTION',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: NcrStatus.ACTION_REQUIRED, rootCause: dto.rootCause },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async submitVerification(
    ctx: QualityRequestContext,
    id: string,
    dto: SubmitVerificationNcrDto
  ): Promise<NonConformanceReport> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.ncrRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('NCR not found');

      if (existing.status !== NcrStatus.ACTION_REQUIRED) {
        throw new BadRequestError(`Cannot submit NCR for verification in ${existing.status} status. Expected ACTION_REQUIRED.`);
      }

      // Check linked CAPAs: All active actions must be at least COMPLETED or CANCELLED
      const actions = await tx.qualitySafetyAction.findMany({
        where: { tenantId: ctx.tenantId, ncrId: id },
      });

      const openActions = actions.filter(
        (a) => a.status === ActionStatus.OPEN || a.status === ActionStatus.IN_PROGRESS
      );
      if (openActions.length > 0) {
        const actionNums = openActions.map((a) => a.actionNumber).join(', ');
        throw new BadRequestError(`Cannot submit NCR for verification: linked CAPA actions (${actionNums}) must be COMPLETED before verification.`);
      }

      const updated = await this.ncrRepo.update(
        ctx.tenantId,
        id,
        {
          status: NcrStatus.UNDER_VERIFICATION,
          closureRemarks: dto.remarks || existing.closureRemarks,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'NON_CONFORMANCE_REPORT',
          entityId: id,
          action: 'SUBMIT_VERIFICATION',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: NcrStatus.UNDER_VERIFICATION },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async verifyAndClose(
    ctx: QualityRequestContext,
    id: string,
    dto: VerifyAndCloseNcrDto
  ): Promise<NonConformanceReport> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.ncrRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('NCR not found');

      await ActiveApprovalGuard.assertNoActiveCentralApproval(
        tx,
        ctx.tenantId,
        'NON_CONFORMANCE_REPORT',
        id
      );

      if (existing.status !== NcrStatus.UNDER_VERIFICATION && existing.status !== NcrStatus.ACTION_REQUIRED) {

        throw new BadRequestError(`Cannot close NCR in ${existing.status} status. Expected UNDER_VERIFICATION.`);
      }

      // Segregation of Duties: NCR creator cannot close their own NCR
      if (existing.raisedById === ctx.user.id) {
        throw new ForbiddenError('Segregation of Duties violation: NCR creator cannot verify and close their own NCR.');
      }

      // All linked actions must be VERIFIED or CANCELLED
      const actions = await tx.qualitySafetyAction.findMany({
        where: { tenantId: ctx.tenantId, ncrId: id },
      });

      const unverifiedActions = actions.filter(
        (a) => a.status !== ActionStatus.VERIFIED && a.status !== ActionStatus.CANCELLED
      );
      if (unverifiedActions.length > 0) {
        const actionNums = unverifiedActions.map((a) => a.actionNumber).join(', ');
        throw new BadRequestError(`Cannot close NCR: linked CAPA actions (${actionNums}) must be formally VERIFIED first.`);
      }

      const updated = await this.ncrRepo.update(
        ctx.tenantId,
        id,
        {
          status: NcrStatus.CLOSED,
          verifiedById: ctx.user.id,
          closedAt: new Date(),
          closureRemarks: dto.closureRemarks,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'NON_CONFORMANCE_REPORT',
          entityId: id,
          action: 'VERIFY_AND_CLOSE',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: NcrStatus.CLOSED, verifiedById: ctx.user.id },
          reason: dto.closureRemarks,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async rejectVerification(
    ctx: QualityRequestContext,
    id: string,
    dto: RejectVerificationNcrDto
  ): Promise<NonConformanceReport> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.ncrRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('NCR not found');

      if (existing.status !== NcrStatus.UNDER_VERIFICATION) {
        throw new BadRequestError(`Cannot reject verification for NCR in ${existing.status} status. Expected UNDER_VERIFICATION.`);
      }

      // Segregation of Duties
      if (existing.raisedById === ctx.user.id) {
        throw new ForbiddenError('Segregation of Duties violation: NCR creator cannot reject verification.');
      }

      const updated = await this.ncrRepo.update(
        ctx.tenantId,
        id,
        {
          status: NcrStatus.ACTION_REQUIRED,
          closureRemarks: dto.rejectionReason,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'NON_CONFORMANCE_REPORT',
          entityId: id,
          action: 'REJECT_VERIFICATION',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: NcrStatus.ACTION_REQUIRED },
          reason: dto.rejectionReason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async reopen(ctx: QualityRequestContext, id: string, dto: ReopenNcrDto): Promise<NonConformanceReport> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.ncrRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('NCR not found');

      if (existing.status !== NcrStatus.CLOSED) {
        throw new BadRequestError(`Cannot reopen NCR in ${existing.status} status. Expected CLOSED.`);
      }

      const updated = await this.ncrRepo.update(
        ctx.tenantId,
        id,
        {
          status: NcrStatus.ACTION_REQUIRED,
          closureRemarks: dto.reason,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'NON_CONFORMANCE_REPORT',
          entityId: id,
          action: 'REOPEN',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: NcrStatus.ACTION_REQUIRED },
          reason: dto.reason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async voidNcr(ctx: QualityRequestContext, id: string, dto: VoidNcrDto): Promise<NonConformanceReport> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.ncrRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('NCR not found');

      if (existing.status !== NcrStatus.OPEN) {
        throw new BadRequestError(`Cannot void NCR in ${existing.status} status. Only OPEN NCRs may be voided.`);
      }

      const updated = await this.ncrRepo.update(
        ctx.tenantId,
        id,
        {
          status: NcrStatus.VOIDED,
          closureRemarks: dto.reason,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'NON_CONFORMANCE_REPORT',
          entityId: id,
          action: 'VOID',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: NcrStatus.VOIDED },
          reason: dto.reason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }
}

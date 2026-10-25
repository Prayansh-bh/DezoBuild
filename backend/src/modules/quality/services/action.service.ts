import type { PrismaClient, QualitySafetyAction } from '@prisma/client';
import { ActionRepository } from '../repositories/action.repository.js';
import { QualitySafetyAuditRepository } from '../repositories/quality-safety-audit.repository.js';
import { getNextQualitySafetySequence } from '../helpers/quality-sequence.helper.js';
import {
  ActionStatus,
  type QualityRequestContext,
} from '../constants/quality.constants.js';
import type {
  CreateActionDto,
  ReassignActionDto,
  CompleteActionDto,
  VerifyActionDto,
  CancelActionDto,
  ReopenActionDto,
  ListActionsQueryDto,
} from '../dto/action.dto.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../common/errors/app-error.js';

export class ActionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly actionRepo: ActionRepository,
    private readonly auditRepo: QualitySafetyAuditRepository
  ) {}

  async create(ctx: QualityRequestContext, dto: CreateActionDto): Promise<QualitySafetyAction> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify Project
      const project = await tx.project.findFirst({
        where: { id: dto.projectId, tenantId: ctx.tenantId },
      });
      if (!project) {
        throw new BadRequestError('Invalid projectId: project not found in current tenant');
      }

      // 2. Validate Source XOR
      const sources = [dto.ncrId, dto.incidentId, dto.observationId].filter(Boolean);
      if (sources.length !== 1) {
        throw new BadRequestError('Exactly one source (ncrId XOR incidentId XOR observationId) must be populated.');
      }

      if (dto.ncrId) {
        const ncr = await tx.nonConformanceReport.findFirst({
          where: { id: dto.ncrId, tenantId: ctx.tenantId, projectId: dto.projectId },
        });
        if (!ncr) throw new BadRequestError('Invalid ncrId: NCR not found in current project/tenant');
      }
      if (dto.incidentId) {
        const inc = await tx.safetyIncident.findFirst({
          where: { id: dto.incidentId, tenantId: ctx.tenantId, projectId: dto.projectId },
        });
        if (!inc) throw new BadRequestError('Invalid incidentId: Incident not found in current project/tenant');
      }
      if (dto.observationId) {
        const obs = await tx.safetyObservation.findFirst({
          where: { id: dto.observationId, tenantId: ctx.tenantId, projectId: dto.projectId },
        });
        if (!obs) throw new BadRequestError('Invalid observationId: Observation not found in current project/tenant');
      }

      // 3. Validate Assignee XOR
      const assignees = [dto.assignedToId, dto.assignedVendorId].filter(Boolean);
      if (assignees.length !== 1) {
        throw new BadRequestError('Exactly one assignee (assignedToId XOR assignedVendorId) must be populated.');
      }

      if (dto.assignedToId) {
        const emp = await tx.employee.findFirst({
          where: { id: dto.assignedToId, tenantId: ctx.tenantId },
        });
        if (!emp) throw new BadRequestError('Invalid assignedToId: Employee not found in tenant');
      }
      if (dto.assignedVendorId) {
        const vendor = await tx.vendor.findFirst({
          where: { id: dto.assignedVendorId, tenantId: ctx.tenantId },
        });
        if (!vendor) throw new BadRequestError('Invalid assignedVendorId: Vendor not found in tenant');
      }

      // 4. Validate Due Date
      const dueDate = new Date(dto.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        throw new BadRequestError('dueDate cannot be in the past');
      }

      // 5. Sequence Number
      const actionNumber = await getNextQualitySafetySequence(ctx.tenantId, 'ACT', tx);

      // 6. Create Action
      const action = await this.actionRepo.create(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          ncrId: dto.ncrId,
          incidentId: dto.incidentId,
          observationId: dto.observationId,
          actionNumber,
          title: dto.title,
          actionType: dto.actionType,
          description: dto.description,
          assignedToId: dto.assignedToId,
          assignedVendorId: dto.assignedVendorId,
          priority: dto.priority,
          status: ActionStatus.OPEN,
          dueDate,
          createdById: ctx.user.id,
        },
        tx
      );

      // 7. Audit Log
      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          entityType: 'QUALITY_SAFETY_ACTION',
          entityId: action.id,
          action: 'CREATE',
          actorId: ctx.user.id,
          newState: action as any,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return (await this.actionRepo.findById(ctx.tenantId, action.id, tx)) as QualitySafetyAction;
    });
  }

  async getById(ctx: QualityRequestContext, id: string): Promise<QualitySafetyAction> {
    const action = await this.actionRepo.findById(ctx.tenantId, id);
    if (!action) {
      throw new NotFoundError(`CAPA Action with ID '${id}' not found`);
    }
    return action;
  }

  async list(
    ctx: QualityRequestContext,
    query: ListActionsQueryDto
  ): Promise<{ items: QualitySafetyAction[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.actionRepo.list(
      ctx.tenantId,
      {
        projectId: query.projectId,
        status: query.status,
        priority: query.priority,
        actionType: query.actionType,
        ncrId: query.ncrId,
        incidentId: query.incidentId,
        observationId: query.observationId,
        assignedToId: query.assignedToId,
        assignedVendorId: query.assignedVendorId,
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

  async reassign(ctx: QualityRequestContext, id: string, dto: ReassignActionDto): Promise<QualitySafetyAction> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.actionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('CAPA Action not found');

      // Reassignment rules: Permitted in OPEN and IN_PROGRESS; forbidden in COMPLETED, VERIFIED, CANCELLED
      if (existing.status !== ActionStatus.OPEN && existing.status !== ActionStatus.IN_PROGRESS) {
        throw new BadRequestError(`Cannot reassign action in ${existing.status} status. Reassignment is only allowed during OPEN or IN_PROGRESS.`);
      }

      // Assignee XOR validation
      const assignees = [dto.assignedToId, dto.assignedVendorId].filter(Boolean);
      if (assignees.length !== 1) {
        throw new BadRequestError('Exactly one assignee (assignedToId XOR assignedVendorId) must be populated.');
      }

      if (dto.assignedToId) {
        const emp = await tx.employee.findFirst({
          where: { id: dto.assignedToId, tenantId: ctx.tenantId },
        });
        if (!emp) throw new BadRequestError('Invalid assignedToId: Employee not found in tenant');
      }
      if (dto.assignedVendorId) {
        const vendor = await tx.vendor.findFirst({
          where: { id: dto.assignedVendorId, tenantId: ctx.tenantId },
        });
        if (!vendor) throw new BadRequestError('Invalid assignedVendorId: Vendor not found in tenant');
      }

      const updated = await this.actionRepo.update(
        ctx.tenantId,
        id,
        {
          assignedToId: dto.assignedToId || null,
          assignedVendorId: dto.assignedVendorId || null,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'QUALITY_SAFETY_ACTION',
          entityId: id,
          action: 'REASSIGN',
          actorId: ctx.user.id,
          previousState: { assignedToId: existing.assignedToId, assignedVendorId: existing.assignedVendorId },
          newState: { assignedToId: dto.assignedToId, assignedVendorId: dto.assignedVendorId },
          reason: dto.reason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async start(ctx: QualityRequestContext, id: string): Promise<QualitySafetyAction> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.actionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('CAPA Action not found');

      if (existing.status !== ActionStatus.OPEN) {
        throw new BadRequestError(`Cannot start action in ${existing.status} status. Expected OPEN.`);
      }

      const updated = await this.actionRepo.update(
        ctx.tenantId,
        id,
        { status: ActionStatus.IN_PROGRESS },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'QUALITY_SAFETY_ACTION',
          entityId: id,
          action: 'START',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: ActionStatus.IN_PROGRESS },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async complete(ctx: QualityRequestContext, id: string, dto: CompleteActionDto): Promise<QualitySafetyAction> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.actionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('CAPA Action not found');

      if (existing.status !== ActionStatus.IN_PROGRESS && existing.status !== ActionStatus.OPEN) {
        throw new BadRequestError(`Cannot complete action in ${existing.status} status. Expected OPEN or IN_PROGRESS.`);
      }

      const updated = await this.actionRepo.update(
        ctx.tenantId,
        id,
        {
          status: ActionStatus.COMPLETED,
          completedById: ctx.user.id,
          completedAt: new Date(),
          completionNotes: dto.completionNotes,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'QUALITY_SAFETY_ACTION',
          entityId: id,
          action: 'COMPLETE',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: ActionStatus.COMPLETED, completedById: ctx.user.id },
          reason: dto.completionNotes,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async verify(ctx: QualityRequestContext, id: string, dto: VerifyActionDto): Promise<QualitySafetyAction> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.actionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('CAPA Action not found');

      if (existing.status !== ActionStatus.COMPLETED) {
        throw new BadRequestError(`Cannot verify action in ${existing.status} status. Expected COMPLETED.`);
      }

      // Segregation of Duties: Action completer cannot verify their own completion
      if (existing.completedById === ctx.user.id) {
        throw new ForbiddenError('Segregation of Duties violation: Action completer cannot verify their own action.');
      }

      const updated = await this.actionRepo.update(
        ctx.tenantId,
        id,
        {
          status: ActionStatus.VERIFIED,
          verifiedById: ctx.user.id,
          verifiedAt: new Date(),
          verificationRemarks: dto.verificationRemarks,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'QUALITY_SAFETY_ACTION',
          entityId: id,
          action: 'VERIFY',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: ActionStatus.VERIFIED, verifiedById: ctx.user.id },
          reason: dto.verificationRemarks,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async cancel(ctx: QualityRequestContext, id: string, dto: CancelActionDto): Promise<QualitySafetyAction> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.actionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('CAPA Action not found');

      if (existing.status === ActionStatus.VERIFIED || existing.status === ActionStatus.CANCELLED) {
        throw new BadRequestError(`Cannot cancel action in ${existing.status} status.`);
      }

      const updated = await this.actionRepo.update(
        ctx.tenantId,
        id,
        {
          status: ActionStatus.CANCELLED,
          verificationRemarks: dto.reason,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'QUALITY_SAFETY_ACTION',
          entityId: id,
          action: 'CANCEL',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: ActionStatus.CANCELLED },
          reason: dto.reason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async reopen(ctx: QualityRequestContext, id: string, dto: ReopenActionDto): Promise<QualitySafetyAction> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.actionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('CAPA Action not found');

      if (existing.status !== ActionStatus.VERIFIED && existing.status !== ActionStatus.COMPLETED) {
        throw new BadRequestError(`Cannot reopen action in ${existing.status} status. Expected VERIFIED or COMPLETED.`);
      }

      const updated = await this.actionRepo.update(
        ctx.tenantId,
        id,
        {
          status: ActionStatus.IN_PROGRESS,
          verificationRemarks: dto.reason,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'QUALITY_SAFETY_ACTION',
          entityId: id,
          action: 'REOPEN',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: ActionStatus.IN_PROGRESS },
          reason: dto.reason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }
}

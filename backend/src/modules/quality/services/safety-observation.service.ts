import type { PrismaClient, SafetyObservation } from '@prisma/client';
import { SafetyObservationRepository } from '../repositories/safety-observation.repository.js';
import { QualitySafetyAuditRepository } from '../repositories/quality-safety-audit.repository.js';
import { getNextQualitySafetySequence } from '../helpers/quality-sequence.helper.js';
import { calculateRisk } from '../helpers/risk-calculator.helper.js';
import {
  ObservationStatus,
  ActionStatus,
  type QualityRequestContext,
} from '../constants/quality.constants.js';
import type {
  CreateSafetyObservationDto,
  UpdateDraftSafetyObservationDto,
  CloseSafetyObservationDto,
  ReopenSafetyObservationDto,
  ListSafetyObservationsQueryDto,
} from '../dto/safety-observation.dto.js';
import { NotFoundError, BadRequestError } from '../../../common/errors/app-error.js';

export class SafetyObservationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly observationRepo: SafetyObservationRepository,
    private readonly auditRepo: QualitySafetyAuditRepository
  ) {}

  async create(ctx: QualityRequestContext, dto: CreateSafetyObservationDto): Promise<SafetyObservation> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify Project
      const project = await tx.project.findFirst({
        where: { id: dto.projectId, tenantId: ctx.tenantId },
      });
      if (!project) {
        throw new BadRequestError('Invalid projectId: project not found in current tenant');
      }

      // 2. Validate optional relations
      if (dto.equipmentId) {
        const eq = await tx.equipment.findFirst({
          where: { id: dto.equipmentId, tenantId: ctx.tenantId },
        });
        if (!eq) throw new BadRequestError('Invalid equipmentId: equipment not found in current tenant');
      }
      if (dto.tbtSupervisorId) {
        const sup = await tx.user.findFirst({
          where: { id: dto.tbtSupervisorId, tenantId: ctx.tenantId },
        });
        if (!sup) throw new BadRequestError('Invalid tbtSupervisorId: user not found in current tenant');
      }

      // 3. Compute Risk Matrix
      const risk = calculateRisk(dto.likelihood, dto.severityRating);

      // 4. Sequence Number
      const observationNumber = await getNextQualitySafetySequence(ctx.tenantId, 'OBS', tx);

      // 5. Create Observation
      const observation = await this.observationRepo.create(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          equipmentId: dto.equipmentId,
          observationNumber,
          observationType: dto.observationType,
          severity: dto.severity,
          location: dto.location,
          description: dto.description,
          reportedById: ctx.user.id,
          observedAt: dto.observedAt ? new Date(dto.observedAt) : new Date(),
          tbtTopic: dto.tbtTopic,
          tbtSupervisorId: dto.tbtSupervisorId,
          tbtAttendeeCount: dto.tbtAttendeeCount,
          tbtTrade: dto.tbtTrade,
          ppeCompliancePercent: dto.ppeCompliancePercent !== undefined && dto.ppeCompliancePercent !== null ? dto.ppeCompliancePercent : null,
          scaffoldingSafe: dto.scaffoldingSafe,
          electricalSafe: dto.electricalSafe,
          housekeepingRating: dto.housekeepingRating,
          likelihood: risk.likelihood,
          severityRating: risk.severityRating,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          controls: dto.controls,
          status: ObservationStatus.OPEN,
          immediateActionTaken: dto.immediateActionTaken,
        },
        tx
      );

      // 6. Audit Log
      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          entityType: 'SAFETY_OBSERVATION',
          entityId: observation.id,
          action: 'CREATE',
          actorId: ctx.user.id,
          newState: observation as any,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return (await this.observationRepo.findById(ctx.tenantId, observation.id, tx)) as SafetyObservation;
    });
  }

  async getById(ctx: QualityRequestContext, id: string): Promise<SafetyObservation> {
    const obs = await this.observationRepo.findById(ctx.tenantId, id);
    if (!obs) {
      throw new NotFoundError(`Safety Observation with ID '${id}' not found`);
    }
    return obs;
  }

  async list(
    ctx: QualityRequestContext,
    query: ListSafetyObservationsQueryDto
  ): Promise<{ items: SafetyObservation[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.observationRepo.list(
      ctx.tenantId,
      {
        projectId: query.projectId,
        status: query.status,
        observationType: query.observationType,
        riskLevel: query.riskLevel,
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

  async updateDraft(
    ctx: QualityRequestContext,
    id: string,
    dto: UpdateDraftSafetyObservationDto
  ): Promise<SafetyObservation> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.observationRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety observation not found');

      if (existing.status !== ObservationStatus.OPEN) {
        throw new BadRequestError(`Cannot edit safety observation in ${existing.status} status. Expected OPEN.`);
      }

      // Recompute risk if updated
      const likelihood = dto.likelihood ?? existing.likelihood;
      const severityRating = dto.severityRating ?? existing.severityRating;
      const risk = calculateRisk(likelihood, severityRating);

      const updated = await this.observationRepo.update(
        ctx.tenantId,
        id,
        {
          location: dto.location,
          description: dto.description,
          severity: dto.severity,
          tbtTopic: dto.tbtTopic,
          tbtSupervisorId: dto.tbtSupervisorId,
          tbtAttendeeCount: dto.tbtAttendeeCount,
          tbtTrade: dto.tbtTrade,
          ppeCompliancePercent: dto.ppeCompliancePercent !== undefined && dto.ppeCompliancePercent !== null ? dto.ppeCompliancePercent : undefined,
          scaffoldingSafe: dto.scaffoldingSafe,
          electricalSafe: dto.electricalSafe,
          housekeepingRating: dto.housekeepingRating,
          likelihood: risk.likelihood,
          severityRating: risk.severityRating,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          controls: dto.controls,
          immediateActionTaken: dto.immediateActionTaken,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_OBSERVATION',
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

  async assignAction(ctx: QualityRequestContext, id: string): Promise<SafetyObservation> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.observationRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety observation not found');

      if (existing.status !== ObservationStatus.OPEN) {
        throw new BadRequestError(`Cannot transition observation to ACTION_REQUIRED from ${existing.status} status.`);
      }

      const updated = await this.observationRepo.update(
        ctx.tenantId,
        id,
        { status: ObservationStatus.ACTION_REQUIRED },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_OBSERVATION',
          entityId: id,
          action: 'ASSIGN_ACTION',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: ObservationStatus.ACTION_REQUIRED },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async close(ctx: QualityRequestContext, id: string, dto: CloseSafetyObservationDto): Promise<SafetyObservation> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.observationRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety observation not found');

      if (existing.status === ObservationStatus.CLOSED) {
        throw new BadRequestError('Safety observation is already CLOSED');
      }

      // If linked CAPAs exist, verify they are all VERIFIED or CANCELLED
      const actions = await tx.qualitySafetyAction.findMany({
        where: { tenantId: ctx.tenantId, observationId: id },
      });

      const openActions = actions.filter(
        (a) => a.status !== ActionStatus.VERIFIED && a.status !== ActionStatus.CANCELLED
      );
      if (openActions.length > 0) {
        const actionNums = openActions.map((a) => a.actionNumber).join(', ');
        throw new BadRequestError(`Cannot close safety observation: linked CAPA actions (${actionNums}) must be formally VERIFIED first.`);
      }

      const updated = await this.observationRepo.update(
        ctx.tenantId,
        id,
        {
          status: ObservationStatus.CLOSED,
          closedById: ctx.user.id,
          closedAt: new Date(),
          immediateActionTaken: dto.remarks || existing.immediateActionTaken,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_OBSERVATION',
          entityId: id,
          action: 'CLOSE',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: ObservationStatus.CLOSED, closedById: ctx.user.id },
          reason: dto.remarks || undefined,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async reopen(ctx: QualityRequestContext, id: string, dto: ReopenSafetyObservationDto): Promise<SafetyObservation> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.observationRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety observation not found');

      if (existing.status !== ObservationStatus.CLOSED) {
        throw new BadRequestError(`Cannot reopen observation in ${existing.status} status. Expected CLOSED.`);
      }

      const updated = await this.observationRepo.update(
        ctx.tenantId,
        id,
        {
          status: ObservationStatus.OPEN,
          closedById: null,
          closedAt: null,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_OBSERVATION',
          entityId: id,
          action: 'REOPEN',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: ObservationStatus.OPEN },
          reason: dto.reason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }
}

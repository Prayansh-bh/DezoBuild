import type { PrismaClient, SafetyIncident } from '@prisma/client';
import { SafetyIncidentRepository } from '../repositories/safety-incident.repository.js';
import { QualitySafetyAuditRepository } from '../repositories/quality-safety-audit.repository.js';
import { getNextQualitySafetySequence } from '../helpers/quality-sequence.helper.js';
import { calculateRisk } from '../helpers/risk-calculator.helper.js';
import { sanitizeIncident, sanitizeIncidentList } from '../helpers/pii-firewall.helper.js';
import {
  IncidentStatus,
  ActionStatus,
  type QualityRequestContext,
} from '../constants/quality.constants.js';
import type {
  CreateSafetyIncidentDto,
  StartIncidentInvestigationDto,
  AddIncidentFindingsDto,
  CloseSafetyIncidentDto,
  ReopenSafetyIncidentDto,
  ListSafetyIncidentsQueryDto,
} from '../dto/safety-incident.dto.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../common/errors/app-error.js';

export class SafetyIncidentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly incidentRepo: SafetyIncidentRepository,
    private readonly auditRepo: QualitySafetyAuditRepository
  ) {}

  async create(ctx: QualityRequestContext, dto: CreateSafetyIncidentDto): Promise<SafetyIncident> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify Project
      const project = await tx.project.findFirst({
        where: { id: dto.projectId, tenantId: ctx.tenantId },
      });
      if (!project) {
        throw new BadRequestError('Invalid projectId: project not found in current tenant');
      }

      // 2. Validate optional injured employee
      if (dto.injuredEmployeeId) {
        const emp = await tx.employee.findFirst({
          where: { id: dto.injuredEmployeeId, tenantId: ctx.tenantId },
        });
        if (!emp) throw new BadRequestError('Invalid injuredEmployeeId: Employee not found in tenant');
      }

      // 3. Date check: occurredAt <= now
      const occurredAt = new Date(dto.occurredAt);
      const now = new Date();
      if (occurredAt > now) {
        throw new BadRequestError('occurredAt cannot be in the future');
      }

      // 4. Compute Risk Matrix
      const risk = calculateRisk(dto.likelihood, dto.severityRating);

      // 5. Sequence Number
      const incidentNumber = await getNextQualitySafetySequence(ctx.tenantId, 'INC', tx);

      // 6. Create Incident
      const incident = await this.incidentRepo.create(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          incidentNumber,
          incidentType: dto.incidentType,
          severity: dto.severity,
          occurredAt,
          reportedAt: now,
          location: dto.location,
          description: dto.description,
          reportedById: ctx.user.id,
          injuredEmployeeId: dto.injuredEmployeeId,
          injuredPersonName: dto.injuredPersonName,
          injuredPersonTrade: dto.injuredPersonTrade,
          lostWorkDays: dto.lostWorkDays || 0,
          likelihood: risk.likelihood,
          severityRating: risk.severityRating,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          status: IncidentStatus.REPORTED,
          immediateActionTaken: dto.immediateActionTaken,
        },
        tx
      );

      // 7. Audit Log
      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          entityType: 'SAFETY_INCIDENT',
          entityId: incident.id,
          action: 'CREATE',
          actorId: ctx.user.id,
          newState: incident as any,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      const record = (await this.incidentRepo.findById(ctx.tenantId, incident.id, tx)) as SafetyIncident;
      return sanitizeIncident(record, ctx.user.role);
    });
  }

  async getById(ctx: QualityRequestContext, id: string): Promise<SafetyIncident> {
    const inc = await this.incidentRepo.findById(ctx.tenantId, id);
    if (!inc) {
      throw new NotFoundError(`Safety Incident with ID '${id}' not found`);
    }
    return sanitizeIncident(inc, ctx.user.role);
  }

  async list(
    ctx: QualityRequestContext,
    query: ListSafetyIncidentsQueryDto
  ): Promise<{ items: SafetyIncident[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.incidentRepo.list(
      ctx.tenantId,
      {
        projectId: query.projectId,
        status: query.status,
        incidentType: query.incidentType,
        severity: query.severity,
        riskLevel: query.riskLevel,
      },
      { skip, take: limit }
    );

    const sanitizedItems = sanitizeIncidentList(items, ctx.user.role);

    return {
      items: sanitizedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async startInvestigation(
    ctx: QualityRequestContext,
    id: string,
    dto: StartIncidentInvestigationDto
  ): Promise<SafetyIncident> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.incidentRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety incident not found');

      if (existing.status !== IncidentStatus.REPORTED && existing.status !== IncidentStatus.UNDER_INVESTIGATION) {
        throw new BadRequestError(`Cannot start investigation in ${existing.status} status.`);
      }

      const updated = await this.incidentRepo.update(
        ctx.tenantId,
        id,
        {
          status: IncidentStatus.UNDER_INVESTIGATION,
          investigatedById: ctx.user.id,
          rootCause: dto.rootCause,
          investigationFindings: dto.investigationFindings,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_INCIDENT',
          entityId: id,
          action: 'START_INVESTIGATION',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: IncidentStatus.UNDER_INVESTIGATION, investigatedById: ctx.user.id },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return sanitizeIncident(updated, ctx.user.role);
    });
  }

  async addFindings(ctx: QualityRequestContext, id: string, dto: AddIncidentFindingsDto): Promise<SafetyIncident> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.incidentRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety incident not found');

      if (existing.status !== IncidentStatus.UNDER_INVESTIGATION && existing.status !== IncidentStatus.CAPA_IN_PROGRESS) {
        throw new BadRequestError(`Cannot add findings to incident in ${existing.status} status. Expected UNDER_INVESTIGATION or CAPA_IN_PROGRESS.`);
      }

      const updated = await this.incidentRepo.update(
        ctx.tenantId,
        id,
        {
          rootCause: dto.rootCause || existing.rootCause,
          investigationFindings: dto.investigationFindings || existing.investigationFindings,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_INCIDENT',
          entityId: id,
          action: 'ADD_FINDINGS',
          actorId: ctx.user.id,
          previousState: { rootCause: existing.rootCause },
          newState: { rootCause: updated.rootCause },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return sanitizeIncident(updated, ctx.user.role);
    });
  }

  async moveToCapa(ctx: QualityRequestContext, id: string): Promise<SafetyIncident> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.incidentRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety incident not found');

      if (existing.status !== IncidentStatus.UNDER_INVESTIGATION) {
        throw new BadRequestError(`Cannot transition incident to CAPA_IN_PROGRESS from ${existing.status} status. Expected UNDER_INVESTIGATION.`);
      }

      // Check linked CAPAs: at least 1 must exist
      const actions = await tx.qualitySafetyAction.findMany({
        where: { tenantId: ctx.tenantId, incidentId: id },
      });
      if (actions.length === 0) {
        throw new BadRequestError('Cannot move incident to CAPA_IN_PROGRESS without at least one linked QualitySafetyAction (CAPA).');
      }

      const updated = await this.incidentRepo.update(
        ctx.tenantId,
        id,
        { status: IncidentStatus.CAPA_IN_PROGRESS },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_INCIDENT',
          entityId: id,
          action: 'MOVE_TO_CAPA',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: IncidentStatus.CAPA_IN_PROGRESS },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return sanitizeIncident(updated, ctx.user.role);
    });
  }

  async close(ctx: QualityRequestContext, id: string, dto: CloseSafetyIncidentDto): Promise<SafetyIncident> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.incidentRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety incident not found');

      if (existing.status !== IncidentStatus.CAPA_IN_PROGRESS && existing.status !== IncidentStatus.UNDER_INVESTIGATION) {
        throw new BadRequestError(`Cannot close incident in ${existing.status} status.`);
      }

      // Segregation of Duties: Reporter cannot unilaterally close their own reported incident
      if (existing.reportedById === ctx.user.id) {
        throw new ForbiddenError('Segregation of Duties violation: Incident reporter cannot close their own reported incident.');
      }

      // All linked actions must be VERIFIED or CANCELLED
      const actions = await tx.qualitySafetyAction.findMany({
        where: { tenantId: ctx.tenantId, incidentId: id },
      });

      const openActions = actions.filter(
        (a) => a.status !== ActionStatus.VERIFIED && a.status !== ActionStatus.CANCELLED
      );
      if (openActions.length > 0) {
        const actionNums = openActions.map((a) => a.actionNumber).join(', ');
        throw new BadRequestError(`Cannot close safety incident: linked CAPA actions (${actionNums}) must be formally VERIFIED first.`);
      }

      const updated = await this.incidentRepo.update(
        ctx.tenantId,
        id,
        {
          status: IncidentStatus.CLOSED,
          closedById: ctx.user.id,
          closedAt: new Date(),
          investigationFindings: existing.investigationFindings
            ? `${existing.investigationFindings}\nClosure Remarks: ${dto.closureRemarks}`
            : dto.closureRemarks,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_INCIDENT',
          entityId: id,
          action: 'CLOSE',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: IncidentStatus.CLOSED, closedById: ctx.user.id },
          reason: dto.closureRemarks,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return sanitizeIncident(updated, ctx.user.role);
    });
  }

  async reopen(ctx: QualityRequestContext, id: string, dto: ReopenSafetyIncidentDto): Promise<SafetyIncident> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.incidentRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Safety incident not found');

      if (existing.status !== IncidentStatus.CLOSED) {
        throw new BadRequestError(`Cannot reopen incident in ${existing.status} status. Expected CLOSED.`);
      }

      const updated = await this.incidentRepo.update(
        ctx.tenantId,
        id,
        {
          status: IncidentStatus.UNDER_INVESTIGATION,
          closedById: null,
          closedAt: null,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'SAFETY_INCIDENT',
          entityId: id,
          action: 'REOPEN',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: IncidentStatus.UNDER_INVESTIGATION },
          reason: dto.reason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return sanitizeIncident(updated, ctx.user.role);
    });
  }
}

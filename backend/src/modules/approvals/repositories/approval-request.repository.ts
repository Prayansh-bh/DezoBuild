import { PrismaClient, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../database/prisma.client';
import type { SubmitApprovalRequestDto, ListApprovalRequestsQueryDto, ListPendingApprovalsQueryDto } from '../dto/approval-request.dto';
import type { PrismaTransactionClient } from '../registry/domain-adapter.interface';
import type { ApprovalDecisionTypeEnum, ApprovalRequestStatusType, ApprovalStepStatusType } from '../constants/approval.constants';

export class ApprovalRequestRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async createRequest(
    tenantId: string,
    requestNumber: string,
    submittedById: string,
    dto: SubmitApprovalRequestDto,
    policySnapshot: Record<string, any>,
    steps: Array<{
      stepOrder: number;
      stepName: string;
      requiredRoleHint?: string | null;
      requiredPermission: string;
      dueAt?: Date | null;
    }>,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.approvalRequest.create({
      data: {
        tenantId,
        projectId: dto.projectId ?? null,
        requestNumber,
        entityType: dto.entityType,
        entityId: dto.entityId,
        title: dto.title || `${dto.entityType} ${dto.entityId} Approval`,
        monetaryAmount: dto.monetaryAmount != null ? new Prisma.Decimal(dto.monetaryAmount) : null,
        currency: dto.currency || 'INR',
        status: 'SUBMITTED',
        currentStepOrder: 1,
        totalSteps: steps.length,
        submittedById,
        policySnapshot: policySnapshot as Prisma.InputJsonValue,
        submissionRemarks: dto.submissionRemarks ?? null,
        previousRequestId: dto.previousRequestId ?? null,
        steps: {
          create: steps.map((s, index) => ({
            stepOrder: s.stepOrder,
            stepName: s.stepName,
            requiredRoleHint: s.requiredRoleHint ?? null,
            requiredPermission: s.requiredPermission,
            status: index === 0 ? 'PENDING' : 'PENDING',
            dueAt: s.dueAt ?? null,
          })),
        },
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findRequestById(tenantId: string, id: string, tx?: PrismaTransactionClient) {
    const client = tx ?? this.prisma;
    return client.approvalRequest.findFirst({
      where: { id, tenantId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        decisions: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, fullName: true, email: true } } },
        },
        submittedBy: { select: { id: true, fullName: true, email: true } },
        previousRequest: { select: { id: true, requestNumber: true, status: true } },
      },
    });
  }

  async findActiveRequestForEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.approvalRequest.findFirst({
      where: {
        tenantId,
        entityType: entityType as any,
        entityId,
        status: { in: ['SUBMITTED', 'IN_REVIEW'] },
      },
    });
  }

  /**
   * Acquires row-level exclusive lock on ApprovalRequest and its steps inside transaction.
   */
  async lockRequestForUpdate(tenantId: string, requestId: string, tx: PrismaTransactionClient) {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string; current_step_order: number; submitted_by_id: string }>>`
      SELECT id, status, current_step_order, submitted_by_id
      FROM approval_requests
      WHERE id = ${requestId}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  /**
   * Acquires row-level exclusive lock on a specific step.
   */
  async lockStepForUpdate(requestId: string, stepOrder: number, tx: PrismaTransactionClient) {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string; required_permission: string; required_role_hint: string | null }>>`
      SELECT id, status, required_permission, required_role_hint
      FROM approval_steps
      WHERE request_id = ${requestId}::uuid AND step_order = ${stepOrder}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  async recordDecision(
    tenantId: string,
    requestId: string,
    stepId: string | null,
    stepOrder: number,
    actorId: string,
    decision: ApprovalDecisionTypeEnum,
    decisionReason: string | null,
    policyContext: Record<string, any> | null,
    previousState: string,
    resultingState: string,
    ipAddress: string | null,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.approvalDecision.create({
      data: {
        requestId,
        stepId: stepId ?? null,
        stepOrder,
        actorId,
        decision: decision as any,
        decisionReason: decisionReason ?? null,
        policyContext: policyContext ? (policyContext as Prisma.InputJsonValue) : Prisma.JsonNull,
        previousState,
        resultingState,
        ipAddress: ipAddress ?? null,
      },
    });
  }

  /**
   * Idempotency query: checks if exact identical decision was already recorded for this step & actor.
   */
  async findExistingStepDecision(
    requestId: string,
    stepId: string,
    actorId: string,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.approvalDecision.findFirst({
      where: {
        requestId,
        stepId,
        actorId,
      },
    });
  }

  async updateStepStatus(
    stepId: string,
    status: ApprovalStepStatusType,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.approvalStep.update({
      where: { id: stepId },
      data: {
        status: status as any,
        completedAt: status === 'APPROVED' || status === 'REJECTED' || status === 'SKIPPED' ? new Date() : undefined,
      },
    });
  }

  async updateRequestStatus(
    requestId: string,
    status: ApprovalRequestStatusType,
    currentStepOrder?: number,
    completed = false,
    tx?: PrismaTransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: status as any,
        ...(currentStepOrder != null ? { currentStepOrder } : {}),
        ...(completed ? { completedAt: new Date() } : {}),
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async listRequests(
    tenantId: string,
    query: ListApprovalRequestsQueryDto,
    userProjectIds: string[] | null
  ) {
    const where: Prisma.ApprovalRequestWhereInput = {
      tenantId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.submittedById ? { submittedById: query.submittedById } : {}),
      ...(userProjectIds !== null
        ? {
            OR: [
              { projectId: null },
              { projectId: { in: userProjectIds } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const [total, items] = await Promise.all([
      this.prisma.approvalRequest.count({ where }),
      this.prisma.approvalRequest.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          steps: { orderBy: { stepOrder: 'asc' } },
          submittedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async listPendingApprovals(
    tenantId: string,
    userId: string,
    userPermissions: string[],
    userProjectIds: string[] | null,
    query: ListPendingApprovalsQueryDto
  ) {
    // Find all active requests where the current step's requiredPermission is in userPermissions
    // and where submittedById != userId (Maker-Checker filter)
    const where: Prisma.ApprovalRequestWhereInput = {
      tenantId,
      status: { in: ['SUBMITTED', 'IN_REVIEW'] },
      submittedById: { not: userId },
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(userProjectIds !== null
        ? {
            OR: [
              { projectId: null },
              { projectId: { in: userProjectIds } },
            ],
          }
        : {}),
    };

    const allActive = await this.prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        submittedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Filter to items where current active step permission is held by caller
    const actionable = allActive.filter((req) => {
      const activeStep = req.steps.find((s) => s.stepOrder === req.currentStepOrder);
      if (!activeStep) return false;
      return userPermissions.includes(activeStep.requiredPermission);
    });

    const skip = (query.page - 1) * query.limit;
    const paginatedItems = actionable.slice(skip, skip + query.limit);

    return {
      items: paginatedItems,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: actionable.length,
        totalPages: Math.ceil(actionable.length / query.limit),
      },
    };
  }
}

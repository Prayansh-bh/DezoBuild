import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../database/prisma.client';
import { ApprovalRequestRepository } from '../repositories/approval-request.repository';
import { ApprovalPolicyRepository } from '../repositories/approval-policy.repository';
import { ApprovalSubjectRegistry } from '../registry/approval-subject.registry';
import { getNextApprovalSequence } from '../helpers/approval-sequence.helper';
import type {
  SubmitApprovalRequestDto,
  ApproveStepDto,
  RejectRequestDto,
  ReturnRequestDto,
  CancelRequestDto,
  ListApprovalRequestsQueryDto,
  ListPendingApprovalsQueryDto,
} from '../dto/approval-request.dto';
import type { ApprovalRequestContext } from '../helpers/approval-context.helper';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../../common/errors/app-error';

export class ApprovalService {
  constructor(
    private readonly requestRepo: ApprovalRequestRepository = new ApprovalRequestRepository(),
    private readonly policyRepo: ApprovalPolicyRepository = new ApprovalPolicyRepository(),
    private readonly prisma: PrismaClient = defaultPrisma
  ) {}

  /**
   * Submits an entity for controlled multi-step approval workflow.
   */
  async submitForApproval(ctx: ApprovalRequestContext, dto: SubmitApprovalRequestDto) {
    const meta = ApprovalSubjectRegistry.getSubject(dto.entityType);

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock and validate domain subject
      const subjectData = await meta.validateAndLockSubject(ctx, dto.entityId, tx);
      const projectId = dto.projectId ?? subjectData.projectId ?? null;
      const monetaryAmount = dto.monetaryAmount != null ? dto.monetaryAmount : subjectData.monetaryAmount;

      // 2. Validate no conflicting active approval request
      const existingActive = await this.requestRepo.findActiveRequestForEntity(ctx.tenantId, dto.entityType, dto.entityId, tx);
      if (existingActive) {
        throw new ConflictError(
          `An active approval request '${existingActive.requestNumber}' (status: ${existingActive.status}) already exists for this entity.`
        );
      }

      // 3. Resolve active approval policy
      const matchedPolicy = await this.policyRepo.resolveActivePolicy(
        ctx.tenantId,
        projectId,
        dto.entityType,
        monetaryAmount,
        tx
      );

      let stepsToCreate: Array<{
        stepOrder: number;
        stepName: string;
        requiredRoleHint?: string | null;
        requiredPermission: string;
        enforceMakerChecker: boolean;
        enforceDistinctFromPrev: boolean;
      }>;

      let policySnapshot: Record<string, any>;

      if (matchedPolicy && matchedPolicy.steps.length > 0) {
        policySnapshot = {
          policyId: matchedPolicy.id,
          policyName: matchedPolicy.name,
          version: matchedPolicy.version,
          entityType: matchedPolicy.entityType,
          minAmount: matchedPolicy.minAmount ? Number(matchedPolicy.minAmount) : null,
          maxAmount: matchedPolicy.maxAmount ? Number(matchedPolicy.maxAmount) : null,
          steps: matchedPolicy.steps.map((s) => ({
            stepOrder: s.stepOrder,
            stepName: s.stepName,
            requiredRoleHint: s.requiredRoleHint,
            requiredPermission: s.requiredPermission,
            enforceMakerChecker: s.enforceMakerChecker,
            enforceDistinctFromPrev: s.enforceDistinctFromPrev,
            timeoutHours: s.timeoutHours,
          })),
        };
        stepsToCreate = matchedPolicy.steps.map((s) => ({
          stepOrder: s.stepOrder,
          stepName: s.stepName,
          requiredRoleHint: s.requiredRoleHint,
          requiredPermission: s.requiredPermission,
          enforceMakerChecker: s.enforceMakerChecker,
          enforceDistinctFromPrev: s.enforceDistinctFromPrev,
        }));
      } else {
        // Fallback default single-step policy using domain canonical permission
        policySnapshot = {
          policyId: 'SYSTEM_DEFAULT',
          policyName: 'Default Single-Step Domain Approval',
          version: 1,
          entityType: dto.entityType,
          steps: [
            {
              stepOrder: 1,
              stepName: 'Authoritative Domain Review',
              requiredPermission: meta.defaultApprovalPermission,
              enforceMakerChecker: true,
              enforceDistinctFromPrev: false,
            },
          ],
        };
        stepsToCreate = [
          {
            stepOrder: 1,
            stepName: 'Authoritative Domain Review',
            requiredPermission: meta.defaultApprovalPermission,
            enforceMakerChecker: true,
            enforceDistinctFromPrev: false,
          },
        ];
      }

      // 4. Generate monotonic sequence number
      const scopeCode = projectId ? 'PROJ' : 'TENANT';
      const requestNumber = await getNextApprovalSequence(ctx.tenantId, projectId, scopeCode, tx);

      // 5. Create ApprovalRequest & Steps
      const request = await this.requestRepo.createRequest(
        ctx.tenantId,
        requestNumber,
        ctx.user.id,
        {
          ...dto,
          projectId,
          title: dto.title || subjectData.title,
          monetaryAmount,
        },
        policySnapshot,
        stepsToCreate,
        tx
      );

      return request;
    });
  }

  /**
   * Approves the current active step in the approval sequence.
   */
  async approveStep(ctx: ApprovalRequestContext, requestId: string, dto?: ApproveStepDto, ipAddress?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock ApprovalRequest row
      const lockedReq = await this.requestRepo.lockRequestForUpdate(ctx.tenantId, requestId, tx);
      if (!lockedReq) throw new NotFoundError(`Approval request '${requestId}' not found in current tenant`);

      if (lockedReq.status !== 'SUBMITTED' && lockedReq.status !== 'IN_REVIEW') {
        throw new ConflictError(`Cannot approve request in terminal '${lockedReq.status}' status`);
      }

      const targetStepOrder = dto?.stepOrder ?? lockedReq.current_step_order;

      // 2. Lock target Step row
      const lockedStep = await this.requestRepo.lockStepForUpdate(requestId, targetStepOrder, tx);
      if (!lockedStep) throw new NotFoundError(`Step order ${targetStepOrder} not found for request`);

      // 3. Check for idempotent decision retry on this specific step
      const existingStepDecision = await this.requestRepo.findExistingStepDecision(
        requestId,
        lockedStep.id,
        ctx.user.id,
        tx
      );
      if (existingStepDecision) {
        if (existingStepDecision.decision === 'APPROVE') {
          return this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
        }
        throw new ConflictError(`Conflict: You have already recorded a '${existingStepDecision.decision}' decision for step ${targetStepOrder}`);
      }

      if (lockedStep.status === 'APPROVED') {
        throw new ConflictError(`Conflict: Step ${targetStepOrder} has already been approved`);
      }

      if (targetStepOrder > lockedReq.current_step_order) {
        throw new ConflictError(`Conflict: Step ${targetStepOrder} cannot be approved before Step ${lockedReq.current_step_order}`);
      }

      // 4. RBAC Check: Caller must have required permission
      const hasPermission = ctx.user.permissions.includes(lockedStep.required_permission);
      if (!hasPermission) {
        throw new ForbiddenError(
          `Permission '${lockedStep.required_permission}' is required to approve step ${targetStepOrder}`
        );
      }

      // 5. Universal Maker-Checker SoD Check
      if (ctx.user.id === lockedReq.submitted_by_id) {
        throw new ForbiddenError('Segregation of Duties violation: The submitter of an approval request cannot approve it');
      }

      // 6. Fetch full request for policySnapshot distinctness check
      const fullRequest = await this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
      if (!fullRequest) throw new NotFoundError(`Approval request '${requestId}' not found`);

      const policySnapshot = fullRequest.policySnapshot as any;
      const stepPolicy = policySnapshot?.steps?.find((s: any) => s.stepOrder === targetStepOrder);

      // Check distinctness from previous step approver
      if (stepPolicy?.enforceDistinctFromPrev && targetStepOrder > 1) {
        const prevDecision = fullRequest.decisions.find(
          (d) => d.stepOrder === targetStepOrder - 1 && d.decision === 'APPROVE'
        );
        if (prevDecision && prevDecision.actorId === ctx.user.id) {
          throw new ForbiddenError(
            `Segregation of Duties violation: Approver of Step ${targetStepOrder} must be distinct from Step ${targetStepOrder - 1} approver`
          );
        }
      }

      // 7. Update step status to APPROVED
      await this.requestRepo.updateStepStatus(lockedStep.id, 'APPROVED', tx);

      // 8. Record ApprovalDecision
      await this.requestRepo.recordDecision(
        ctx.tenantId,
        requestId,
        lockedStep.id,
        targetStepOrder,
        ctx.user.id,
        'APPROVE',
        dto?.decisionReason ?? null,
        { stepOrder: targetStepOrder, stepName: lockedStep.id },
        lockedReq.status,
        targetStepOrder < fullRequest.totalSteps ? 'IN_REVIEW' : 'APPROVED',
        ipAddress ?? null,
        tx
      );

      // 9. Advance workflow or finalize
      if (targetStepOrder < fullRequest.totalSteps) {
        const nextStepOrder = targetStepOrder + 1;
        await this.requestRepo.updateRequestStatus(requestId, 'IN_REVIEW', nextStepOrder, false, tx);
      } else {
        // Final step approved -> Mark request APPROVED and invoke domain adapter
        await this.requestRepo.updateRequestStatus(requestId, 'APPROVED', targetStepOrder, true, tx);

        const meta = ApprovalSubjectRegistry.getSubject(fullRequest.entityType);
        await meta.adapter.onApproved(ctx, fullRequest.entityId, tx);
      }

      return this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
    });
  }

  /**
   * Rejects an approval request with mandatory reason.
   */
  async rejectRequest(ctx: ApprovalRequestContext, requestId: string, dto: RejectRequestDto, ipAddress?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lockedReq = await this.requestRepo.lockRequestForUpdate(ctx.tenantId, requestId, tx);
      if (!lockedReq) throw new NotFoundError(`Approval request '${requestId}' not found in current tenant`);

      if (lockedReq.status !== 'SUBMITTED' && lockedReq.status !== 'IN_REVIEW') {
        throw new ConflictError(`Cannot reject request in terminal '${lockedReq.status}' status`);
      }

      const targetStepOrder = dto?.stepOrder ?? lockedReq.current_step_order;
      const lockedStep = await this.requestRepo.lockStepForUpdate(requestId, targetStepOrder, tx);
      if (!lockedStep) throw new NotFoundError(`Step order ${targetStepOrder} not found for request`);

      // Check for idempotent decision retry on this specific step
      const existingStepDecision = await this.requestRepo.findExistingStepDecision(
        requestId,
        lockedStep.id,
        ctx.user.id,
        tx
      );
      if (existingStepDecision) {
        if (existingStepDecision.decision === 'REJECT') {
          return this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
        }
        throw new ConflictError(`Conflict: You have already recorded a '${existingStepDecision.decision}' decision for step ${targetStepOrder}`);
      }

      // RBAC check
      const hasPermission = ctx.user.permissions.includes(lockedStep.required_permission);
      if (!hasPermission) {
        throw new ForbiddenError(`Permission '${lockedStep.required_permission}' required to reject request`);
      }

      // Maker-Checker SoD check
      if (ctx.user.id === lockedReq.submitted_by_id) {
        throw new ForbiddenError('Segregation of Duties violation: Submitter cannot reject their own approval request');
      }

      // Update step and request status to REJECTED
      await this.requestRepo.updateStepStatus(lockedStep.id, 'REJECTED', tx);
      await this.requestRepo.updateRequestStatus(requestId, 'REJECTED', targetStepOrder, true, tx);

      // Record Decision
      await this.requestRepo.recordDecision(
        ctx.tenantId,
        requestId,
        lockedStep.id,
        targetStepOrder,
        ctx.user.id,
        'REJECT',
        dto.decisionReason,
        null,
        lockedReq.status,
        'REJECTED',
        ipAddress ?? null,
        tx
      );

      // Invoke domain adapter
      const fullRequest = await this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
      if (fullRequest) {
        const meta = ApprovalSubjectRegistry.getSubject(fullRequest.entityType);
        await meta.adapter.onRejected(ctx, fullRequest.entityId, dto.decisionReason, tx);
      }

      return this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
    });
  }

  /**
   * Returns an approval request for correction with mandatory reason.
   */
  async returnRequest(ctx: ApprovalRequestContext, requestId: string, dto: ReturnRequestDto, ipAddress?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lockedReq = await this.requestRepo.lockRequestForUpdate(ctx.tenantId, requestId, tx);
      if (!lockedReq) throw new NotFoundError(`Approval request '${requestId}' not found in current tenant`);

      if (lockedReq.status !== 'SUBMITTED' && lockedReq.status !== 'IN_REVIEW') {
        throw new ConflictError(`Cannot return request in terminal '${lockedReq.status}' status`);
      }

      const targetStepOrder = dto?.stepOrder ?? lockedReq.current_step_order;
      const lockedStep = await this.requestRepo.lockStepForUpdate(requestId, targetStepOrder, tx);
      if (!lockedStep) throw new NotFoundError(`Step order ${targetStepOrder} not found for request`);

      // Check for idempotent decision retry on this specific step
      const existingStepDecision = await this.requestRepo.findExistingStepDecision(
        requestId,
        lockedStep.id,
        ctx.user.id,
        tx
      );
      if (existingStepDecision) {
        if (existingStepDecision.decision === 'RETURN') {
          return this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
        }
        throw new ConflictError(`Conflict: You have already recorded a '${existingStepDecision.decision}' decision for step ${targetStepOrder}`);
      }

      // RBAC check
      const hasPermission = ctx.user.permissions.includes(lockedStep.required_permission);
      if (!hasPermission) {
        throw new ForbiddenError(`Permission '${lockedStep.required_permission}' required to return request`);
      }

      // Maker-Checker SoD check
      if (ctx.user.id === lockedReq.submitted_by_id) {
        throw new ForbiddenError('Segregation of Duties violation: Submitter cannot return their own request');
      }

      // Update step and request status to RETURNED
      await this.requestRepo.updateStepStatus(lockedStep.id, 'RETURNED', tx);
      await this.requestRepo.updateRequestStatus(requestId, 'RETURNED', targetStepOrder, true, tx);

      // Record Decision
      await this.requestRepo.recordDecision(
        ctx.tenantId,
        requestId,
        lockedStep.id,
        targetStepOrder,
        ctx.user.id,
        'RETURN',
        dto.decisionReason,
        null,
        lockedReq.status,
        'RETURNED',
        ipAddress ?? null,
        tx
      );

      // Invoke domain adapter
      const fullRequest = await this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
      if (fullRequest) {
        const meta = ApprovalSubjectRegistry.getSubject(fullRequest.entityType);
        await meta.adapter.onReturned(ctx, fullRequest.entityId, dto.decisionReason, tx);
      }

      return this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
    });
  }

  /**
   * Cancels an active approval request before final completion.
   */
  async cancelRequest(ctx: ApprovalRequestContext, requestId: string, dto?: CancelRequestDto, ipAddress?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lockedReq = await this.requestRepo.lockRequestForUpdate(ctx.tenantId, requestId, tx);
      if (!lockedReq) throw new NotFoundError(`Approval request '${requestId}' not found in current tenant`);

      if (lockedReq.status !== 'SUBMITTED' && lockedReq.status !== 'IN_REVIEW') {
        throw new ConflictError(`Cannot cancel request in terminal '${lockedReq.status}' status`);
      }

      // Only original submitter or Company Admin / Owner can cancel
      const isSubmitter = ctx.user.id === lockedReq.submitted_by_id;
      const isAdminOrOwner = ctx.user.roles.includes('COMPANY_ADMIN') || ctx.user.roles.includes('COMPANY_OWNER');

      if (!isSubmitter && !isAdminOrOwner) {
        throw new ForbiddenError('Only the original submitter or a Company Admin/Owner can cancel an approval request');
      }

      const currentStepOrder = lockedReq.current_step_order;
      const lockedStep = await this.requestRepo.lockStepForUpdate(requestId, currentStepOrder, tx);

      if (lockedStep) {
        await this.requestRepo.updateStepStatus(lockedStep.id, 'SKIPPED', tx);
      }

      await this.requestRepo.updateRequestStatus(requestId, 'CANCELLED', currentStepOrder, true, tx);

      // Record Decision
      await this.requestRepo.recordDecision(
        ctx.tenantId,
        requestId,
        lockedStep ? lockedStep.id : null,
        currentStepOrder,
        ctx.user.id,
        'CANCEL',
        dto?.decisionReason ?? 'Cancelled by user',
        null,
        lockedReq.status,
        'CANCELLED',
        ipAddress ?? null,
        tx
      );

      // Invoke domain adapter
      const fullRequest = await this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
      if (fullRequest) {
        const meta = ApprovalSubjectRegistry.getSubject(fullRequest.entityType);
        await meta.adapter.onCancelled(ctx, fullRequest.entityId, dto?.decisionReason, tx);
      }

      return this.requestRepo.findRequestById(ctx.tenantId, requestId, tx);
    });
  }

  async getRequestById(ctx: ApprovalRequestContext, requestId: string) {
    const req = await this.requestRepo.findRequestById(ctx.tenantId, requestId);
    if (!req) throw new NotFoundError(`Approval request '${requestId}' not found`);
    return req;
  }

  async listRequests(ctx: ApprovalRequestContext, query: ListApprovalRequestsQueryDto) {
    // Project scoping: if user is not tenant-wide role, filter to their assigned projects
    const isTenantWide = ctx.user.roles.some((r: string) =>
      ['COMPANY_OWNER', 'COMPANY_ADMIN', 'ACCOUNTANT', 'HR', 'VIEWER'].includes(r)
    );
    const userProjectIds = isTenantWide ? null : ctx.user.projectIds || [];

    return this.requestRepo.listRequests(ctx.tenantId, query, userProjectIds);
  }

  async listPendingApprovals(ctx: ApprovalRequestContext, query: ListPendingApprovalsQueryDto) {
    const isTenantWide = ctx.user.roles.some((r: string) =>
      ['COMPANY_OWNER', 'COMPANY_ADMIN', 'ACCOUNTANT', 'HR', 'VIEWER'].includes(r)
    );
    const userProjectIds = isTenantWide ? null : ctx.user.projectIds || [];

    return this.requestRepo.listPendingApprovals(
      ctx.tenantId,
      ctx.user.id,
      ctx.user.permissions,
      userProjectIds,
      query
    );
  }
}

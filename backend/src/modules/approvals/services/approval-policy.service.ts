import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../database/prisma.client';
import { ApprovalPolicyRepository } from '../repositories/approval-policy.repository';
import type { CreateApprovalPolicyDto, ListApprovalPoliciesQueryDto } from '../dto/approval-policy.dto';
import type { ApprovalRequestContext } from '../helpers/approval-context.helper';
import { BadRequestError, NotFoundError, ConflictError } from '../../../common/errors/app-error';

export class ApprovalPolicyService {
  constructor(
    private readonly policyRepo: ApprovalPolicyRepository = new ApprovalPolicyRepository(),
    private readonly prisma: PrismaClient = defaultPrisma
  ) {}

  async createDraft(ctx: ApprovalRequestContext, dto: CreateApprovalPolicyDto) {
    return this.policyRepo.createDraft(ctx.tenantId, ctx.user.id, dto);
  }

  async activatePolicy(ctx: ApprovalRequestContext, policyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const policy = await this.policyRepo.findPolicyById(ctx.tenantId, policyId, tx);
      if (!policy) throw new NotFoundError(`Approval policy '${policyId}' not found`);
      if (policy.status === 'ACTIVE') throw new BadRequestError('Policy is already ACTIVE');
      if (policy.status === 'SUPERSEDED') throw new BadRequestError('Cannot activate a SUPERSEDED policy version');

      // Transaction-level advisory lock on (tenant:project:entityType:policy)
      const lockKey = `${ctx.tenantId}:${policy.projectId || 'TENANT'}:${policy.entityType}:POLICY_ACTIVATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // Check for overlapping active policy brackets
      const overlaps = await this.policyRepo.findOverlappingActivePolicies(
        ctx.tenantId,
        policy.projectId,
        policy.entityType,
        policy.minAmount,
        policy.maxAmount,
        policy.id,
        tx
      );

      if (overlaps.length > 0) {
        throw new ConflictError(
          `Cannot activate policy: Overlaps with existing active policy '${overlaps[0].name}' (v${overlaps[0].version})`
        );
      }

      return this.policyRepo.updateStatus(ctx.tenantId, policyId, 'ACTIVE', tx);
    });
  }

  async supersedePolicy(ctx: ApprovalRequestContext, oldActivePolicyId: string, newDraftPolicyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldPolicy = await this.policyRepo.findPolicyById(ctx.tenantId, oldActivePolicyId, tx);
      if (!oldPolicy) throw new NotFoundError(`Active policy '${oldActivePolicyId}' not found`);
      if (oldPolicy.status !== 'ACTIVE') {
        throw new BadRequestError(`Cannot supersede policy in '${oldPolicy.status}' status. Expected ACTIVE.`);
      }

      const newPolicy = await this.policyRepo.findPolicyById(ctx.tenantId, newDraftPolicyId, tx);
      if (!newPolicy) throw new NotFoundError(`Draft policy '${newDraftPolicyId}' not found`);
      if (newPolicy.status !== 'DRAFT') {
        throw new BadRequestError(`New policy must be in DRAFT status before supersession. Found '${newPolicy.status}'.`);
      }

      if (oldPolicy.entityType !== newPolicy.entityType || oldPolicy.projectId !== newPolicy.projectId) {
        throw new BadRequestError('New policy must have the same entityType and projectId to supersede old policy');
      }

      // Advisory lock
      const lockKey = `${ctx.tenantId}:${oldPolicy.projectId || 'TENANT'}:${oldPolicy.entityType}:POLICY_ACTIVATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // Update old policy to SUPERSEDED
      await this.policyRepo.updateStatus(ctx.tenantId, oldActivePolicyId, 'SUPERSEDED', tx);

      // Link previous policy and bump version
      await tx.approvalPolicy.update({
        where: { id: newDraftPolicyId },
        data: {
          previousPolicyId: oldActivePolicyId,
          version: oldPolicy.version + 1,
        },
      });

      // Activate new policy
      return this.policyRepo.updateStatus(ctx.tenantId, newDraftPolicyId, 'ACTIVE', tx);
    });
  }

  async deactivatePolicy(ctx: ApprovalRequestContext, policyId: string) {
    const policy = await this.policyRepo.findPolicyById(ctx.tenantId, policyId);
    if (!policy) throw new NotFoundError(`Approval policy '${policyId}' not found`);
    if (policy.status !== 'ACTIVE') {
      throw new BadRequestError(`Cannot deactivate policy in '${policy.status}' status. Only ACTIVE policies can be deactivated.`);
    }

    return this.policyRepo.updateStatus(ctx.tenantId, policyId, 'INACTIVE');
  }

  async getPolicyById(ctx: ApprovalRequestContext, policyId: string) {
    const policy = await this.policyRepo.findPolicyById(ctx.tenantId, policyId);
    if (!policy) throw new NotFoundError(`Approval policy '${policyId}' not found`);
    return policy;
  }

  async listPolicies(ctx: ApprovalRequestContext, query: ListApprovalPoliciesQueryDto) {
    return this.policyRepo.listPolicies(ctx.tenantId, query);
  }
}

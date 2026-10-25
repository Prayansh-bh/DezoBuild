import type { PrismaClient } from '@prisma/client';
import type { ApprovalRequestContext } from '../helpers/approval-context.helper.js';

export type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface DomainCompletionAdapter {
  /**
   * Invoked when an approval request successfully passes its final step.
   * Domain service updates its own entity state to terminal APPROVED / PASSED / ORDERED
   * and executes domain side effects (e.g. WBS progress commit, payable generation).
   */
  onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void>;

  /**
   * Invoked when an approval request is rejected by a reviewer.
   */
  onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void>;

  /**
   * Invoked when an approval request is returned for correction.
   */
  onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void>;

  /**
   * Invoked when an approval request is cancelled by submitter or admin.
   */
  onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void>;
}

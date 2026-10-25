import { ConflictError } from '../../../common/errors/app-error.js';
import type { SupportedApprovalEntityType } from '../constants/approval.constants.js';

export class ActiveApprovalGuard {
  /**
   * Asserts that no central approval request is currently active (SUBMITTED or IN_REVIEW)
   * for the given entity. If an active request exists, direct legacy approval is blocked.
   *
   * @param prisma - PrismaClient or PrismaTransactionClient
   * @param tenantId - Tenant ID from authenticated RequestContext
   * @param entityType - One of the 15 supported approval entity types
   * @param entityId - UUID of the subject entity
   */
  static async assertNoActiveCentralApproval(
    prisma: any,
    tenantId: string,
    entityType: SupportedApprovalEntityType,
    entityId: string
  ): Promise<void> {
    if (!prisma || !tenantId || !entityType || !entityId) {
      return;
    }

    const activeRequest = await prisma.approvalRequest.findFirst({
      where: {
        tenantId,
        entityType,
        entityId,
        status: { in: ['SUBMITTED', 'IN_REVIEW'] },
      },
      select: {
        id: true,
        requestNumber: true,
        status: true,
        currentStepOrder: true,
      },
    });

    if (activeRequest) {
      throw new ConflictError(
        `Dual Approval Authority Blocked: Entity '${entityId}' (${entityType}) has an active central approval workflow ` +
        `'${activeRequest.requestNumber}' in '${activeRequest.status}' status (Step ${activeRequest.currentStepOrder}). ` +
        `Direct legacy approval is prohibited while central governance workflow is active. Use Central Approval Engine.`
      );
    }
  }
}

import type { DomainCompletionAdapter, PrismaTransactionClient } from './domain-adapter.interface.js';
import type { ApprovalRequestContext } from '../helpers/approval-context.helper.js';
import { NotFoundError } from '../../../common/errors/app-error.js';

export class PurchaseOrderApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: entityId, tenantId: ctx.tenantId },
    });
    if (!po) throw new NotFoundError('PurchaseOrder not found for approval transition');
    await tx.purchaseOrder.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.purchaseOrder.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.purchaseOrder.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
        rejectionReason: `Returned for correction: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.purchaseOrder.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason ?? 'Cancelled by user',
      },
    });
  }
}

export class RaBillApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    const bill = await tx.raBill.findUnique({
      where: { id: entityId, tenantId: ctx.tenantId },
    });
    if (!bill) throw new NotFoundError('RaBill not found for approval transition');
    await tx.raBill.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.raBill.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        notes: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.raBill.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
        notes: `Returned for correction: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.raBill.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
        notes: reason ?? 'Cancelled by user',
      },
    });
  }
}

export class VendorInvoiceApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.vendorInvoice.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.vendorInvoice.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        notes: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.vendorInvoice.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
        notes: `Returned: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.vendorInvoice.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
        notes: reason ?? 'Cancelled',
      },
    });
  }
}

export class ExpenseClaimApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.expenseClaim.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.expenseClaim.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.expenseClaim.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
        rejectionReason: `Returned: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.expenseClaim.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}

export class PaymentVoucherApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.paymentVoucher.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.paymentVoucher.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        notes: `Rejected in approval workflow: ${reason}`,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.paymentVoucher.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.paymentVoucher.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
        notes: reason ?? 'Cancelled',
      },
    });
  }
}

export class DprApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.dailyProgressReport.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.dailyProgressReport.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectedById: ctx.user.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.dailyProgressReport.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
        rejectionReason: `Returned: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.dailyProgressReport.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
      },
    });
  }
}

export class DigitalMbApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.digitalMbRecord.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.digitalMbRecord.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.digitalMbRecord.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
        rejectionReason: `Returned: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.digitalMbRecord.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
      },
    });
  }
}

export class InspectionApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.inspectionRequest.update({
      where: { id: entityId },
      data: {
        status: 'PASSED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.inspectionRequest.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.inspectionRequest.update({
      where: { id: entityId },
      data: {
        status: 'IN_PROGRESS',
        rejectionReason: `Returned: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.inspectionRequest.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}

export class NcrApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.nonConformanceReport.update({
      where: { id: entityId },
      data: {
        status: 'CLOSED',
        verifiedById: ctx.user.id,
        closedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.nonConformanceReport.update({
      where: { id: entityId },
      data: {
        status: 'ACTION_REQUIRED',
        closureRemarks: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.nonConformanceReport.update({
      where: { id: entityId },
      data: {
        status: 'UNDER_VERIFICATION',
        closureRemarks: `Returned: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.nonConformanceReport.update({
      where: { id: entityId },
      data: {
        status: 'VOIDED',
      },
    });
  }
}

export class MaterialIndentApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialIndent.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialIndent.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialIndent.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
        rejectionReason: `Returned: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialIndent.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason ?? 'Cancelled',
      },
    });
  }
}

export class MaterialIssueApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialIssue.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialIssue.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialIssue.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialIssue.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}

export class MaterialTransferApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialTransfer.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialTransfer.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialTransfer.update({
      where: { id: entityId },
      data: {
        status: 'DRAFT',
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.materialTransfer.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}

export class LeaveApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.leaveRecord.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.leaveRecord.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.leaveRecord.update({
      where: { id: entityId },
      data: {
        status: 'SUBMITTED',
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.leaveRecord.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
      },
    });
  }
}

export class RegularizationApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.attendanceRegularization.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.attendanceRegularization.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.attendanceRegularization.update({
      where: { id: entityId },
      data: {
        status: 'PENDING',
        rejectionReason: `Returned: ${reason}`,
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.attendanceRegularization.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}

export class LabourMusterApprovalAdapter implements DomainCompletionAdapter {
  async onApproved(ctx: ApprovalRequestContext, entityId: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.labourMusterRecord.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });
  }

  async onRejected(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.labourMusterRecord.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async onReturned(ctx: ApprovalRequestContext, entityId: string, reason: string, tx: PrismaTransactionClient): Promise<void> {
    await tx.labourMusterRecord.update({
      where: { id: entityId },
      data: {
        status: 'SUBMITTED',
      },
    });
  }

  async onCancelled(ctx: ApprovalRequestContext, entityId: string, reason: string | null | undefined, tx: PrismaTransactionClient): Promise<void> {
    await tx.labourMusterRecord.update({
      where: { id: entityId },
      data: {
        status: 'CANCELLED',
      },
    });
  }
}

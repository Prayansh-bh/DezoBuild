import type { SupportedApprovalEntityType } from '../constants/approval.constants';
import type { DomainCompletionAdapter, PrismaTransactionClient } from './domain-adapter.interface';
import type { ApprovalRequestContext } from '../helpers/approval-context.helper';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../../common/errors/app-error';
import {
  PurchaseOrderApprovalAdapter,
  RaBillApprovalAdapter,
  VendorInvoiceApprovalAdapter,
  ExpenseClaimApprovalAdapter,
  PaymentVoucherApprovalAdapter,
  DprApprovalAdapter,
  DigitalMbApprovalAdapter,
  InspectionApprovalAdapter,
  NcrApprovalAdapter,
  MaterialIndentApprovalAdapter,
  MaterialIssueApprovalAdapter,
  MaterialTransferApprovalAdapter,
  LeaveApprovalAdapter,
  RegularizationApprovalAdapter,
  LabourMusterApprovalAdapter,
} from './domain-adapters';

export interface SubjectMetadata {
  entityType: SupportedApprovalEntityType;
  modelName: string;
  submitPermission: string;
  viewPermission: string;
  defaultApprovalPermission: string;
  scopeLevel: 'TENANT' | 'PROJECT' | 'STORE';
  adapter: DomainCompletionAdapter;
  validateAndLockSubject(
    ctx: ApprovalRequestContext,
    entityId: string,
    tx: PrismaTransactionClient
  ): Promise<{ projectId?: string | null; title: string; monetaryAmount?: number | null }>;
}

class ApprovalSubjectRegistryClass {
  private readonly registry = new Map<SupportedApprovalEntityType, SubjectMetadata>();

  constructor() {
    this.registerAll();
  }

  private registerAll(): void {
    this.registry.set('PURCHASE_ORDER', {
      entityType: 'PURCHASE_ORDER',
      modelName: 'PurchaseOrder',
      submitPermission: 'materials:po:create',
      viewPermission: 'materials:view',
      defaultApprovalPermission: 'materials:po:approve',
      scopeLevel: 'PROJECT',
      adapter: new PurchaseOrderApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!po) throw new NotFoundError('PurchaseOrder not found in current tenant');
        if (po.status === 'APPROVED' || po.status === 'ORDERED' || po.status === 'CANCELLED') {
          throw new BadRequestError(`Cannot submit PurchaseOrder in ${po.status} status for approval`);
        }
        return {
          projectId: po.projectId,
          title: `Purchase Order ${po.poNumber}`,
          monetaryAmount: po.grandTotal ? Number(po.grandTotal) : 0,
        };
      },
    });

    this.registry.set('RA_BILL', {
      entityType: 'RA_BILL',
      modelName: 'RaBill',
      submitPermission: 'finance:bill:create',
      viewPermission: 'finance:view',
      defaultApprovalPermission: 'finance:bill:approve',
      scopeLevel: 'PROJECT',
      adapter: new RaBillApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const bill = await tx.raBill.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!bill) throw new NotFoundError('RaBill not found in current tenant');
        if (bill.status === 'APPROVED' || bill.status === 'PAID' || bill.status === 'CANCELLED') {
          throw new BadRequestError(`Cannot submit RaBill in ${bill.status} status for approval`);
        }
        return {
          projectId: bill.projectId,
          title: `RA Bill ${bill.billNumber}`,
          monetaryAmount: bill.netPayable ? Number(bill.netPayable) : 0,
        };
      },
    });

    this.registry.set('VENDOR_INVOICE', {
      entityType: 'VENDOR_INVOICE',
      modelName: 'VendorInvoice',
      submitPermission: 'finance:bill:create',
      viewPermission: 'finance:view',
      defaultApprovalPermission: 'finance:bill:approve',
      scopeLevel: 'PROJECT',
      adapter: new VendorInvoiceApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const inv = await tx.vendorInvoice.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!inv) throw new NotFoundError('VendorInvoice not found in current tenant');
        return {
          projectId: inv.projectId,
          title: `Vendor Invoice ${inv.invoiceNumber}`,
          monetaryAmount: inv.netPayable ? Number(inv.netPayable) : 0,
        };
      },
    });

    this.registry.set('EXPENSE_CLAIM', {
      entityType: 'EXPENSE_CLAIM',
      modelName: 'ExpenseClaim',
      submitPermission: 'finance:expense:create',
      viewPermission: 'finance:view',
      defaultApprovalPermission: 'finance:expense:approve',
      scopeLevel: 'PROJECT',
      adapter: new ExpenseClaimApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const exp = await tx.expenseClaim.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!exp) throw new NotFoundError('ExpenseClaim not found in current tenant');
        return {
          projectId: exp.projectId,
          title: `Expense Claim ${exp.claimNumber}`,
          monetaryAmount: exp.amount ? Number(exp.amount) : 0,
        };
      },
    });

    this.registry.set('PAYMENT_VOUCHER', {
      entityType: 'PAYMENT_VOUCHER',
      modelName: 'PaymentVoucher',
      submitPermission: 'finance:payment:create',
      viewPermission: 'finance:view',
      defaultApprovalPermission: 'finance:payment:disburse',
      scopeLevel: 'PROJECT',
      adapter: new PaymentVoucherApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const voucher = await tx.paymentVoucher.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!voucher) throw new NotFoundError('PaymentVoucher not found in current tenant');
        return {
          projectId: voucher.projectId,
          title: `Payment Voucher ${voucher.voucherNumber}`,
          monetaryAmount: voucher.totalAmount ? Number(voucher.totalAmount) : 0,
        };
      },
    });

    this.registry.set('DAILY_PROGRESS_REPORT', {
      entityType: 'DAILY_PROGRESS_REPORT',
      modelName: 'DailyProgressReport',
      submitPermission: 'projects:dpr:submit',
      viewPermission: 'projects:view',
      defaultApprovalPermission: 'projects:dpr:approve',
      scopeLevel: 'PROJECT',
      adapter: new DprApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const dpr = await tx.dailyProgressReport.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!dpr) throw new NotFoundError('DailyProgressReport not found in current tenant');
        return {
          projectId: dpr.projectId,
          title: `DPR ${dpr.dprNumber}`,
        };
      },
    });

    this.registry.set('DIGITAL_MB', {
      entityType: 'DIGITAL_MB',
      modelName: 'DigitalMbRecord',
      submitPermission: 'projects:wbs:edit',
      viewPermission: 'projects:view',
      defaultApprovalPermission: 'projects:dpr:approve',
      scopeLevel: 'PROJECT',
      adapter: new DigitalMbApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const mb = await tx.digitalMbRecord.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!mb) throw new NotFoundError('DigitalMbRecord not found in current tenant');
        return {
          projectId: mb.projectId,
          title: `Measurement ${mb.mbNumber}`,
        };
      },
    });

    this.registry.set('INSPECTION_REQUEST', {
      entityType: 'INSPECTION_REQUEST',
      modelName: 'InspectionRequest',
      submitPermission: 'quality:pour:create',
      viewPermission: 'quality:view',
      defaultApprovalPermission: 'quality:pour:approve',
      scopeLevel: 'PROJECT',
      adapter: new InspectionApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const ir = await tx.inspectionRequest.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!ir) throw new NotFoundError('InspectionRequest not found in current tenant');
        return {
          projectId: ir.projectId,
          title: `Inspection ${ir.inspectionNumber}`,
        };
      },
    });

    this.registry.set('NON_CONFORMANCE_REPORT', {
      entityType: 'NON_CONFORMANCE_REPORT',
      modelName: 'NonConformanceReport',
      submitPermission: 'quality:ncr:create',
      viewPermission: 'quality:view',
      defaultApprovalPermission: 'quality:ncr:verify',
      scopeLevel: 'PROJECT',
      adapter: new NcrApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const ncr = await tx.nonConformanceReport.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!ncr) throw new NotFoundError('NonConformanceReport not found in current tenant');
        return {
          projectId: ncr.projectId,
          title: `NCR ${ncr.ncrNumber}`,
        };
      },
    });

    this.registry.set('MATERIAL_INDENT', {
      entityType: 'MATERIAL_INDENT',
      modelName: 'MaterialIndent',
      submitPermission: 'materials:indent:create',
      viewPermission: 'materials:view',
      defaultApprovalPermission: 'materials:indent:approve',
      scopeLevel: 'PROJECT',
      adapter: new MaterialIndentApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const mi = await tx.materialIndent.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!mi) throw new NotFoundError('MaterialIndent not found in current tenant');
        return {
          projectId: mi.projectId,
          title: `Material Indent ${mi.indentNumber}`,
        };
      },
    });

    this.registry.set('MATERIAL_ISSUE', {
      entityType: 'MATERIAL_ISSUE',
      modelName: 'MaterialIssue',
      submitPermission: 'materials:stock:issue',
      viewPermission: 'materials:view',
      defaultApprovalPermission: 'materials:stock:issue',
      scopeLevel: 'PROJECT',
      adapter: new MaterialIssueApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const issue = await tx.materialIssue.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!issue) throw new NotFoundError('MaterialIssue not found in current tenant');
        return {
          projectId: issue.projectId,
          title: `Material Issue ${issue.issueNumber}`,
        };
      },
    });

    this.registry.set('MATERIAL_TRANSFER', {
      entityType: 'MATERIAL_TRANSFER',
      modelName: 'MaterialTransfer',
      submitPermission: 'materials:stock:transfer',
      viewPermission: 'materials:view',
      defaultApprovalPermission: 'materials:stock:transfer',
      scopeLevel: 'PROJECT',
      adapter: new MaterialTransferApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const transfer = await tx.materialTransfer.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!transfer) throw new NotFoundError('MaterialTransfer not found in current tenant');
        return {
          projectId: transfer.sourceProjectId,
          title: `Material Transfer ${transfer.transferNumber}`,
        };
      },
    });

    this.registry.set('LEAVE_RECORD', {
      entityType: 'LEAVE_RECORD',
      modelName: 'LeaveRecord',
      submitPermission: 'people:attendance:create',
      viewPermission: 'people:view',
      defaultApprovalPermission: 'people:attendance:approve',
      scopeLevel: 'TENANT',
      adapter: new LeaveApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const leave = await tx.leaveRecord.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!leave) throw new NotFoundError('LeaveRecord not found in current tenant');
        return {
          projectId: null,
          title: `Leave Request (${leave.leaveType})`,
        };
      },
    });

    this.registry.set('ATTENDANCE_REGULARIZATION', {
      entityType: 'ATTENDANCE_REGULARIZATION',
      modelName: 'AttendanceRegularization',
      submitPermission: 'people:attendance:create',
      viewPermission: 'people:view',
      defaultApprovalPermission: 'people:attendance:approve',
      scopeLevel: 'TENANT',
      adapter: new RegularizationApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const reg = await tx.attendanceRegularization.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!reg) throw new NotFoundError('AttendanceRegularization not found in current tenant');
        return {
          projectId: null,
          title: `Attendance Regularization`,
        };
      },
    });

    this.registry.set('LABOUR_MUSTER_RECORD', {
      entityType: 'LABOUR_MUSTER_RECORD',
      modelName: 'LabourMusterRecord',
      submitPermission: 'people:attendance:create',
      viewPermission: 'people:view',
      defaultApprovalPermission: 'people:attendance:approve',
      scopeLevel: 'PROJECT',
      adapter: new LabourMusterApprovalAdapter(),
      async validateAndLockSubject(ctx, entityId, tx) {
        const muster = await tx.labourMusterRecord.findUnique({
          where: { id: entityId, tenantId: ctx.tenantId },
        });
        if (!muster) throw new NotFoundError('LabourMusterRecord not found in current tenant');
        return {
          projectId: muster.projectId,
          title: `Labour Muster (${muster.id})`,
        };
      },
    });
  }

  public getSubject(entityType: string): SubjectMetadata {
    const meta = this.registry.get(entityType as SupportedApprovalEntityType);
    if (!meta) {
      throw new BadRequestError(`Unsupported or unknown approval entityType: '${entityType}'`);
    }
    return meta;
  }

  public isSupported(entityType: string): boolean {
    return this.registry.has(entityType as SupportedApprovalEntityType);
  }
}

export const ApprovalSubjectRegistry = new ApprovalSubjectRegistryClass();

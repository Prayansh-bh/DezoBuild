import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../../common/errors/index.js';
import { FinanceRequestContext } from '../constants/finance.constants.js';
import {
  CreatePaymentVoucherDto,
  ApprovePaymentVoucherDto,
  DisbursePaymentVoucherDto,
  ListPaymentVouchersQueryDto,
} from '../dto/payment.dto.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { FinanceSequenceRepository } from '../repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../repositories/finance-audit.repository.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export class PaymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly paymentRepo: PaymentRepository,
    private readonly sequenceRepo: FinanceSequenceRepository,
    private readonly auditRepo: FinanceAuditRepository
  ) {}

  async createVoucher(context: FinanceRequestContext, dto: CreatePaymentVoucherDto) {
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId: context.tenantId },
      });
      if (!project) throw new NotFoundError(`Project '${dto.projectId}' not found`);
    }

    let totalAmount = new Prisma.Decimal(0);

    // Validate each allocation target exists and has sufficient balance
    for (const alloc of dto.allocations) {
      const allocAmt = new Prisma.Decimal(alloc.allocatedAmount);
      totalAmount = totalAmount.add(allocAmt);

      if (alloc.invoiceId) {
        const inv = await this.prisma.vendorInvoice.findFirst({
          where: { id: alloc.invoiceId, tenantId: context.tenantId },
        });
        if (!inv) throw new NotFoundError(`Vendor invoice '${alloc.invoiceId}' not found`);
        if (inv.status !== 'APPROVED' && inv.status !== 'PARTIALLY_PAID') {
          throw new ConflictError(
            `Invoice '${inv.invoiceNumber}' is not payable (status: ${inv.status}). Must be APPROVED or PARTIALLY_PAID.`
          );
        }
        if (allocAmt.gt(inv.outstandingBalance)) {
          throw new ValidationError(
            `Allocated amount (${allocAmt}) exceeds invoice '${inv.invoiceNumber}' outstanding balance (${inv.outstandingBalance})`
          );
        }
      } else if (alloc.raBillId) {
        const bill = await this.prisma.raBill.findFirst({
          where: { id: alloc.raBillId, tenantId: context.tenantId },
        });
        if (!bill) throw new NotFoundError(`RA bill '${alloc.raBillId}' not found`);
        if (bill.status !== 'APPROVED' && bill.status !== 'PARTIALLY_PAID') {
          throw new ConflictError(
            `RA bill '${bill.billNumber}' is not payable (status: ${bill.status}). Must be APPROVED or PARTIALLY_PAID.`
          );
        }
        if (allocAmt.gt(bill.outstandingBalance)) {
          throw new ValidationError(
            `Allocated amount (${allocAmt}) exceeds RA bill '${bill.billNumber}' outstanding balance (${bill.outstandingBalance})`
          );
        }
      } else if (alloc.expenseClaimId) {
        const claim = await this.prisma.expenseClaim.findFirst({
          where: { id: alloc.expenseClaimId, tenantId: context.tenantId },
        });
        if (!claim) throw new NotFoundError(`Expense claim '${alloc.expenseClaimId}' not found`);
        if (claim.status !== 'APPROVED') {
          throw new ConflictError(
            `Expense claim '${claim.claimNumber}' is not payable (status: ${claim.status}). Must be APPROVED.`
          );
        }
        const claimTotal = claim.amount.add(claim.taxAmount);
        const claimOutstanding = claimTotal.sub(claim.paidAmount);
        if (allocAmt.gt(claimOutstanding)) {
          throw new ValidationError(
            `Allocated amount (${allocAmt}) exceeds expense claim '${claim.claimNumber}' outstanding balance (${claimOutstanding})`
          );
        }
      }
    }

    const voucherNumber = await this.sequenceRepo.getNextSequence(context.tenantId, 'PAY');

    const voucher = await this.paymentRepo.createVoucher(
      context.tenantId,
      voucherNumber,
      context.user.id,
      dto,
      totalAmount
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'PAYMENT_VOUCHER',
      entityId: voucher.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: 'DRAFT',
      ipAddress: context.ipAddress,
    });

    return voucher;
  }

  async getVoucherById(context: FinanceRequestContext, voucherId: string) {
    const voucher = await this.paymentRepo.findVoucherById(context.tenantId, voucherId);
    if (!voucher) {
      throw new NotFoundError(`Payment voucher '${voucherId}' not found`);
    }
    return voucher;
  }

  async approveVoucher(context: FinanceRequestContext, voucherId: string, dto: ApprovePaymentVoucherDto) {
    const voucher = await this.getVoucherById(context, voucherId);

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      context.tenantId,
      'PAYMENT_VOUCHER',
      voucherId
    );

    if (voucher.status !== 'DRAFT') {

      throw new ConflictError(`Cannot approve payment voucher in status '${voucher.status}'`);
    }

    if (voucher.createdById === context.user.id) {
      throw new ConflictError('Segregation of Duties Violation: You cannot approve a payment voucher you created');
    }

    const updated = await this.paymentRepo.updateVoucherStatus(
      context.tenantId,
      voucherId,
      'APPROVED'
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'PAYMENT_VOUCHER',
      entityId: voucherId,
      action: 'APPROVED',
      actorId: context.user.id,
      previousState: 'DRAFT',
      newState: 'APPROVED',
      reason: dto.approvalRemarks,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async disburseVoucher(context: FinanceRequestContext, voucherId: string, dto: DisbursePaymentVoucherDto) {
    const voucher = await this.getVoucherById(context, voucherId);

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      context.tenantId,
      'PAYMENT_VOUCHER',
      voucherId
    );

    if (voucher.status !== 'APPROVED') {

      throw new ConflictError(
        `Cannot disburse payment voucher in status '${voucher.status}'. Voucher must be APPROVED first.`
      );
    }

    if (voucher.createdById === context.user.id) {
      throw new ConflictError('Segregation of Duties Violation: You cannot disburse a payment voucher you created');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Acquire exclusive row-level lock on voucher to serialize concurrent disbursements
      const [lockedVoucher] = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status FROM payment_vouchers 
        WHERE id = ${voucherId}::uuid AND tenant_id = ${context.tenantId}::uuid
        FOR UPDATE
      `;

      if (!lockedVoucher || lockedVoucher.status !== 'APPROVED') {
        throw new ConflictError(`Voucher '${voucherId}' is no longer in APPROVED status for disbursement`);
      }

      const currentVoucher = await tx.paymentVoucher.findFirst({
        where: { id: voucherId, tenantId: context.tenantId },
        include: { allocations: true },
      });

      if (!currentVoucher || currentVoucher.status !== 'APPROVED') {
        throw new ConflictError(`Voucher '${voucherId}' is no longer in APPROVED status for disbursement`);
      }

      // 2. Verify total equals sum of allocations
      let sumAllocations = new Prisma.Decimal(0);
      for (const alloc of currentVoucher.allocations) {
        sumAllocations = sumAllocations.add(alloc.allocatedAmount);
      }

      if (!sumAllocations.equals(currentVoucher.totalAmount)) {
        throw new ValidationError(
          `Voucher total (${currentVoucher.totalAmount}) does not match sum of allocations (${sumAllocations})`
        );
      }

      // 3. Process targets in deterministic order to prevent deadlocks
      const sortedAllocations = [...currentVoucher.allocations].sort((a, b) =>
        (a.invoiceId || a.raBillId || a.expenseClaimId || '').localeCompare(
          b.invoiceId || b.raBillId || b.expenseClaimId || ''
        )
      );

      for (const alloc of sortedAllocations) {
        if (alloc.invoiceId) {
          const inv = await tx.vendorInvoice.findUnique({
            where: { id: alloc.invoiceId },
          });
          if (!inv || inv.tenantId !== context.tenantId) {
            throw new NotFoundError(`Invoice '${alloc.invoiceId}' not found`);
          }
          if (alloc.allocatedAmount.gt(inv.outstandingBalance)) {
            throw new ConflictError(
              `Payment allocation (${alloc.allocatedAmount}) exceeds invoice '${inv.invoiceNumber}' current outstanding balance (${inv.outstandingBalance})`
            );
          }

          const newPaid = inv.paidAmount.add(alloc.allocatedAmount);
          const newOutstanding = inv.netPayable.sub(newPaid);
          const newStatus = newOutstanding.lte(0) ? 'PAID' : 'PARTIALLY_PAID';

          await tx.vendorInvoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: newPaid,
              outstandingBalance: newOutstanding,
              status: newStatus,
            },
          });
        } else if (alloc.raBillId) {
          const bill = await tx.raBill.findUnique({
            where: { id: alloc.raBillId },
          });
          if (!bill || bill.tenantId !== context.tenantId) {
            throw new NotFoundError(`RA bill '${alloc.raBillId}' not found`);
          }
          if (alloc.allocatedAmount.gt(bill.outstandingBalance)) {
            throw new ConflictError(
              `Payment allocation (${alloc.allocatedAmount}) exceeds RA bill '${bill.billNumber}' current outstanding balance (${bill.outstandingBalance})`
            );
          }

          const newPaid = bill.paidAmount.add(alloc.allocatedAmount);
          const newOutstanding = bill.netPayable.sub(newPaid);
          const newStatus = newOutstanding.lte(0) ? 'PAID' : 'PARTIALLY_PAID';

          await tx.raBill.update({
            where: { id: bill.id },
            data: {
              paidAmount: newPaid,
              outstandingBalance: newOutstanding,
              status: newStatus,
            },
          });
        } else if (alloc.expenseClaimId) {
          const claim = await tx.expenseClaim.findUnique({
            where: { id: alloc.expenseClaimId },
          });
          if (!claim || claim.tenantId !== context.tenantId) {
            throw new NotFoundError(`Expense claim '${alloc.expenseClaimId}' not found`);
          }
          const claimTotal = claim.amount.add(claim.taxAmount);
          const claimOutstanding = claimTotal.sub(claim.paidAmount);
          if (alloc.allocatedAmount.gt(claimOutstanding)) {
            throw new ConflictError(
              `Payment allocation (${alloc.allocatedAmount}) exceeds expense claim '${claim.claimNumber}' current outstanding balance (${claimOutstanding})`
            );
          }

          const newPaid = claim.paidAmount.add(alloc.allocatedAmount);
          const newStatus = newPaid.gte(claimTotal) ? 'PAID' : claim.status;

          await tx.expenseClaim.update({
            where: { id: claim.id },
            data: {
              paidAmount: newPaid,
              status: newStatus,
            },
          });
        }
      }

      // 4. Mark voucher as DISBURSED
      const updated = await tx.paymentVoucher.update({
        where: { id: voucherId },
        data: {
          status: 'DISBURSED',
          disbursedById: context.user.id,
          disbursedAt: new Date(),
        },
        include: {
          allocations: true,
        },
      });

      // 5. Audit Log
      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          entityType: 'PAYMENT_VOUCHER',
          entityId: voucherId,
          action: 'DISBURSED',
          actorId: context.user.id,
          previousState: 'APPROVED',
          newState: 'DISBURSED',
          reason: dto.disbursementRemarks,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async listVouchers(context: FinanceRequestContext, query: ListPaymentVouchersQueryDto, allowedProjectIds?: string[]) {
    return this.paymentRepo.listVouchers(context.tenantId, query, allowedProjectIds);
  }
}

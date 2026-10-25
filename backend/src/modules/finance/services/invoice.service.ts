import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../../../common/errors/index.js';
import { FinanceRequestContext } from '../constants/finance.constants.js';
import {
  CreateVendorInvoiceDto,
  VerifyVendorInvoiceDto,
  ApproveVendorInvoiceDto,
  ListVendorInvoicesQueryDto,
} from '../dto/invoice.dto.js';
import { InvoiceRepository } from '../repositories/invoice.repository.js';
import { AdvanceRepository } from '../repositories/advance.repository.js';
import { RetentionRepository } from '../repositories/retention.repository.js';
import { FinanceSequenceRepository } from '../repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../repositories/finance-audit.repository.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export class InvoiceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly invoiceRepo: InvoiceRepository,
    private readonly advanceRepo: AdvanceRepository,
    private readonly retentionRepo: RetentionRepository,
    private readonly sequenceRepo: FinanceSequenceRepository,
    private readonly auditRepo: FinanceAuditRepository
  ) {}

  async createInvoice(context: FinanceRequestContext, dto: CreateVendorInvoiceDto) {
    // 1. Check duplicate vendor invoice number for this vendor
    const existing = await this.invoiceRepo.findInvoiceByVendorAndNumber(
      context.tenantId,
      dto.vendorId,
      dto.vendorInvoiceNumber
    );
    if (existing) {
      throw new ConflictError(
        `Invoice number '${dto.vendorInvoiceNumber}' already exists for vendor '${dto.vendorId}'`
      );
    }

    // 2. Validate Project and Vendor
    const [project, vendor] = await Promise.all([
      this.prisma.project.findFirst({ where: { id: dto.projectId, tenantId: context.tenantId } }),
      this.prisma.vendor.findFirst({ where: { id: dto.vendorId, tenantId: context.tenantId } }),
    ]);

    if (!project) throw new NotFoundError(`Project '${dto.projectId}' not found`);
    if (!vendor) throw new NotFoundError(`Vendor '${dto.vendorId}' not found`);

    // 3. Decimal Total Calculations
    let subtotal = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);

    for (const line of dto.lines) {
      const lineGross = new Prisma.Decimal(line.billedQuantity).mul(new Prisma.Decimal(line.unitRate));
      const lineTax = new Prisma.Decimal(line.taxAmount ?? 0);
      subtotal = subtotal.add(lineGross);
      totalTax = totalTax.add(lineTax);
    }

    const discount = new Prisma.Decimal(dto.discountAmount ?? 0);
    const directCharges = new Prisma.Decimal(dto.directChargesAmount ?? 0);
    const grossTotal = subtotal.add(totalTax).sub(discount).add(directCharges);

    const advanceRec = new Prisma.Decimal(dto.advanceRecovery ?? 0);
    const retention = new Prisma.Decimal(dto.retentionWithheld ?? 0);
    const tds = new Prisma.Decimal(dto.tdsDeducted ?? 0);
    const otherDed = new Prisma.Decimal(dto.otherDeductions ?? 0);
    const deductionsTotal = advanceRec.add(retention).add(tds).add(otherDed);

    if (deductionsTotal.gt(grossTotal)) {
      throw new ValidationError('Total deductions cannot exceed gross invoice total', [
        { name: 'deductionsTotal', reason: `Deductions (${deductionsTotal}) > Gross Total (${grossTotal})` },
      ]);
    }

    const netPayable = grossTotal.sub(deductionsTotal);

    // 4. Check advance balance if advance recovery is requested
    if (advanceRec.gt(0)) {
      if (!dto.advanceRecordId) {
        throw new ValidationError('advanceRecordId is required when advanceRecovery is specified');
      }
      const advance = await this.advanceRepo.findAdvanceById(context.tenantId, dto.advanceRecordId);
      if (!advance) {
        throw new NotFoundError(`Advance record '${dto.advanceRecordId}' not found`);
      }
      if (advance.outstandingAmount.lt(advanceRec)) {
        throw new ValidationError(
          `Advance recovery amount (${advanceRec}) exceeds available advance balance (${advance.outstandingAmount})`
        );
      }
    }

    // 5. Generate unique invoice number
    const invoiceNumber = await this.sequenceRepo.getNextSequence(context.tenantId, 'INV');

    // 6. Create Invoice
    const invoice = await this.invoiceRepo.createInvoice(
      context.tenantId,
      invoiceNumber,
      context.user.id,
      dto,
      {
        subtotalAmount: subtotal,
        taxAmount: totalTax,
        discountAmount: discount,
        directChargesAmount: directCharges,
        grossTotal,
        advanceRecovery: advanceRec,
        retentionWithheld: retention,
        tdsDeducted: tds,
        otherDeductions: otherDed,
        deductionsTotal,
        netPayable,
        outstandingBalance: netPayable,
      }
    );

    // 7. Audit Log
    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: 'DRAFT',
      ipAddress: context.ipAddress,
    });

    return invoice;
  }

  async getInvoiceById(context: FinanceRequestContext, invoiceId: string) {
    const invoice = await this.invoiceRepo.findInvoiceById(context.tenantId, invoiceId);
    if (!invoice) {
      throw new NotFoundError(`Vendor invoice '${invoiceId}' not found`);
    }
    return invoice;
  }

  async verifyInvoice(context: FinanceRequestContext, invoiceId: string, dto: VerifyVendorInvoiceDto) {
    const invoice = await this.getInvoiceById(context, invoiceId);

    if (invoice.status !== 'DRAFT' && invoice.status !== 'SUBMITTED') {
      throw new ConflictError(`Cannot verify invoice in status '${invoice.status}'`);
    }

    // 3-Way Match Verification
    for (const line of invoice.lines) {
      // Check GRN allocations
      for (const alloc of line.grnAllocations) {
        const grnLine = await this.prisma.goodsReceiptLine.findFirst({
          where: { id: alloc.grnLineId, tenantId: context.tenantId },
          include: { grn: true },
        });

        if (!grnLine) {
          throw new NotFoundError(`Goods receipt line '${alloc.grnLineId}' not found`);
        }

        if (grnLine.grn.status !== 'VERIFIED') {
          throw new ConflictError(`GRN '${grnLine.grn.grnNumber}' is not VERIFIED (status: ${grnLine.grn.status})`);
        }

        const previouslyBilled = await this.invoiceRepo.getGrnLineAllocatedQuantity(
          context.tenantId,
          alloc.grnLineId,
          invoiceId
        );

        const availableQty = grnLine.quantityAccepted.sub(previouslyBilled);
        if (alloc.allocatedQuantity.gt(availableQty)) {
          throw new ConflictError(
            `GRN line '${grnLine.id}' overbilled: Requested ${alloc.allocatedQuantity}, Available ${availableQty}`
          );
        }
      }

      // Check PO Price Variance
      if (line.poLineId) {
        const poLine = await this.prisma.purchaseOrderLine.findFirst({
          where: { id: line.poLineId, tenantId: context.tenantId },
        });

        if (poLine && line.unitRate.gt(poLine.unitRate)) {
          if (!dto.priceVarianceAuthorized) {
            throw new ConflictError(
              `Price variance detected on line '${line.description}': Invoiced rate (${line.unitRate}) > PO rate (${poLine.unitRate}). Authorization required.`
            );
          }
        }
      }
    }

    const updated = await this.invoiceRepo.updateInvoiceStatus(
      context.tenantId,
      invoiceId,
      'VERIFIED',
      context.user.id
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'VERIFIED',
      actorId: context.user.id,
      previousState: invoice.status,
      newState: 'VERIFIED',
      reason: dto.verificationRemarks ?? dto.varianceAuthorizationReason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async approveInvoice(context: FinanceRequestContext, invoiceId: string, dto: ApproveVendorInvoiceDto) {
    const invoice = await this.getInvoiceById(context, invoiceId);

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      context.tenantId,
      'VENDOR_INVOICE',
      invoiceId
    );

    if (invoice.status !== 'VERIFIED') {

      throw new ConflictError(`Cannot approve invoice in status '${invoice.status}'. Invoice must be VERIFIED first.`);
    }

    // Segregation of Duties: Creator cannot approve invoice
    if (invoice.createdById === context.user.id) {
      throw new ConflictError('Segregation of Duties Violation: You cannot approve an invoice you created');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Process Advance Recovery Allocation if applicable
      if (invoice.advanceRecovery.gt(0)) {
        const advance = await tx.advanceRecord.findFirst({
          where: { tenantId: context.tenantId, vendorId: invoice.vendorId, status: { not: 'FULLY_RECOVERED' } },
        });

        if (advance) {
          await this.advanceRepo.createRecoveryAllocation(
            context.tenantId,
            advance.id,
            context.user.id,
            invoice.advanceRecovery,
            { invoiceId },
            tx
          );
        }
      }

      // 2. Process Retention Record if applicable
      if (invoice.retentionWithheld.gt(0)) {
        await this.retentionRepo.createRetentionRecord(
          context.tenantId,
          invoice.projectId,
          invoice.vendorId,
          invoice.retentionWithheld,
          { invoiceId },
          tx
        );
      }

      // 3. Update Invoice to APPROVED
      const updated = await this.invoiceRepo.updateInvoiceStatus(
        context.tenantId,
        invoiceId,
        'APPROVED',
        undefined,
        context.user.id,
        tx
      );

      // 4. Audit Log
      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          entityType: 'INVOICE',
          entityId: invoiceId,
          action: 'APPROVED',
          actorId: context.user.id,
          previousState: 'VERIFIED',
          newState: 'APPROVED',
          reason: dto.approvalRemarks,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async listInvoices(context: FinanceRequestContext, query: ListVendorInvoicesQueryDto, allowedProjectIds?: string[]) {
    return this.invoiceRepo.listInvoices(context.tenantId, query, allowedProjectIds);
  }
}

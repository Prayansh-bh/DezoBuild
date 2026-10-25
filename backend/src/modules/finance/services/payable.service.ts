import { PrismaClient, Prisma } from '@prisma/client';
import { FinanceRequestContext } from '../constants/finance.constants.js';
import { ListPayablesQueryDto, PayableItemDto } from '../dto/payable.dto.js';

export class PayableService {
  constructor(private readonly prisma: PrismaClient) {}

  async listPayables(context: FinanceRequestContext, query: ListPayablesQueryDto, allowedProjectIds?: string[]) {
    const today = new Date();
    const items: PayableItemDto[] = [];

    // Common project filtering
    let projectFilter: Prisma.StringFilter | Prisma.NestedStringFilter | undefined;
    if (query.projectId) {
      projectFilter = { equals: query.projectId };
    } else if (allowedProjectIds) {
      projectFilter = { in: allowedProjectIds };
    }

    // 1. Fetch Vendor Invoices
    if (query.sourceType === 'ALL' || query.sourceType === 'VENDOR_INVOICE') {
      const invoiceWhere: Prisma.VendorInvoiceWhereInput = {
        tenantId: context.tenantId,
      };

      if (projectFilter) {
        invoiceWhere.projectId = projectFilter;
      }
      if (query.vendorId) {
        invoiceWhere.vendorId = query.vendorId;
      }
      if (query.status) {
        invoiceWhere.status = query.status;
      } else {
        invoiceWhere.status = { in: ['APPROVED', 'PARTIALLY_PAID'] };
      }

      const invoices = await this.prisma.vendorInvoice.findMany({
        where: invoiceWhere,
        include: {
          project: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      });

      for (const inv of invoices) {
        const dueDate = new Date(inv.dueDate);
        const diffTime = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        let agingBucket: PayableItemDto['agingBucket'] = 'CURRENT_0_30';
        if (daysOverdue > 90) agingBucket = 'DAYS_90_PLUS';
        else if (daysOverdue > 60) agingBucket = 'DAYS_61_90';
        else if (daysOverdue > 30) agingBucket = 'DAYS_31_60';

        items.push({
          id: inv.id,
          sourceType: 'VENDOR_INVOICE',
          documentNumber: inv.invoiceNumber,
          vendorId: inv.vendorId,
          vendorName: inv.vendor.name,
          projectId: inv.projectId,
          projectName: inv.project.name,
          dueDate: inv.dueDate.toISOString().split('T')[0],
          grossAmount: Number(inv.grossTotal),
          deductionsAmount: Number(inv.deductionsTotal),
          netPayable: Number(inv.netPayable),
          paidAmount: Number(inv.paidAmount),
          outstandingBalance: Number(inv.outstandingBalance),
          status: inv.status,
          agingBucket,
          daysOverdue,
        });
      }
    }

    // 2. Fetch RA Bills
    if (query.sourceType === 'ALL' || query.sourceType === 'RA_BILL') {
      const raBillWhere: Prisma.RaBillWhereInput = {
        tenantId: context.tenantId,
      };

      if (projectFilter) {
        raBillWhere.projectId = projectFilter;
      }
      if (query.vendorId) {
        raBillWhere.vendorId = query.vendorId;
      }
      if (query.status) {
        raBillWhere.status = query.status;
      } else {
        raBillWhere.status = { in: ['APPROVED', 'PARTIALLY_PAID'] };
      }

      const bills = await this.prisma.raBill.findMany({
        where: raBillWhere,
        include: {
          project: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
        orderBy: { billDate: 'asc' },
      });

      for (const bill of bills) {
        const billDate = new Date(bill.billDate);
        const diffTime = today.getTime() - billDate.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        let agingBucket: PayableItemDto['agingBucket'] = 'CURRENT_0_30';
        if (daysOverdue > 90) agingBucket = 'DAYS_90_PLUS';
        else if (daysOverdue > 60) agingBucket = 'DAYS_61_90';
        else if (daysOverdue > 30) agingBucket = 'DAYS_31_60';

        items.push({
          id: bill.id,
          sourceType: 'RA_BILL',
          documentNumber: bill.billNumber,
          vendorId: bill.vendorId,
          vendorName: bill.vendor.name,
          projectId: bill.projectId,
          projectName: bill.project.name,
          dueDate: bill.billDate.toISOString().split('T')[0],
          grossAmount: Number(bill.grossAmount),
          deductionsAmount: Number(bill.totalDeductions),
          netPayable: Number(bill.netPayable),
          paidAmount: Number(bill.paidAmount),
          outstandingBalance: Number(bill.outstandingBalance),
          status: bill.status,
          agingBucket,
          daysOverdue,
        });
      }
    }

    // Sort items by dueDate ascending
    items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const total = items.length;
    const paginatedItems = items.slice(query.offset, query.offset + query.limit);

    return {
      items: paginatedItems,
      total,
    };
  }
}

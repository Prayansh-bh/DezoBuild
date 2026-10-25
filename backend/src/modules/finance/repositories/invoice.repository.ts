import { PrismaClient, Prisma } from '@prisma/client';
import { CreateVendorInvoiceDto, ListVendorInvoicesQueryDto } from '../dto/invoice.dto.js';

export class InvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createInvoice(
    tenantId: string,
    invoiceNumber: string,
    createdById: string,
    dto: CreateVendorInvoiceDto,
    calculations: {
      subtotalAmount: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      directChargesAmount: Prisma.Decimal;
      grossTotal: Prisma.Decimal;
      advanceRecovery: Prisma.Decimal;
      retentionWithheld: Prisma.Decimal;
      tdsDeducted: Prisma.Decimal;
      otherDeductions: Prisma.Decimal;
      deductionsTotal: Prisma.Decimal;
      netPayable: Prisma.Decimal;
      outstandingBalance: Prisma.Decimal;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;

    return client.vendorInvoice.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        vendorId: dto.vendorId,
        purchaseOrderId: dto.purchaseOrderId,
        invoiceNumber,
        vendorInvoiceNumber: dto.vendorInvoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: new Date(dto.dueDate),
        subtotalAmount: calculations.subtotalAmount,
        taxAmount: calculations.taxAmount,
        discountAmount: calculations.discountAmount,
        directChargesAmount: calculations.directChargesAmount,
        grossTotal: calculations.grossTotal,
        advanceRecovery: calculations.advanceRecovery,
        retentionWithheld: calculations.retentionWithheld,
        tdsDeducted: calculations.tdsDeducted,
        otherDeductions: calculations.otherDeductions,
        deductionsTotal: calculations.deductionsTotal,
        netPayable: calculations.netPayable,
        paidAmount: new Prisma.Decimal(0),
        outstandingBalance: calculations.outstandingBalance,
        status: 'DRAFT',
        createdById,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((line) => {
            const lineGross = new Prisma.Decimal(line.billedQuantity).mul(new Prisma.Decimal(line.unitRate));
            const lineTax = new Prisma.Decimal(line.taxAmount ?? 0);
            const lineTotal = lineGross.add(lineTax);

            return {
              tenantId,
              poLineId: line.poLineId,
              materialId: line.materialId,
              description: line.description,
              isDirectCharge: line.isDirectCharge ?? false,
              billedQuantity: new Prisma.Decimal(line.billedQuantity),
              unitRate: new Prisma.Decimal(line.unitRate),
              taxRatePercent: new Prisma.Decimal(line.taxRatePercent ?? 0),
              taxAmount: lineTax,
              lineTotal,
              grnAllocations: line.grnAllocations && line.grnAllocations.length > 0 ? {
                create: line.grnAllocations.map((alloc) => ({
                  tenantId,
                  grnLineId: alloc.grnLineId,
                  allocatedQuantity: new Prisma.Decimal(alloc.allocatedQuantity),
                })),
              } : undefined,
              appliedTaxes: line.appliedTaxes && line.appliedTaxes.length > 0 ? {
                create: line.appliedTaxes.map((tax) => ({
                  tenantId,
                  taxType: tax.taxType,
                  taxRatePercent: new Prisma.Decimal(tax.taxRatePercent),
                  taxableBaseAmount: new Prisma.Decimal(tax.taxableBaseAmount),
                  taxAmount: new Prisma.Decimal(tax.taxAmount),
                  jurisdiction: tax.jurisdiction,
                  effectiveDate: new Date(tax.effectiveDate),
                })),
              } : undefined,
            };
          }),
        },
      },
      include: {
        vendor: true,
        project: { select: { id: true, name: true, code: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        lines: {
          include: {
            grnAllocations: true,
            appliedTaxes: true,
          },
        },
      },
    });
  }

  async findInvoiceById(tenantId: string, invoiceId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.vendorInvoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        vendor: true,
        project: { select: { id: true, name: true, code: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
        verifiedBy: { select: { id: true, email: true, fullName: true } },
        approvedBy: { select: { id: true, email: true, fullName: true } },
        lines: {
          include: {
            grnAllocations: true,
            appliedTaxes: true,
          },
        },
        allocations: {
          include: {
            voucher: true,
          },
        },
        advanceRecoveries: true,
        retentions: true,
      },
    });
  }

  async findInvoiceByVendorAndNumber(tenantId: string, vendorId: string, vendorInvoiceNumber: string) {
    return this.prisma.vendorInvoice.findUnique({
      where: {
        tenantId_vendorId_vendorInvoiceNumber: {
          tenantId,
          vendorId,
          vendorInvoiceNumber,
        },
      },
    });
  }

  async updateInvoiceStatus(
    tenantId: string,
    invoiceId: string,
    status: string,
    verifiedById?: string,
    approvedById?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return client.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        status,
        verifiedById: verifiedById ?? undefined,
        approvedById: approvedById ?? undefined,
      },
      include: {
        vendor: true,
        project: { select: { id: true, name: true, code: true } },
        lines: true,
      },
    });
  }

  async listInvoices(tenantId: string, query: ListVendorInvoicesQueryDto, allowedProjectIds?: string[]) {
    const where: Prisma.VendorInvoiceWhereInput = {
      tenantId,
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    } else if (allowedProjectIds) {
      where.projectId = { in: allowedProjectIds };
    }

    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.vendorInvoice.findMany({
        where,
        include: {
          vendor: true,
          project: { select: { id: true, name: true, code: true } },
          purchaseOrder: { select: { id: true, poNumber: true } },
        },
        orderBy: {
          invoiceDate: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.vendorInvoice.count({ where }),
    ]);

    return { items, total };
  }

  async getGrnLineAllocatedQuantity(tenantId: string, grnLineId: string, excludeInvoiceId?: string, tx?: Prisma.TransactionClient): Promise<Prisma.Decimal> {
    const client = tx || this.prisma;
    const allocations = await client.vendorInvoiceGrnAllocation.findMany({
      where: {
        tenantId,
        grnLineId,
        invoiceLine: {
          invoice: {
            status: { notIn: ['CANCELLED', 'REJECTED'] },
            id: excludeInvoiceId ? { not: excludeInvoiceId } : undefined,
          },
        },
      },
    });

    return allocations.reduce((sum, a) => sum.add(a.allocatedQuantity), new Prisma.Decimal(0));
  }
}

import { PrismaClient, Prisma } from '@prisma/client';
import { CreateRaBillDto, ListRaBillsQueryDto } from '../dto/ra-bill.dto.js';

export class RaBillRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getLatestBillSequence(tenantId: string, projectId: string, vendorId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || this.prisma;
    const latestBill = await client.raBill.findFirst({
      where: {
        tenantId,
        projectId,
        vendorId,
      },
      orderBy: {
        billSequence: 'desc',
      },
      select: {
        billSequence: true,
      },
    });

    return latestBill?.billSequence ?? 0;
  }

  async findActiveUnapprovedBill(tenantId: string, projectId: string, vendorId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.raBill.findFirst({
      where: {
        tenantId,
        projectId,
        vendorId,
        status: { in: ['DRAFT', 'SUBMITTED', 'VERIFIED'] },
      },
    });
  }

  async createRaBill(
    tenantId: string,
    billNumber: string,
    billSequence: number,
    createdById: string,
    dto: CreateRaBillDto,
    calculations: {
      grossAmount: Prisma.Decimal;
      totalDeductions: Prisma.Decimal;
      netPayable: Prisma.Decimal;
      outstandingBalance: Prisma.Decimal;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;

    return client.raBill.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        vendorId: dto.vendorId,
        billNumber,
        billSequence,
        periodStartDate: new Date(dto.periodStartDate),
        periodEndDate: new Date(dto.periodEndDate),
        billDate: new Date(dto.billDate),
        grossAmount: calculations.grossAmount,
        totalDeductions: calculations.totalDeductions,
        netPayable: calculations.netPayable,
        paidAmount: new Prisma.Decimal(0),
        outstandingBalance: calculations.outstandingBalance,
        status: 'DRAFT',
        createdById,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            tenantId,
            boqItemId: item.boqItemId,
            description: item.description,
            uom: item.uom,
            contractQuantity: new Prisma.Decimal(item.contractQuantity),
            unitRate: new Prisma.Decimal(item.unitRate),
            previousCumulativeQuantity: new Prisma.Decimal(item.previousCumulativeQuantity ?? 0),
            cumulativeCertifiedQuantity: new Prisma.Decimal(item.previousCumulativeQuantity ?? 0).add(new Prisma.Decimal(item.currentBillQuantity)),
            currentBillQuantity: new Prisma.Decimal(item.currentBillQuantity),
            currentAmount: new Prisma.Decimal(item.currentBillQuantity).mul(new Prisma.Decimal(item.unitRate)),
            measurementAllocations: {
              create: item.measurementAllocations.map((alloc) => ({
                tenantId,
                digitalMbRecordId: alloc.digitalMbRecordId,
                allocatedQuantity: new Prisma.Decimal(alloc.allocatedQuantity),
              })),
            },
          })),
        },
        deductions: dto.deductions && dto.deductions.length > 0 ? {
          create: dto.deductions.map((ded) => ({
            tenantId,
            deductionType: ded.deductionType,
            description: ded.description,
            calculationBase: ded.calculationBase ? new Prisma.Decimal(ded.calculationBase) : null,
            ratePercent: ded.ratePercent ? new Prisma.Decimal(ded.ratePercent) : null,
            amount: new Prisma.Decimal(ded.amount),
          })),
        } : undefined,
      },
      include: {
        vendor: true,
        project: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            measurementAllocations: true,
            boqItem: true,
          },
        },
        deductions: true,
      },
    });
  }

  async findRaBillById(tenantId: string, raBillId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.raBill.findFirst({
      where: {
        id: raBillId,
        tenantId,
      },
      include: {
        vendor: true,
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
        verifiedBy: { select: { id: true, email: true, fullName: true } },
        approvedBy: { select: { id: true, email: true, fullName: true } },
        items: {
          include: {
            measurementAllocations: true,
            boqItem: true,
          },
        },
        deductions: true,
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

  async updateRaBillStatus(
    tenantId: string,
    raBillId: string,
    status: string,
    verifiedById?: string,
    approvedById?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return client.raBill.update({
      where: { id: raBillId },
      data: {
        status,
        verifiedById: verifiedById ?? undefined,
        approvedById: approvedById ?? undefined,
      },
      include: {
        vendor: true,
        project: { select: { id: true, name: true, code: true } },
        items: true,
        deductions: true,
      },
    });
  }

  async listRaBills(tenantId: string, query: ListRaBillsQueryDto, allowedProjectIds?: string[]) {
    const where: Prisma.RaBillWhereInput = {
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
      this.prisma.raBill.findMany({
        where,
        include: {
          vendor: true,
          project: { select: { id: true, name: true, code: true } },
        },
        orderBy: {
          billDate: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.raBill.count({ where }),
    ]);

    return { items, total };
  }

  async getDigitalMbAllocatedQuantity(tenantId: string, digitalMbRecordId: string, excludeRaBillId?: string, tx?: Prisma.TransactionClient): Promise<Prisma.Decimal> {
    const client = tx || this.prisma;
    const allocations = await client.raBillMeasurementAllocation.findMany({
      where: {
        tenantId,
        digitalMbRecordId,
        raBillItem: {
          raBill: {
            status: { notIn: ['CANCELLED', 'REJECTED'] },
            id: excludeRaBillId ? { not: excludeRaBillId } : undefined,
          },
        },
      },
    });

    return allocations.reduce((sum, a) => sum.add(a.allocatedQuantity), new Prisma.Decimal(0));
  }
}

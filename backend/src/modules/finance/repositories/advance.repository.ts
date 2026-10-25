import { PrismaClient, Prisma } from '@prisma/client';
import { CreateAdvanceRecordDto, ListAdvanceRecordsQueryDto } from '../dto/advance.dto.js';

export class AdvanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createAdvance(
    tenantId: string,
    advanceNumber: string,
    dto: CreateAdvanceRecordDto,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    const amount = new Prisma.Decimal(dto.amount);

    return client.advanceRecord.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        advanceType: dto.advanceType,
        vendorId: dto.vendorId,
        employeeId: dto.employeeId,
        advanceNumber,
        advanceDate: new Date(dto.advanceDate),
        amount,
        recoveredAmount: new Prisma.Decimal(0),
        outstandingAmount: amount,
        status: 'DISBURSED',
        notes: dto.notes,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        vendor: true,
        employee: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findAdvanceById(tenantId: string, advanceId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.advanceRecord.findFirst({
      where: {
        id: advanceId,
        tenantId,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        vendor: true,
        employee: { select: { id: true, email: true, fullName: true } },
        recoveryAllocations: {
          include: {
            invoice: true,
            raBill: true,
          },
        },
      },
    });
  }

  async createRecoveryAllocation(
    tenantId: string,
    advanceRecordId: string,
    createdById: string,
    recoveryAmount: Prisma.Decimal,
    targets: { invoiceId?: string; raBillId?: string },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;

    // 1. Create allocation
    const allocation = await client.advanceRecoveryAllocation.create({
      data: {
        tenantId,
        advanceRecordId,
        invoiceId: targets.invoiceId,
        raBillId: targets.raBillId,
        recoveryAmount,
        createdById,
      },
    });

    // 2. Update AdvanceRecord balances
    const advance = await client.advanceRecord.findUniqueOrThrow({
      where: { id: advanceRecordId },
    });

    const newRecovered = advance.recoveredAmount.add(recoveryAmount);
    const newOutstanding = advance.amount.sub(newRecovered);
    const newStatus = newOutstanding.lte(0) ? 'FULLY_RECOVERED' : 'PARTIALLY_RECOVERED';

    await client.advanceRecord.update({
      where: { id: advanceRecordId },
      data: {
        recoveredAmount: newRecovered,
        outstandingAmount: newOutstanding,
        status: newStatus,
      },
    });

    return allocation;
  }

  async listAdvances(tenantId: string, query: ListAdvanceRecordsQueryDto, allowedProjectIds?: string[]) {
    const where: Prisma.AdvanceRecordWhereInput = {
      tenantId,
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    } else if (allowedProjectIds) {
      where.projectId = { in: allowedProjectIds };
    }

    if (query.advanceType) {
      where.advanceType = query.advanceType;
    }

    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }

    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.advanceRecord.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, code: true } },
          vendor: true,
          employee: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: {
          advanceDate: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.advanceRecord.count({ where }),
    ]);

    return { items, total };
  }
}

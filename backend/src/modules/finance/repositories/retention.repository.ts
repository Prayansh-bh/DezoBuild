import { PrismaClient, Prisma } from '@prisma/client';

export class RetentionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createRetentionRecord(
    tenantId: string,
    projectId: string,
    vendorId: string,
    retainedAmount: Prisma.Decimal,
    sources: { raBillId?: string; invoiceId?: string },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return client.retentionRecord.create({
      data: {
        tenantId,
        projectId,
        vendorId,
        raBillId: sources.raBillId,
        invoiceId: sources.invoiceId,
        retainedAmount,
        releasedAmount: new Prisma.Decimal(0),
        balanceAmount: retainedAmount,
        status: 'HELD',
      },
    });
  }

  async findRetentionById(tenantId: string, retentionId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.retentionRecord.findFirst({
      where: {
        id: retentionId,
        tenantId,
      },
      include: {
        project: true,
        vendor: true,
        raBill: true,
        invoice: true,
        releaseAllocations: {
          include: {
            paymentVoucher: true,
          },
        },
      },
    });
  }

  async createReleaseAllocation(
    tenantId: string,
    retentionRecordId: string,
    paymentVoucherId: string,
    createdById: string,
    releaseAmount: Prisma.Decimal,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;

    // 1. Create release allocation
    const allocation = await client.retentionReleaseAllocation.create({
      data: {
        tenantId,
        retentionRecordId,
        paymentVoucherId,
        releaseAmount,
        createdById,
      },
    });

    // 2. Update retention balance
    const record = await client.retentionRecord.findUniqueOrThrow({
      where: { id: retentionRecordId },
    });

    const newReleased = record.releasedAmount.add(releaseAmount);
    const newBalance = record.retainedAmount.sub(newReleased);
    const newStatus = newBalance.lte(0) ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED';

    await client.retentionRecord.update({
      where: { id: retentionRecordId },
      data: {
        releasedAmount: newReleased,
        balanceAmount: newBalance,
        status: newStatus,
      },
    });

    return allocation;
  }
}

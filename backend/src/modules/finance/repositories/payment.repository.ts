import { PrismaClient, Prisma } from '@prisma/client';
import { CreatePaymentVoucherDto, ListPaymentVouchersQueryDto } from '../dto/payment.dto.js';

export class PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createVoucher(
    tenantId: string,
    voucherNumber: string,
    createdById: string,
    dto: CreatePaymentVoucherDto,
    totalAmount: Prisma.Decimal,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;

    return client.paymentVoucher.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        voucherNumber,
        paymentDate: new Date(dto.paymentDate),
        paymentMode: dto.paymentMode,
        referenceNumber: dto.referenceNumber,
        bankAccountRef: dto.bankAccountRef,
        totalAmount,
        status: 'DRAFT',
        createdById,
        notes: dto.notes,
        allocations: {
          create: dto.allocations.map((alloc) => ({
            tenantId,
            invoiceId: alloc.invoiceId,
            raBillId: alloc.raBillId,
            expenseClaimId: alloc.expenseClaimId,
            allocatedAmount: new Prisma.Decimal(alloc.allocatedAmount),
          })),
        },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        allocations: {
          include: {
            invoice: true,
            raBill: true,
            expenseClaim: true,
          },
        },
      },
    });
  }

  async findVoucherById(tenantId: string, voucherId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.paymentVoucher.findFirst({
      where: {
        id: voucherId,
        tenantId,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, email: true, fullName: true } },
        disbursedBy: { select: { id: true, email: true, fullName: true } },
        allocations: {
          include: {
            invoice: {
              include: { vendor: true },
            },
            raBill: {
              include: { vendor: true },
            },
            expenseClaim: true,
          },
        },
      },
    });
  }

  async updateVoucherStatus(
    tenantId: string,
    voucherId: string,
    status: string,
    disbursedById?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return client.paymentVoucher.update({
      where: { id: voucherId },
      data: {
        status,
        disbursedById: disbursedById ?? undefined,
        disbursedAt: status === 'DISBURSED' ? new Date() : undefined,
      },
      include: {
        allocations: true,
      },
    });
  }

  async listVouchers(tenantId: string, query: ListPaymentVouchersQueryDto, allowedProjectIds?: string[]) {
    const where: Prisma.PaymentVoucherWhereInput = {
      tenantId,
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    } else if (allowedProjectIds) {
      where.OR = [
        { projectId: { in: allowedProjectIds } },
        { projectId: null },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.paymentMode) {
      where.paymentMode = query.paymentMode;
    }

    const [items, total] = await Promise.all([
      this.prisma.paymentVoucher.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, email: true, fullName: true } },
          disbursedBy: { select: { id: true, email: true, fullName: true } },
          allocations: true,
        },
        orderBy: {
          paymentDate: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.paymentVoucher.count({ where }),
    ]);

    return { items, total };
  }
}

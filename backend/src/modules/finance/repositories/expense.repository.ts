import { PrismaClient, Prisma } from '@prisma/client';
import { CreateExpenseCategoryDto, CreateExpenseClaimDto, ListExpensesQueryDto } from '../dto/expense.dto.js';

export class ExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Category Operations
  async createCategory(tenantId: string, dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isActive: true,
      },
    });
  }

  async findCategoryById(tenantId: string, categoryId: string) {
    return this.prisma.expenseCategory.findFirst({
      where: {
        id: categoryId,
        tenantId,
      },
    });
  }

  async listCategories(tenantId: string) {
    return this.prisma.expenseCategory.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Claim Operations
  async createClaim(
    tenantId: string,
    claimNumber: string,
    submittedById: string,
    dto: CreateExpenseClaimDto,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return client.expenseClaim.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        categoryId: dto.categoryId,
        claimNumber,
        submittedById,
        amount: new Prisma.Decimal(dto.amount),
        taxAmount: new Prisma.Decimal(dto.taxAmount ?? 0),
        claimDate: new Date(dto.claimDate),
        paidTo: dto.paidTo,
        invoiceNumber: dto.invoiceNumber,
        receiptUrl: dto.receiptUrl,
        description: dto.description,
        status: 'DRAFT',
      },
      include: {
        category: true,
        project: {
          select: { id: true, name: true, code: true },
        },
        submittedBy: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });
  }

  async findClaimById(tenantId: string, claimId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.expenseClaim.findFirst({
      where: {
        id: claimId,
        tenantId,
      },
      include: {
        category: true,
        project: {
          select: { id: true, name: true, code: true },
        },
        submittedBy: {
          select: { id: true, email: true, fullName: true },
        },
        approvedBy: {
          select: { id: true, email: true, fullName: true },
        },
        allocations: {
          include: {
            voucher: true,
          },
        },
      },
    });
  }

  async updateClaimStatus(
    tenantId: string,
    claimId: string,
    status: string,
    approvedById?: string,
    rejectionReason?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return client.expenseClaim.update({
      where: {
        id: claimId,
      },
      data: {
        status,
        approvedById: approvedById ?? undefined,
        rejectionReason: rejectionReason ?? undefined,
      },
      include: {
        category: true,
        project: { select: { id: true, name: true, code: true } },
        submittedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async listClaims(tenantId: string, query: ListExpensesQueryDto, allowedProjectIds?: string[]) {
    const where: Prisma.ExpenseClaimWhereInput = {
      tenantId,
    };

    if (query.projectId) {
      where.projectId = query.projectId;
    } else if (allowedProjectIds) {
      where.projectId = { in: allowedProjectIds };
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.claimDate = {};
      if (query.startDate) where.claimDate.gte = new Date(query.startDate);
      if (query.endDate) where.claimDate.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.expenseClaim.findMany({
        where,
        include: {
          category: true,
          project: { select: { id: true, name: true, code: true } },
          submittedBy: { select: { id: true, email: true, fullName: true } },
          approvedBy: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: {
          claimDate: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.expenseClaim.count({ where }),
    ]);

    return { items, total };
  }
}

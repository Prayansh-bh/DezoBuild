import type { PrismaClient, NonConformanceReport, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/quality.constants.js';

export class NcrRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: PrismaTransactionClient): PrismaTransactionClient {
    return tx || this.prisma;
  }

  async create(
    data: Prisma.NonConformanceReportCreateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<NonConformanceReport> {
    return this.getClient(tx).nonConformanceReport.create({ data });
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<NonConformanceReport | null> {
    return this.getClient(tx).nonConformanceReport.findFirst({
      where: { id, tenantId },
      include: {
        actions: true,
      },
    });
  }

  async findByNumber(
    tenantId: string,
    ncrNumber: string,
    tx?: PrismaTransactionClient
  ): Promise<NonConformanceReport | null> {
    return this.getClient(tx).nonConformanceReport.findFirst({
      where: { tenantId, ncrNumber },
    });
  }

  async list(
    tenantId: string,
    filter: {
      projectId?: string;
      status?: string;
      severity?: string;
      category?: string;
    },
    pagination: { skip: number; take: number },
    tx?: PrismaTransactionClient
  ): Promise<{ items: NonConformanceReport[]; total: number }> {
    const client = this.getClient(tx);
    const where: Prisma.NonConformanceReportWhereInput = {
      tenantId,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.severity ? { severity: filter.severity } : {}),
      ...(filter.category ? { category: filter.category } : {}),
    };

    const [items, total] = await Promise.all([
      client.nonConformanceReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          actions: true,
        },
      }),
      client.nonConformanceReport.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.NonConformanceReportUpdateArgs['data'],
    tx?: PrismaTransactionClient
  ): Promise<NonConformanceReport> {
    return this.getClient(tx).nonConformanceReport.update({
      where: { id },
      data,
    });
  }
}

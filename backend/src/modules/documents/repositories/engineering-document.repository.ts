import type { PrismaClient, EngineeringDocument, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/documents.constants.js';

export class EngineeringDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<(EngineeringDocument & { currentVersion?: any; versions?: any[]; createdBy?: any }) | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.engineeringDocument.findFirst({
      where: { id, tenantId },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        wbsNode: {
          select: { id: true, code: true, name: true },
        },
        task: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Acquire an exclusive row-level pessimistic lock for concurrency control.
   */
  public async findWithLock(
    tenantId: string,
    id: string,
    tx: PrismaTransactionClient
  ): Promise<(EngineeringDocument & { currentVersion?: any; versions?: any[] }) | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM engineering_documents
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
    if (!rows || rows.length === 0) return null;
    return (tx as PrismaClient).engineeringDocument.findFirst({
      where: { id, tenantId },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
  }

  public async findByNumber(
    tenantId: string,
    projectId: string,
    documentNumber: string,
    tx?: PrismaTransactionClient
  ): Promise<EngineeringDocument | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.engineeringDocument.findUnique({
      where: {
        tenantId_projectId_documentNumber: {
          tenantId,
          projectId,
          documentNumber,
        },
      },
    });
  }

  public async findByDrawingNumber(
    tenantId: string,
    projectId: string,
    drawingNumber: string,
    tx?: PrismaTransactionClient
  ): Promise<EngineeringDocument | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.engineeringDocument.findUnique({
      where: {
        tenantId_projectId_drawingNumber: {
          tenantId,
          projectId,
          drawingNumber,
        },
      },
    });
  }

  public async create(
    data: Prisma.EngineeringDocumentUncheckedCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<EngineeringDocument> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.engineeringDocument.create({ data });
  }

  public async update(
    tenantId: string,
    id: string,
    data: Prisma.EngineeringDocumentUncheckedUpdateInput,
    tx?: PrismaTransactionClient
  ): Promise<EngineeringDocument> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.engineeringDocument.update({
      where: { id },
      data,
    });
  }

  public async list(
    tenantId: string,
    filters: {
      projectId?: string;
      documentType?: string;
      discipline?: string;
      status?: string;
      wbsNodeId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.EngineeringDocumentWhereInput = {
      tenantId,
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.documentType && { documentType: filters.documentType }),
      ...(filters.discipline && { discipline: filters.discipline }),
      ...(filters.status && { status: filters.status }),
      ...(filters.wbsNodeId && { wbsNodeId: filters.wbsNodeId }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { documentNumber: { contains: filters.search, mode: 'insensitive' } },
          { drawingNumber: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.engineeringDocument.findMany({
        where,
        include: {
          currentVersion: true,
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.engineeringDocument.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

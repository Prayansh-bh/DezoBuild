import type { PrismaClient, DocumentTransmittal, DocumentTransmittalItem, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/documents.constants.js';

export class DocumentTransmittalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<
    | (DocumentTransmittal & {
        sender?: any;
        acknowledgedBy?: any;
        items?: Array<
          DocumentTransmittalItem & {
            documentVersion?: any;
          }
        >;
      })
    | null
  > {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentTransmittal.findFirst({
      where: { id, tenantId },
      include: {
        sender: {
          select: { id: true, fullName: true, email: true },
        },
        acknowledgedBy: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            documentVersion: {
              include: {
                document: {
                  select: {
                    id: true,
                    documentNumber: true,
                    drawingNumber: true,
                    title: true,
                    documentType: true,
                    discipline: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  public async findWithLock(
    tenantId: string,
    id: string,
    tx: PrismaTransactionClient
  ): Promise<(DocumentTransmittal & { items?: any[] }) | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM document_transmittals
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
    if (!rows || rows.length === 0) return null;
    return (tx as PrismaClient).documentTransmittal.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            documentVersion: {
              include: {
                document: true,
              },
            },
          },
        },
      },
    });
  }

  public async create(
    data: Prisma.DocumentTransmittalUncheckedCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<DocumentTransmittal> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentTransmittal.create({ data });
  }

  public async update(
    tenantId: string,
    id: string,
    data: Prisma.DocumentTransmittalUncheckedUpdateInput,
    tx?: PrismaTransactionClient
  ): Promise<DocumentTransmittal> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentTransmittal.update({
      where: { id },
      data,
    });
  }

  public async addItem(
    data: Prisma.DocumentTransmittalItemUncheckedCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<DocumentTransmittalItem> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentTransmittalItem.create({ data });
  }

  public async findItem(
    tenantId: string,
    transmittalId: string,
    documentVersionId: string,
    tx?: PrismaTransactionClient
  ): Promise<DocumentTransmittalItem | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentTransmittalItem.findUnique({
      where: {
        transmittalId_documentVersionId: {
          transmittalId,
          documentVersionId,
        },
      },
    });
  }

  public async findItemById(
    tenantId: string,
    itemId: string,
    tx?: PrismaTransactionClient
  ): Promise<DocumentTransmittalItem | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentTransmittalItem.findFirst({
      where: { id: itemId, tenantId },
    });
  }

  public async removeItem(
    tenantId: string,
    itemId: string,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const db = (tx ?? this.prisma) as PrismaClient;
    await db.documentTransmittalItem.delete({
      where: { id: itemId },
    });
  }

  public async list(
    tenantId: string,
    filters: {
      projectId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentTransmittalWhereInput = {
      tenantId,
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.search && {
        OR: [
          { transmittalNumber: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
          { recipientOrganization: { contains: filters.search, mode: 'insensitive' } },
          { recipientName: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.documentTransmittal.findMany({
        where,
        include: {
          sender: {
            select: { id: true, fullName: true, email: true },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.documentTransmittal.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

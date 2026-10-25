import type { PrismaClient, RequestForInformation, RfiDocumentReference, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/documents.constants.js';

export class RfiRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<
    | (RequestForInformation & {
        raisedBy?: any;
        assignedTo?: any;
        respondedBy?: any;
        closedBy?: any;
        documentReferences?: Array<
          RfiDocumentReference & {
            document?: any;
            documentVersion?: any;
          }
        >;
      })
    | null
  > {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.requestForInformation.findFirst({
      where: { id, tenantId },
      include: {
        raisedBy: {
          select: { id: true, fullName: true, email: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
        respondedBy: {
          select: { id: true, fullName: true, email: true },
        },
        closedBy: {
          select: { id: true, fullName: true, email: true },
        },
        documentReferences: {
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
            documentVersion: true,
          },
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

  public async findWithLock(
    tenantId: string,
    id: string,
    tx: PrismaTransactionClient
  ): Promise<RequestForInformation | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM requests_for_information
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
    if (!rows || rows.length === 0) return null;
    return (tx as PrismaClient).requestForInformation.findFirst({
      where: { id, tenantId },
    });
  }

  public async create(
    data: Prisma.RequestForInformationUncheckedCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<RequestForInformation> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.requestForInformation.create({ data });
  }

  public async update(
    tenantId: string,
    id: string,
    data: Prisma.RequestForInformationUncheckedUpdateInput,
    tx?: PrismaTransactionClient
  ): Promise<RequestForInformation> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.requestForInformation.update({
      where: { id },
      data,
    });
  }

  public async addReference(
    data: Prisma.RfiDocumentReferenceUncheckedCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<RfiDocumentReference> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.rfiDocumentReference.create({ data });
  }

  public async findReference(
    tenantId: string,
    rfiId: string,
    documentId: string,
    documentVersionId: string | null,
    referenceType: string,
    tx?: PrismaTransactionClient
  ): Promise<RfiDocumentReference | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.rfiDocumentReference.findFirst({
      where: {
        tenantId,
        rfiId,
        documentId,
        documentVersionId,
        referenceType,
      },
    });
  }

  public async findReferenceById(
    tenantId: string,
    referenceId: string,
    tx?: PrismaTransactionClient
  ): Promise<RfiDocumentReference | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.rfiDocumentReference.findFirst({
      where: { id: referenceId, tenantId },
    });
  }

  public async removeReference(
    tenantId: string,
    referenceId: string,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const db = (tx ?? this.prisma) as PrismaClient;
    await db.rfiDocumentReference.delete({
      where: { id: referenceId },
    });
  }

  public async list(
    tenantId: string,
    filters: {
      projectId?: string;
      status?: string;
      priority?: string;
      discipline?: string;
      assignedToId?: string;
      raisedById?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.RequestForInformationWhereInput = {
      tenantId,
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.discipline && { discipline: filters.discipline }),
      ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
      ...(filters.raisedById && { raisedById: filters.raisedById }),
      ...(filters.search && {
        OR: [
          { rfiNumber: { contains: filters.search, mode: 'insensitive' } },
          { subject: { contains: filters.search, mode: 'insensitive' } },
          { technicalQuery: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.requestForInformation.findMany({
        where,
        include: {
          raisedBy: {
            select: { id: true, fullName: true, email: true },
          },
          assignedTo: {
            select: { id: true, fullName: true, email: true },
          },
          _count: {
            select: { documentReferences: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.requestForInformation.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

import type { PrismaClient, DocumentVersion, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../constants/documents.constants.js';

export class DocumentVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(
    tenantId: string,
    id: string,
    tx?: PrismaTransactionClient
  ): Promise<DocumentVersion | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentVersion.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        issuedBy: {
          select: { id: true, fullName: true, email: true },
        },
        supersededBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  public async findWithLock(
    tenantId: string,
    id: string,
    tx: PrismaTransactionClient
  ): Promise<DocumentVersion | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM document_versions
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
    if (!rows || rows.length === 0) return null;
    return (tx as PrismaClient).documentVersion.findFirst({
      where: { id, tenantId },
    });
  }

  public async findByDocumentAndVersion(
    tenantId: string,
    documentId: string,
    versionNumber: number,
    tx?: PrismaTransactionClient
  ): Promise<DocumentVersion | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentVersion.findUnique({
      where: {
        tenantId_documentId_versionNumber: {
          tenantId,
          documentId,
          versionNumber,
        },
      },
    });
  }

  public async findByDocumentAndRevision(
    tenantId: string,
    documentId: string,
    revisionCode: string,
    tx?: PrismaTransactionClient
  ): Promise<DocumentVersion | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentVersion.findUnique({
      where: {
        tenantId_documentId_revisionCode: {
          tenantId,
          documentId,
          revisionCode,
        },
      },
    });
  }

  public async findLatestNonVoidVersion(
    tenantId: string,
    documentId: string,
    excludeVersionId?: string,
    tx?: PrismaTransactionClient
  ): Promise<DocumentVersion | null> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentVersion.findFirst({
      where: {
        tenantId,
        documentId,
        status: { not: 'VOID' },
        ...(excludeVersionId && { id: { not: excludeVersionId } }),
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  public async listByDocument(
    tenantId: string,
    documentId: string,
    status?: string,
    tx?: PrismaTransactionClient
  ): Promise<DocumentVersion[]> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentVersion.findMany({
      where: {
        tenantId,
        documentId,
        ...(status && { status }),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        issuedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  public async create(
    data: Prisma.DocumentVersionUncheckedCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<DocumentVersion> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentVersion.create({ data });
  }

  public async update(
    tenantId: string,
    id: string,
    data: Prisma.DocumentVersionUncheckedUpdateInput,
    tx?: PrismaTransactionClient
  ): Promise<DocumentVersion> {
    const db = (tx ?? this.prisma) as PrismaClient;
    return db.documentVersion.update({
      where: { id },
      data,
    });
  }

  public async supersedeOtherVersions(
    tenantId: string,
    documentId: string,
    activeVersionId: string,
    actorId: string,
    tx: PrismaTransactionClient
  ): Promise<void> {
    const db = tx as PrismaClient;
    await db.documentVersion.updateMany({
      where: {
        tenantId,
        documentId,
        id: { not: activeVersionId },
        status: { not: 'VOID' },
      },
      data: {
        status: 'SUPERSEDED',
        isSuperseded: true,
        supersededById: actorId,
        supersededAt: new Date(),
      },
    });
  }
}

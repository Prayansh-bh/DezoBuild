import type { PrismaClient, EngineeringDocument, DocumentVersion } from '@prisma/client';
import { EngineeringDocumentRepository } from '../repositories/engineering-document.repository.js';
import { DocumentVersionRepository } from '../repositories/document-version.repository.js';
import { DocumentAuditRepository } from '../repositories/document-audit.repository.js';
import {
  DocumentType,
  DocumentStatus,
  VersionStatus,
  DocumentEntityType,
  DocumentAuditAction,
  type DocumentsRequestContext,
} from '../constants/documents.constants.js';
import {
  type CreateDocumentDto,
  type UpdateDocumentDto,
  type RegisterVersionDto,
  type IssueVersionDto,
  type VoidVersionDto,
  type ArchiveDocumentDto,
  type VoidDocumentDto,
  type ListDocumentsQueryDto,
} from '../dto/documents.dto.js';
import { getNextDocumentSequence } from '../helpers/documents-sequence.helper.js';
import {
  validateStorageObjectKey,
  validateSha256Checksum,
} from '../helpers/storage-key-validator.helper.js';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
  ConflictError,
} from '../../../common/errors/app-error.js';

export class EngineeringDocumentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly documentRepo: EngineeringDocumentRepository,
    private readonly versionRepo: DocumentVersionRepository,
    private readonly auditRepo: DocumentAuditRepository
  ) {}

  /**
   * Helper to verify project scope and tenancy.
   */
  private async getProject(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      throw new NotFoundError(`Project not found or not in tenant scope: ${projectId}`);
    }
    return project;
  }

  public async create(
    context: DocumentsRequestContext,
    dto: CreateDocumentDto
  ): Promise<EngineeringDocument> {
    const project = await this.getProject(context.tenantId, dto.projectId);

    return this.prisma.$transaction(async (tx) => {
      const isDrawing = dto.documentType === DocumentType.DRAWING;
      let docNumber = dto.documentNumber;
      let dwgNumber = dto.drawingNumber;

      if (isDrawing) {
        if (!dwgNumber) {
          dwgNumber = await getNextDocumentSequence(
            context.tenantId,
            project.id,
            project.code,
            'DWG',
            tx,
            { discipline: dto.discipline }
          );
        }
        if (!docNumber) {
          docNumber = dwgNumber;
        }
      } else {
        if (!docNumber) {
          docNumber = await getNextDocumentSequence(
            context.tenantId,
            project.id,
            project.code,
            'DOC',
            tx
          );
        }
      }

      // Check unique documentNumber
      const existingDoc = await this.documentRepo.findByNumber(
        context.tenantId,
        project.id,
        docNumber,
        tx
      );
      if (existingDoc) {
        throw new BadRequestError(
          `Document number already exists in project: ${docNumber}`
        );
      }

      if (dwgNumber) {
        const existingDwg = await this.documentRepo.findByDrawingNumber(
          context.tenantId,
          project.id,
          dwgNumber,
          tx
        );
        if (existingDwg) {
          throw new BadRequestError(
            `Drawing number already exists in project: ${dwgNumber}`
          );
        }
      }

      const doc = await this.documentRepo.create(
        {
          tenantId: context.tenantId,
          projectId: project.id,
          documentNumber: docNumber,
          documentType: dto.documentType,
          category: dto.category,
          discipline: dto.discipline,
          title: dto.title,
          description: dto.description,
          drawingNumber: dwgNumber,
          sheetNumber: dto.sheetNumber,
          scale: dto.scale,
          wbsNodeId: dto.wbsNodeId,
          taskId: dto.taskId,
          status: DocumentStatus.DRAFT,
          createdById: context.user.id,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: project.id,
          entityType: DocumentEntityType.ENGINEERING_DOCUMENT,
          entityId: doc.id,
          action: DocumentAuditAction.CREATE,
          actorId: context.user.id,
          newState: doc,
          reason: 'Document created in draft state',
          ipAddress: context.ipAddress,
        },
        tx
      );

      return doc;
    });
  }

  public async getById(
    context: DocumentsRequestContext,
    id: string
  ): Promise<EngineeringDocument & { currentVersion?: any; versions?: any[]; createdBy?: any }> {
    const doc = await this.documentRepo.findById(context.tenantId, id);
    if (!doc) {
      throw new NotFoundError(`Engineering document not found: ${id}`);
    }
    return doc;
  }

  public async list(
    context: DocumentsRequestContext,
    query: ListDocumentsQueryDto
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    return this.documentRepo.list(context.tenantId, query);
  }

  public async update(
    context: DocumentsRequestContext,
    id: string,
    dto: UpdateDocumentDto
  ): Promise<EngineeringDocument> {
    const doc = await this.documentRepo.findById(context.tenantId, id);
    if (!doc) {
      throw new NotFoundError(`Engineering document not found: ${id}`);
    }

    if (doc.status === DocumentStatus.VOIDED || doc.status === DocumentStatus.ARCHIVED) {
      throw new BadRequestError(`Cannot update document in ${doc.status} state`);
    }

    return this.prisma.$transaction(async (tx) => {
      // If drawingNumber changed, verify uniqueness
      if (dto.drawingNumber && dto.drawingNumber !== doc.drawingNumber) {
        const existingDwg = await this.documentRepo.findByDrawingNumber(
          context.tenantId,
          doc.projectId,
          dto.drawingNumber,
          tx
        );
        if (existingDwg && existingDwg.id !== id) {
          throw new BadRequestError(
            `Drawing number already exists in project: ${dto.drawingNumber}`
          );
        }
      }

      const updated = await this.documentRepo.update(
        context.tenantId,
        id,
        {
          title: dto.title ?? doc.title,
          description: dto.description !== undefined ? dto.description : doc.description,
          category: dto.category !== undefined ? dto.category : doc.category,
          discipline: dto.discipline ?? doc.discipline,
          drawingNumber: dto.drawingNumber !== undefined ? dto.drawingNumber : doc.drawingNumber,
          sheetNumber: dto.sheetNumber !== undefined ? dto.sheetNumber : doc.sheetNumber,
          scale: dto.scale !== undefined ? dto.scale : doc.scale,
          wbsNodeId: dto.wbsNodeId !== undefined ? dto.wbsNodeId : doc.wbsNodeId,
          taskId: dto.taskId !== undefined ? dto.taskId : doc.taskId,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: doc.projectId,
          entityType: DocumentEntityType.ENGINEERING_DOCUMENT,
          entityId: id,
          action: DocumentAuditAction.UPDATE,
          actorId: context.user.id,
          previousState: doc,
          newState: updated,
          reason: 'Document metadata updated',
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  public async registerVersion(
    context: DocumentsRequestContext,
    documentId: string,
    dto: RegisterVersionDto
  ): Promise<DocumentVersion> {
    const doc = await this.documentRepo.findById(context.tenantId, documentId);
    if (!doc) {
      throw new NotFoundError(`Engineering document not found: ${documentId}`);
    }

    if (doc.status === DocumentStatus.VOIDED || doc.status === DocumentStatus.ARCHIVED) {
      throw new BadRequestError(`Cannot register version on ${doc.status} document`);
    }

    // 1. Strict storage object key validation
    validateStorageObjectKey({
      storageObjectKey: dto.storageObjectKey,
      expectedTenantId: context.tenantId,
      expectedProjectId: doc.projectId,
      expectedDocumentId: doc.id,
    });

    // 2. Strict SHA-256 validation
    validateSha256Checksum(dto.fileSha256);

    return this.prisma.$transaction(async (tx) => {
      // 3. Duplicate checks
      const existingVer = await this.versionRepo.findByDocumentAndVersion(
        context.tenantId,
        doc.id,
        dto.versionNumber,
        tx
      );
      if (existingVer) {
        throw new BadRequestError(
          `Version number ${dto.versionNumber} already exists for document ${doc.documentNumber}`
        );
      }

      const existingRev = await this.versionRepo.findByDocumentAndRevision(
        context.tenantId,
        doc.id,
        dto.revisionCode,
        tx
      );
      if (existingRev) {
        throw new BadRequestError(
          `Revision code '${dto.revisionCode}' already exists for document ${doc.documentNumber}`
        );
      }

      const byteSize = typeof dto.byteSize === 'bigint' ? dto.byteSize : BigInt(dto.byteSize);

      const version = await this.versionRepo.create(
        {
          tenantId: context.tenantId,
          projectId: doc.projectId,
          documentId: doc.id,
          versionNumber: dto.versionNumber,
          revisionCode: dto.revisionCode,
          issuePurpose: dto.issuePurpose,
          storageObjectKey: dto.storageObjectKey,
          originalFilename: dto.originalFilename,
          fileExtension: dto.fileExtension,
          mimeType: dto.mimeType,
          byteSize,
          fileSha256: dto.fileSha256.toLowerCase().trim(),
          revisionNotes: dto.revisionNotes,
          status: VersionStatus.DRAFT,
          isSuperseded: false,
          createdById: context.user.id,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: doc.projectId,
          entityType: DocumentEntityType.DOCUMENT_VERSION,
          entityId: version.id,
          action: DocumentAuditAction.REGISTER_VERSION,
          actorId: context.user.id,
          newState: {
            ...version,
            byteSize: version.byteSize.toString(),
          },
          reason: `Version ${version.versionNumber} (${version.revisionCode}) registered`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return version;
    });
  }

  public async issueVersion(
    context: DocumentsRequestContext,
    documentId: string,
    versionId: string,
    dto: IssueVersionDto
  ): Promise<EngineeringDocument> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock document exclusively
      const doc = await this.documentRepo.findWithLock(context.tenantId, documentId, tx);
      if (!doc) {
        throw new NotFoundError(`Engineering document not found: ${documentId}`);
      }

      if (doc.status === DocumentStatus.VOIDED || doc.status === DocumentStatus.ARCHIVED) {
        throw new BadRequestError(`Cannot issue version on ${doc.status} document`);
      }

      // 2. Lock and retrieve version
      const version = await this.versionRepo.findWithLock(context.tenantId, versionId, tx);
      if (!version) {
        throw new NotFoundError(`Document version not found: ${versionId}`);
      }

      // 3. Pointer integrity invariants
      if (
        version.documentId !== doc.id ||
        version.tenantId !== doc.tenantId ||
        version.projectId !== doc.projectId
      ) {
        throw new BadRequestError('Document version relational pointer mismatch');
      }

      if (version.status === VersionStatus.VOID) {
        throw new BadRequestError('Cannot issue a VOID version');
      }

      const now = new Date();

      // 4. Supersede all other historical versions of this document
      await this.versionRepo.supersedeOtherVersions(
        context.tenantId,
        doc.id,
        version.id,
        context.user.id,
        tx
      );

      // 5. Mark new version as ISSUED
      await this.versionRepo.update(
        context.tenantId,
        version.id,
        {
          status: VersionStatus.ISSUED,
          isSuperseded: false,
          issuePurpose: dto.issuePurpose ?? version.issuePurpose,
          issueDate: now,
          issuedById: context.user.id,
          issuedAt: now,
          revisionNotes: dto.revisionNotes ?? version.revisionNotes,
        },
        tx
      );

      // 6. Update master document currentVersionId and ACTIVE status
      const updatedDoc = await this.documentRepo.update(
        context.tenantId,
        doc.id,
        {
          currentVersionId: version.id,
          status: DocumentStatus.ACTIVE,
        },
        tx
      );

      // 7. Append-only audit record
      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: doc.projectId,
          entityType: DocumentEntityType.ENGINEERING_DOCUMENT,
          entityId: doc.id,
          action: DocumentAuditAction.ISSUE,
          actorId: context.user.id,
          previousState: {
            currentVersionId: doc.currentVersionId,
            status: doc.status,
          },
          newState: {
            currentVersionId: version.id,
            status: DocumentStatus.ACTIVE,
            versionNumber: version.versionNumber,
            revisionCode: version.revisionCode,
          },
          reason: `Version ${version.versionNumber} (${version.revisionCode}) issued as active release`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updatedDoc;
    });
  }

  /**
   * Voids a document version and executes atomic fallback if currentVersionId was voided.
   */
  public async voidVersion(
    context: DocumentsRequestContext,
    documentId: string,
    versionId: string,
    dto: VoidVersionDto
  ): Promise<EngineeringDocument> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock document exclusively
      const doc = await this.documentRepo.findWithLock(context.tenantId, documentId, tx);
      if (!doc) {
        throw new NotFoundError(`Engineering document not found: ${documentId}`);
      }

      // 2. Lock target version
      const version = await this.versionRepo.findWithLock(context.tenantId, versionId, tx);
      if (!version) {
        throw new NotFoundError(`Document version not found: ${versionId}`);
      }

      if (
        version.documentId !== doc.id ||
        version.tenantId !== doc.tenantId ||
        version.projectId !== doc.projectId
      ) {
        throw new BadRequestError('Document version pointer mismatch');
      }

      if (version.status === VersionStatus.VOID) {
        throw new BadRequestError('Version is already VOID');
      }

      // 3. Mark version as VOID
      await this.versionRepo.update(
        context.tenantId,
        version.id,
        {
          status: VersionStatus.VOID,
          isSuperseded: false,
        },
        tx
      );

      let updatedDoc: EngineeringDocument = doc;

      // 4. If target version is currentVersionId, perform atomic fallback
      if (doc.currentVersionId === version.id) {
        // Find highest versionNumber that is NOT VOID
        const fallbackVersion = await this.versionRepo.findLatestNonVoidVersion(
          context.tenantId,
          doc.id,
          version.id,
          tx
        );

        if (fallbackVersion) {
          // Re-promote to ISSUED and ensure others are SUPERSEDED
          await this.versionRepo.supersedeOtherVersions(
            context.tenantId,
            doc.id,
            fallbackVersion.id,
            context.user.id,
            tx
          );

          await this.versionRepo.update(
            context.tenantId,
            fallbackVersion.id,
            {
              status: VersionStatus.ISSUED,
              isSuperseded: false,
            },
            tx
          );

          updatedDoc = await this.documentRepo.update(
            context.tenantId,
            doc.id,
            {
              currentVersionId: fallbackVersion.id,
              status: DocumentStatus.ACTIVE,
            },
            tx
          );

          await this.auditRepo.log(
            {
              tenantId: context.tenantId,
              projectId: doc.projectId,
              entityType: DocumentEntityType.ENGINEERING_DOCUMENT,
              entityId: doc.id,
              action: DocumentAuditAction.ROLLBACK,
              actorId: context.user.id,
              previousState: { currentVersionId: version.id },
              newState: { currentVersionId: fallbackVersion.id },
              reason: `Version ${version.versionNumber} voided. Promoted previous revision ${fallbackVersion.versionNumber} (${fallbackVersion.revisionCode}) as active release`,
              ipAddress: context.ipAddress,
            },
            tx
          );
        } else {
          // No non-void version remains -> NULL currentVersionId, status = DRAFT
          updatedDoc = await this.documentRepo.update(
            context.tenantId,
            doc.id,
            {
              currentVersionId: null,
              status: DocumentStatus.DRAFT,
            },
            tx
          );

          await this.auditRepo.log(
            {
              tenantId: context.tenantId,
              projectId: doc.projectId,
              entityType: DocumentEntityType.ENGINEERING_DOCUMENT,
              entityId: doc.id,
              action: DocumentAuditAction.ROLLBACK,
              actorId: context.user.id,
              previousState: { currentVersionId: version.id },
              newState: { currentVersionId: null, status: DocumentStatus.DRAFT },
              reason: `Version ${version.versionNumber} voided. No valid historical revision exists, document returned to DRAFT`,
              ipAddress: context.ipAddress,
            },
            tx
          );
        }
      }

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: doc.projectId,
          entityType: DocumentEntityType.DOCUMENT_VERSION,
          entityId: version.id,
          action: DocumentAuditAction.VOID,
          actorId: context.user.id,
          previousState: { status: version.status },
          newState: { status: VersionStatus.VOID },
          reason: `Version ${version.versionNumber} voided: ${dto.reason}`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updatedDoc;
    });
  }

  public async archiveDocument(
    context: DocumentsRequestContext,
    id: string,
    dto: ArchiveDocumentDto
  ): Promise<EngineeringDocument> {
    const doc = await this.documentRepo.findById(context.tenantId, id);
    if (!doc) {
      throw new NotFoundError(`Engineering document not found: ${id}`);
    }

    if (doc.status === DocumentStatus.VOIDED) {
      throw new BadRequestError('Cannot archive a VOIDED document');
    }

    const updated = await this.documentRepo.update(context.tenantId, id, {
      status: DocumentStatus.ARCHIVED,
    });

    await this.auditRepo.log({
      tenantId: context.tenantId,
      projectId: doc.projectId,
      entityType: DocumentEntityType.ENGINEERING_DOCUMENT,
      entityId: doc.id,
      action: DocumentAuditAction.UPDATE,
      actorId: context.user.id,
      previousState: { status: doc.status },
      newState: { status: DocumentStatus.ARCHIVED },
      reason: dto.reason || 'Document archived',
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  public async voidDocument(
    context: DocumentsRequestContext,
    id: string,
    dto: VoidDocumentDto
  ): Promise<EngineeringDocument> {
    const doc = await this.documentRepo.findById(context.tenantId, id);
    if (!doc) {
      throw new NotFoundError(`Engineering document not found: ${id}`);
    }

    const updated = await this.documentRepo.update(context.tenantId, id, {
      status: DocumentStatus.VOIDED,
    });

    await this.auditRepo.log({
      tenantId: context.tenantId,
      projectId: doc.projectId,
      entityType: DocumentEntityType.ENGINEERING_DOCUMENT,
      entityId: doc.id,
      action: DocumentAuditAction.VOID,
      actorId: context.user.id,
      previousState: { status: doc.status },
      newState: { status: DocumentStatus.VOIDED },
      reason: dto.reason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  public async listVersions(
    context: DocumentsRequestContext,
    documentId: string,
    status?: string
  ): Promise<DocumentVersion[]> {
    const doc = await this.documentRepo.findById(context.tenantId, documentId);
    if (!doc) {
      throw new NotFoundError(`Engineering document not found: ${documentId}`);
    }
    return this.versionRepo.listByDocument(context.tenantId, documentId, status);
  }

  public async getVersionById(
    context: DocumentsRequestContext,
    documentId: string,
    versionId: string
  ): Promise<DocumentVersion> {
    const doc = await this.documentRepo.findById(context.tenantId, documentId);
    if (!doc) {
      throw new NotFoundError(`Engineering document not found: ${documentId}`);
    }
    const version = await this.versionRepo.findById(context.tenantId, versionId);
    if (!version || version.documentId !== documentId) {
      throw new NotFoundError(`Document version not found: ${versionId}`);
    }
    return version;
  }
}

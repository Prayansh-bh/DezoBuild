import type { PrismaClient, DocumentTransmittal, DocumentTransmittalItem } from '@prisma/client';
import { DocumentTransmittalRepository } from '../repositories/document-transmittal.repository.js';
import { DocumentVersionRepository } from '../repositories/document-version.repository.js';
import { DocumentAuditRepository } from '../repositories/document-audit.repository.js';
import {
  TransmittalStatus,
  DocumentEntityType,
  DocumentAuditAction,
  type DocumentsRequestContext,
} from '../constants/documents.constants.js';
import {
  type CreateTransmittalDto,
  type AddTransmittalItemDto,
  type IssueTransmittalDto,
  type AcknowledgeTransmittalDto,
  type CancelTransmittalDto,
  type ListTransmittalsQueryDto,
} from '../dto/transmittal.dto.js';
import { getNextDocumentSequence } from '../helpers/documents-sequence.helper.js';
import { NotFoundError, BadRequestError } from '../../../common/errors/app-error.js';

export class DocumentTransmittalService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly transmittalRepo: DocumentTransmittalRepository,
    private readonly versionRepo: DocumentVersionRepository,
    private readonly auditRepo: DocumentAuditRepository
  ) {}

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
    dto: CreateTransmittalDto
  ): Promise<DocumentTransmittal> {
    const project = await this.getProject(context.tenantId, dto.projectId);

    return this.prisma.$transaction(async (tx) => {
      const transmittalNumber = await getNextDocumentSequence(
        context.tenantId,
        project.id,
        project.code,
        'TR',
        tx
      );

      const transmittal = await this.transmittalRepo.create(
        {
          tenantId: context.tenantId,
          projectId: project.id,
          transmittalNumber,
          title: dto.title,
          issuePurpose: dto.issuePurpose,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
          senderId: context.user.id,
          recipientOrganization: dto.recipientOrganization,
          recipientName: dto.recipientName,
          recipientEmail: dto.recipientEmail,
          status: TransmittalStatus.DRAFT,
          remarks: dto.remarks,
        },
        tx
      );

      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          const version = await this.versionRepo.findById(context.tenantId, item.documentVersionId, tx);
          if (!version) {
            throw new NotFoundError(`Document version not found: ${item.documentVersionId}`);
          }
          if (version.projectId !== project.id) {
            throw new BadRequestError('Document version belongs to a different project scope');
          }

          await this.transmittalRepo.addItem(
            {
              tenantId: context.tenantId,
              projectId: project.id,
              transmittalId: transmittal.id,
              documentVersionId: version.id,
              copyCount: item.copyCount,
              remarks: item.remarks,
            },
            tx
          );
        }
      }

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: project.id,
          entityType: DocumentEntityType.DOCUMENT_TRANSMITTAL,
          entityId: transmittal.id,
          action: DocumentAuditAction.CREATE,
          actorId: context.user.id,
          newState: transmittal,
          reason: `Draft transmittal ${transmittal.transmittalNumber} created`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return transmittal;
    });
  }

  public async getById(
    context: DocumentsRequestContext,
    id: string
  ): Promise<DocumentTransmittal> {
    const transmittal = await this.transmittalRepo.findById(context.tenantId, id);
    if (!transmittal) {
      throw new NotFoundError(`Document transmittal not found: ${id}`);
    }
    return transmittal;
  }

  public async list(
    context: DocumentsRequestContext,
    query: ListTransmittalsQueryDto
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    return this.transmittalRepo.list(context.tenantId, query);
  }

  public async addItem(
    context: DocumentsRequestContext,
    transmittalId: string,
    dto: AddTransmittalItemDto
  ): Promise<DocumentTransmittalItem> {
    return this.prisma.$transaction(async (tx) => {
      const transmittal = await this.transmittalRepo.findWithLock(context.tenantId, transmittalId, tx);
      if (!transmittal) {
        throw new NotFoundError(`Document transmittal not found: ${transmittalId}`);
      }

      if (transmittal.status !== TransmittalStatus.DRAFT) {
        throw new BadRequestError(`Cannot modify transmittal manifest in ${transmittal.status} status`);
      }

      const version = await this.versionRepo.findById(context.tenantId, dto.documentVersionId, tx);
      if (!version) {
        throw new NotFoundError(`Document version not found: ${dto.documentVersionId}`);
      }

      if (version.projectId !== transmittal.projectId) {
        throw new BadRequestError('Document version belongs to a different project scope');
      }

      const existingItem = await this.transmittalRepo.findItem(
        context.tenantId,
        transmittal.id,
        version.id,
        tx
      );
      if (existingItem) {
        throw new BadRequestError('Document version already included in this transmittal');
      }

      const item = await this.transmittalRepo.addItem(
        {
          tenantId: context.tenantId,
          projectId: transmittal.projectId,
          transmittalId: transmittal.id,
          documentVersionId: version.id,
          copyCount: dto.copyCount,
          remarks: dto.remarks,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: transmittal.projectId,
          entityType: DocumentEntityType.DOCUMENT_TRANSMITTAL,
          entityId: transmittal.id,
          action: DocumentAuditAction.ADD_REFERENCE,
          actorId: context.user.id,
          newState: item,
          reason: `Added version ${version.versionNumber} to transmittal manifest`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return item;
    });
  }

  public async removeItem(
    context: DocumentsRequestContext,
    transmittalId: string,
    itemId: string
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const transmittal = await this.transmittalRepo.findWithLock(context.tenantId, transmittalId, tx);
      if (!transmittal) {
        throw new NotFoundError(`Document transmittal not found: ${transmittalId}`);
      }

      if (transmittal.status !== TransmittalStatus.DRAFT) {
        throw new BadRequestError(`Cannot remove item from transmittal in ${transmittal.status} status`);
      }

      const item = await this.transmittalRepo.findItemById(context.tenantId, itemId, tx);
      if (!item || item.transmittalId !== transmittal.id) {
        throw new NotFoundError(`Transmittal item not found: ${itemId}`);
      }

      await this.transmittalRepo.removeItem(context.tenantId, itemId, tx);

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: transmittal.projectId,
          entityType: DocumentEntityType.DOCUMENT_TRANSMITTAL,
          entityId: transmittal.id,
          action: DocumentAuditAction.REMOVE_REFERENCE,
          actorId: context.user.id,
          previousState: item,
          reason: `Removed item ${itemId} from transmittal manifest`,
          ipAddress: context.ipAddress,
        },
        tx
      );
    });
  }

  public async issue(
    context: DocumentsRequestContext,
    transmittalId: string,
    dto: IssueTransmittalDto
  ): Promise<DocumentTransmittal> {
    return this.prisma.$transaction(async (tx) => {
      const transmittal = await this.transmittalRepo.findWithLock(context.tenantId, transmittalId, tx);
      if (!transmittal) {
        throw new NotFoundError(`Document transmittal not found: ${transmittalId}`);
      }

      if (transmittal.status !== TransmittalStatus.DRAFT) {
        throw new BadRequestError(`Cannot issue transmittal in ${transmittal.status} status`);
      }

      const fullTransmittal = await this.transmittalRepo.findById(context.tenantId, transmittalId, tx);
      if (!fullTransmittal?.items || fullTransmittal.items.length === 0) {
        throw new BadRequestError('Cannot issue transmittal without at least one document version');
      }

      const updated = await this.transmittalRepo.update(
        context.tenantId,
        transmittal.id,
        {
          status: TransmittalStatus.ISSUED,
          remarks: dto.remarks ?? transmittal.remarks,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: transmittal.projectId,
          entityType: DocumentEntityType.DOCUMENT_TRANSMITTAL,
          entityId: transmittal.id,
          action: DocumentAuditAction.ISSUE_TRANSMITTAL,
          actorId: context.user.id,
          previousState: { status: transmittal.status },
          newState: { status: TransmittalStatus.ISSUED },
          reason: `Transmittal ${transmittal.transmittalNumber} issued and manifest frozen`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  public async acknowledge(
    context: DocumentsRequestContext,
    transmittalId: string,
    dto: AcknowledgeTransmittalDto
  ): Promise<DocumentTransmittal> {
    return this.prisma.$transaction(async (tx) => {
      const transmittal = await this.transmittalRepo.findWithLock(context.tenantId, transmittalId, tx);
      if (!transmittal) {
        throw new NotFoundError(`Document transmittal not found: ${transmittalId}`);
      }

      if (transmittal.status !== TransmittalStatus.ISSUED) {
        throw new BadRequestError(`Can only acknowledge an ISSUED transmittal (current status: ${transmittal.status})`);
      }

      const updated = await this.transmittalRepo.update(
        context.tenantId,
        transmittal.id,
        {
          status: TransmittalStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgedById: context.user.id,
          remarks: dto.remarks ? `${transmittal.remarks ?? ''}\nAck: ${dto.remarks}`.trim() : transmittal.remarks,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: transmittal.projectId,
          entityType: DocumentEntityType.DOCUMENT_TRANSMITTAL,
          entityId: transmittal.id,
          action: DocumentAuditAction.ACKNOWLEDGE_TRANSMITTAL,
          actorId: context.user.id,
          previousState: { status: transmittal.status },
          newState: { status: TransmittalStatus.ACKNOWLEDGED },
          reason: `Transmittal ${transmittal.transmittalNumber} acknowledged by recipient`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  public async cancel(
    context: DocumentsRequestContext,
    transmittalId: string,
    dto: CancelTransmittalDto
  ): Promise<DocumentTransmittal> {
    return this.prisma.$transaction(async (tx) => {
      const transmittal = await this.transmittalRepo.findWithLock(context.tenantId, transmittalId, tx);
      if (!transmittal) {
        throw new NotFoundError(`Document transmittal not found: ${transmittalId}`);
      }

      if (transmittal.status !== TransmittalStatus.DRAFT) {
        throw new BadRequestError(`Cannot cancel transmittal in ${transmittal.status} status. Only DRAFT transmittals can be cancelled`);
      }

      const updated = await this.transmittalRepo.update(
        context.tenantId,
        transmittal.id,
        {
          status: TransmittalStatus.CANCELLED,
          remarks: `${transmittal.remarks ?? ''}\nCancelled: ${dto.reason}`.trim(),
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: transmittal.projectId,
          entityType: DocumentEntityType.DOCUMENT_TRANSMITTAL,
          entityId: transmittal.id,
          action: DocumentAuditAction.CANCEL_RFI,
          actorId: context.user.id,
          previousState: { status: transmittal.status },
          newState: { status: TransmittalStatus.CANCELLED },
          reason: `Transmittal cancelled: ${dto.reason}`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }
}

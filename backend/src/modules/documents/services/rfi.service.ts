import type { PrismaClient, RequestForInformation, RfiDocumentReference } from '@prisma/client';
import { RfiRepository } from '../repositories/rfi.repository.js';
import { EngineeringDocumentRepository } from '../repositories/engineering-document.repository.js';
import { DocumentVersionRepository } from '../repositories/document-version.repository.js';
import { DocumentAuditRepository } from '../repositories/document-audit.repository.js';
import {
  RfiStatus,
  RfiPriority,
  DocumentEntityType,
  DocumentAuditAction,
  type DocumentsRequestContext,
} from '../constants/documents.constants.js';
import {
  type CreateRfiDto,
  type SubmitRfiDto,
  type AssignRfiDto,
  type RespondRfiDto,
  type CloseRfiDto,
  type ReopenRfiDto,
  type CancelRfiDto,
  type AddRfiReferenceDto,
  type ListRfisQueryDto,
} from '../dto/rfi.dto.js';
import { getNextDocumentSequence } from '../helpers/documents-sequence.helper.js';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
  ConflictError,
} from '../../../common/errors/app-error.js';

export class RfiService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly rfiRepo: RfiRepository,
    private readonly documentRepo: EngineeringDocumentRepository,
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
    dto: CreateRfiDto
  ): Promise<RequestForInformation> {
    const project = await this.getProject(context.tenantId, dto.projectId);

    return this.prisma.$transaction(async (tx) => {
      const rfiNumber = await getNextDocumentSequence(
        context.tenantId,
        project.id,
        project.code,
        'RFI',
        tx
      );

      const initialStatus = dto.submitImmediately ? RfiStatus.SUBMITTED : RfiStatus.DRAFT;
      const raisedAt = dto.submitImmediately ? new Date() : null;

      if (dto.assignedToId) {
        const assignedUser = await this.prisma.user.findFirst({
          where: { id: dto.assignedToId, tenantId: context.tenantId },
        });
        if (!assignedUser) {
          throw new NotFoundError(`Assigned user not found in tenant scope: ${dto.assignedToId}`);
        }
      }

      const rfi = await this.rfiRepo.create(
        {
          tenantId: context.tenantId,
          projectId: project.id,
          rfiNumber,
          subject: dto.subject,
          discipline: dto.discipline,
          location: dto.location,
          technicalQuery: dto.technicalQuery,
          proposedSolution: dto.proposedSolution,
          priority: dto.priority,
          wbsNodeId: dto.wbsNodeId,
          taskId: dto.taskId,
          status: initialStatus,
          raisedById: context.user.id,
          raisedAt,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          assignedToId: dto.assignedToId,
        },
        tx
      );

      if (dto.references && dto.references.length > 0) {
        for (const ref of dto.references) {
          const doc = await this.documentRepo.findById(context.tenantId, ref.documentId, tx);
          if (!doc) {
            throw new NotFoundError(`Referenced engineering document not found: ${ref.documentId}`);
          }
          if (doc.projectId !== project.id) {
            throw new BadRequestError('Referenced document belongs to a different project scope');
          }

          if (ref.documentVersionId) {
            const version = await this.versionRepo.findById(context.tenantId, ref.documentVersionId, tx);
            if (!version || version.documentId !== doc.id) {
              throw new BadRequestError('Referenced document version does not belong to the target document');
            }
          }

          await this.rfiRepo.addReference(
            {
              tenantId: context.tenantId,
              projectId: project.id,
              rfiId: rfi.id,
              documentId: doc.id,
              documentVersionId: ref.documentVersionId,
              referenceType: ref.referenceType,
            },
            tx
          );
        }
      }

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: project.id,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: dto.submitImmediately ? DocumentAuditAction.SUBMIT_RFI : DocumentAuditAction.CREATE,
          actorId: context.user.id,
          newState: rfi,
          reason: dto.submitImmediately
            ? `RFI ${rfi.rfiNumber} created and submitted immediately`
            : `RFI ${rfi.rfiNumber} created in draft state`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return rfi;
    });
  }

  public async getById(
    context: DocumentsRequestContext,
    id: string
  ): Promise<RequestForInformation> {
    const rfi = await this.rfiRepo.findById(context.tenantId, id);
    if (!rfi) {
      throw new NotFoundError(`RFI not found: ${id}`);
    }
    return rfi;
  }

  public async list(
    context: DocumentsRequestContext,
    query: ListRfisQueryDto
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    return this.rfiRepo.list(context.tenantId, query);
  }

  public async submit(
    context: DocumentsRequestContext,
    id: string,
    dto: SubmitRfiDto
  ): Promise<RequestForInformation> {
    return this.prisma.$transaction(async (tx) => {
      const rfi = await this.rfiRepo.findWithLock(context.tenantId, id, tx);
      if (!rfi) {
        throw new NotFoundError(`RFI not found: ${id}`);
      }

      if (rfi.status !== RfiStatus.DRAFT) {
        throw new BadRequestError(`Cannot submit RFI in ${rfi.status} status. Only DRAFT RFIs can be submitted`);
      }

      const updated = await this.rfiRepo.update(
        context.tenantId,
        rfi.id,
        {
          status: RfiStatus.SUBMITTED,
          raisedAt: new Date(),
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: DocumentAuditAction.SUBMIT_RFI,
          actorId: context.user.id,
          previousState: { status: rfi.status },
          newState: { status: RfiStatus.SUBMITTED },
          reason: dto.remarks || `RFI ${rfi.rfiNumber} submitted for technical review`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  public async assign(
    context: DocumentsRequestContext,
    id: string,
    dto: AssignRfiDto
  ): Promise<RequestForInformation> {
    return this.prisma.$transaction(async (tx) => {
      const rfi = await this.rfiRepo.findWithLock(context.tenantId, id, tx);
      if (!rfi) {
        throw new NotFoundError(`RFI not found: ${id}`);
      }

      if (rfi.status !== RfiStatus.SUBMITTED && rfi.status !== RfiStatus.ASSIGNED) {
        throw new BadRequestError(`Cannot assign RFI in ${rfi.status} status. Assignment must operate from SUBMITTED`);
      }

      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, tenantId: context.tenantId },
      });
      if (!assignee) {
        throw new NotFoundError(`Assigned user not found in tenant: ${dto.assignedToId}`);
      }

      const updated = await this.rfiRepo.update(
        context.tenantId,
        rfi.id,
        {
          assignedToId: assignee.id,
          status: RfiStatus.ASSIGNED,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: DocumentAuditAction.ASSIGN_RFI,
          actorId: context.user.id,
          previousState: { status: rfi.status, assignedToId: rfi.assignedToId },
          newState: { status: RfiStatus.ASSIGNED, assignedToId: assignee.id },
          reason: `RFI ${rfi.rfiNumber} assigned to ${assignee.fullName}`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  public async respond(
    context: DocumentsRequestContext,
    id: string,
    dto: RespondRfiDto
  ): Promise<RequestForInformation> {
    return this.prisma.$transaction(async (tx) => {
      const rfi = await this.rfiRepo.findWithLock(context.tenantId, id, tx);
      if (!rfi) {
        throw new NotFoundError(`RFI not found: ${id}`);
      }

      if (rfi.status !== RfiStatus.SUBMITTED && rfi.status !== RfiStatus.ASSIGNED) {
        throw new BadRequestError(
          `Cannot respond to RFI in ${rfi.status} status. Response allowed only from SUBMITTED or ASSIGNED`
        );
      }

      // CRITICAL SoD RULE: raisedById !== respondedById
      if (rfi.raisedById === context.user.id) {
        throw new BadRequestError(
          'Separation of Duties violation: The creator of the RFI cannot provide the authoritative response'
        );
      }

      if (!dto.officialResponse || dto.officialResponse.trim().length < 10) {
        throw new ValidationError('Official response must be at least 10 characters');
      }

      const now = new Date();
      const updated = await this.rfiRepo.update(
        context.tenantId,
        rfi.id,
        {
          officialResponse: dto.officialResponse.trim(),
          respondedById: context.user.id,
          respondedAt: now,
          status: RfiStatus.RESPONDED,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: DocumentAuditAction.RESPOND_RFI,
          actorId: context.user.id,
          previousState: { status: rfi.status },
          newState: {
            status: RfiStatus.RESPONDED,
            respondedById: context.user.id,
            respondedAt: now,
            officialResponse: dto.officialResponse.trim(),
          },
          reason: `Authoritative technical response provided for RFI ${rfi.rfiNumber}`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  public async close(
    context: DocumentsRequestContext,
    id: string,
    dto: CloseRfiDto
  ): Promise<RequestForInformation> {
    return this.prisma.$transaction(async (tx) => {
      const rfi = await this.rfiRepo.findWithLock(context.tenantId, id, tx);
      if (!rfi) {
        throw new NotFoundError(`RFI not found: ${id}`);
      }

      if (rfi.status !== RfiStatus.RESPONDED) {
        throw new BadRequestError(
          `Cannot close RFI in ${rfi.status} status. RFI must be in RESPONDED status to close`
        );
      }

      if (!dto.closureRemarks || dto.closureRemarks.trim().length < 3) {
        throw new ValidationError('Closure remarks are mandatory and must be at least 3 characters');
      }

      // Independent reviewer rule for HIGH / URGENT priority:
      if (
        (rfi.priority === RfiPriority.HIGH || rfi.priority === RfiPriority.URGENT) &&
        rfi.respondedById === context.user.id
      ) {
        throw new BadRequestError(
          'Separation of Duties violation: For HIGH or URGENT priority RFIs, the respondent cannot perform closure. Independent reviewer required'
        );
      }

      const now = new Date();
      const updated = await this.rfiRepo.update(
        context.tenantId,
        rfi.id,
        {
          status: RfiStatus.CLOSED,
          closedById: context.user.id,
          closedAt: now,
          closureRemarks: dto.closureRemarks.trim(),
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: DocumentAuditAction.CLOSE_RFI,
          actorId: context.user.id,
          previousState: { status: rfi.status },
          newState: {
            status: RfiStatus.CLOSED,
            closedById: context.user.id,
            closedAt: now,
            closureRemarks: dto.closureRemarks.trim(),
          },
          reason: `RFI ${rfi.rfiNumber} verified and closed: ${dto.closureRemarks.trim()}`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  public async reopen(
    context: DocumentsRequestContext,
    id: string,
    dto: ReopenRfiDto
  ): Promise<RequestForInformation> {
    return this.prisma.$transaction(async (tx) => {
      const rfi = await this.rfiRepo.findWithLock(context.tenantId, id, tx);
      if (!rfi) {
        throw new NotFoundError(`RFI not found: ${id}`);
      }

      if (rfi.status !== RfiStatus.RESPONDED && rfi.status !== RfiStatus.CLOSED) {
        throw new BadRequestError(
          `Cannot reopen RFI in ${rfi.status} status. Reopen allowed only from RESPONDED or CLOSED`
        );
      }

      if (!dto.reopenReason || dto.reopenReason.trim().length < 10) {
        throw new ValidationError('Reopen reason must be at least 10 characters');
      }

      // Preserve full historical response in audit before transitioning to SUBMITTED
      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: DocumentAuditAction.REOPEN_RFI,
          actorId: context.user.id,
          previousState: {
            status: rfi.status,
            officialResponse: rfi.officialResponse,
            respondedById: rfi.respondedById,
            respondedAt: rfi.respondedAt,
            closedById: rfi.closedById,
            closedAt: rfi.closedAt,
            closureRemarks: rfi.closureRemarks,
          },
          newState: {
            status: RfiStatus.SUBMITTED,
            reopenReason: dto.reopenReason.trim(),
          },
          reason: `RFI ${rfi.rfiNumber} reopened: ${dto.reopenReason.trim()}`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      const updated = await this.rfiRepo.update(
        context.tenantId,
        rfi.id,
        {
          status: RfiStatus.SUBMITTED,
          reopenReason: dto.reopenReason.trim(),
        },
        tx
      );

      return updated;
    });
  }

  public async cancel(
    context: DocumentsRequestContext,
    id: string,
    dto: CancelRfiDto
  ): Promise<RequestForInformation> {
    return this.prisma.$transaction(async (tx) => {
      const rfi = await this.rfiRepo.findWithLock(context.tenantId, id, tx);
      if (!rfi) {
        throw new NotFoundError(`RFI not found: ${id}`);
      }

      if (
        rfi.status !== RfiStatus.DRAFT &&
        rfi.status !== RfiStatus.SUBMITTED &&
        rfi.status !== RfiStatus.ASSIGNED
      ) {
        throw new BadRequestError(
          `Cannot cancel RFI in ${rfi.status} status. Cancellation allowed only from DRAFT, SUBMITTED, or ASSIGNED`
        );
      }

      if (!dto.cancellationReason || dto.cancellationReason.trim().length < 5) {
        throw new ValidationError('Cancellation reason must be at least 5 characters');
      }

      const updated = await this.rfiRepo.update(
        context.tenantId,
        rfi.id,
        {
          status: RfiStatus.CANCELLED,
          cancellationReason: dto.cancellationReason.trim(),
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: DocumentAuditAction.CANCEL_RFI,
          actorId: context.user.id,
          previousState: { status: rfi.status },
          newState: { status: RfiStatus.CANCELLED, cancellationReason: dto.cancellationReason.trim() },
          reason: `RFI ${rfi.rfiNumber} cancelled: ${dto.cancellationReason.trim()}`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  public async addReference(
    context: DocumentsRequestContext,
    rfiId: string,
    dto: AddRfiReferenceDto
  ): Promise<RfiDocumentReference> {
    return this.prisma.$transaction(async (tx) => {
      const rfi = await this.rfiRepo.findWithLock(context.tenantId, rfiId, tx);
      if (!rfi) {
        throw new NotFoundError(`RFI not found: ${rfiId}`);
      }

      if (rfi.status === RfiStatus.CLOSED || rfi.status === RfiStatus.CANCELLED) {
        throw new BadRequestError(`Cannot add document references to ${rfi.status} RFI`);
      }

      const doc = await this.documentRepo.findById(context.tenantId, dto.documentId, tx);
      if (!doc) {
        throw new NotFoundError(`Engineering document not found: ${dto.documentId}`);
      }

      if (doc.projectId !== rfi.projectId) {
        throw new BadRequestError('Referenced document belongs to a different project scope');
      }

      if (dto.documentVersionId) {
        const version = await this.versionRepo.findById(context.tenantId, dto.documentVersionId, tx);
        if (!version || version.documentId !== doc.id) {
          throw new BadRequestError('Referenced document version does not belong to the target document');
        }
      }

      const existingRef = await this.rfiRepo.findReference(
        context.tenantId,
        rfi.id,
        doc.id,
        dto.documentVersionId ?? null,
        dto.referenceType,
        tx
      );
      if (existingRef) {
        throw new BadRequestError('Reference already exists on this RFI');
      }

      const ref = await this.rfiRepo.addReference(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          rfiId: rfi.id,
          documentId: doc.id,
          documentVersionId: dto.documentVersionId,
          referenceType: dto.referenceType,
        },
        tx
      );

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: DocumentAuditAction.ADD_REFERENCE,
          actorId: context.user.id,
          newState: ref,
          reason: `Added ${dto.referenceType} reference (Document ${doc.documentNumber}) to RFI ${rfi.rfiNumber}`,
          ipAddress: context.ipAddress,
        },
        tx
      );

      return ref;
    });
  }

  public async removeReference(
    context: DocumentsRequestContext,
    rfiId: string,
    referenceId: string
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const rfi = await this.rfiRepo.findWithLock(context.tenantId, rfiId, tx);
      if (!rfi) {
        throw new NotFoundError(`RFI not found: ${rfiId}`);
      }

      if (
        rfi.status !== RfiStatus.DRAFT &&
        rfi.status !== RfiStatus.SUBMITTED &&
        rfi.status !== RfiStatus.ASSIGNED
      ) {
        throw new BadRequestError(
          `Cannot remove reference from RFI in ${rfi.status} status. Only allowed in DRAFT, SUBMITTED, or ASSIGNED`
        );
      }

      const ref = await this.rfiRepo.findReferenceById(context.tenantId, referenceId, tx);
      if (!ref || ref.rfiId !== rfi.id) {
        throw new NotFoundError(`RFI document reference not found: ${referenceId}`);
      }

      await this.rfiRepo.removeReference(context.tenantId, referenceId, tx);

      await this.auditRepo.log(
        {
          tenantId: context.tenantId,
          projectId: rfi.projectId,
          entityType: DocumentEntityType.REQUEST_FOR_INFORMATION,
          entityId: rfi.id,
          action: DocumentAuditAction.REMOVE_REFERENCE,
          actorId: context.user.id,
          previousState: ref,
          reason: `Removed reference ${referenceId} from RFI ${rfi.rfiNumber}`,
          ipAddress: context.ipAddress,
        },
        tx
      );
    });
  }
}

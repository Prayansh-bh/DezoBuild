import type { PrismaClient, InspectionRequest, InspectionChecklistItem } from '@prisma/client';
import { InspectionRepository } from '../repositories/inspection.repository.js';
import { QualitySafetyAuditRepository } from '../repositories/quality-safety-audit.repository.js';
import { ActionRepository } from '../repositories/action.repository.js';
import { getNextQualitySafetySequence } from '../helpers/quality-sequence.helper.js';
import { getChecklistCatalog } from '../constants/checklist.catalog.js';
import {
  InspectionStatus,
  ChecklistResult,
  ChecklistItemType,
  ActionType,
  ActionStatus,
  ActionPriority,
  type QualityRequestContext,
} from '../constants/quality.constants.js';
import type {
  CreateInspectionDto,
  UpdateDraftInspectionDto,
  ScheduleInspectionDto,
  AddCustomCheckpointDto,
  UpdateCheckpointResultDto,
  SubmitEvaluationDto,
  ApproveInspectionDto,
  ConditionalApproveInspectionDto,
  RejectInspectionDto,
  CancelInspectionDto,
  ListInspectionsQueryDto,
} from '../dto/inspection.dto.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../../common/errors/app-error.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export interface HoldPointReleaseResult {
  released: boolean;
  releaseType: 'UNCONDITIONAL' | 'CONDITIONAL' | 'NOT_RELEASED';
  inspectionId: string;
  status: string;
  conditions?: string;
  linkedCapaActionId?: string;
}

export class InspectionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly inspectionRepo: InspectionRepository,
    private readonly auditRepo: QualitySafetyAuditRepository,
    private readonly actionRepo?: ActionRepository
  ) {}

  async create(ctx: QualityRequestContext, dto: CreateInspectionDto): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify Project belongs to Tenant
      const project = await tx.project.findFirst({
        where: { id: dto.projectId, tenantId: ctx.tenantId },
      });
      if (!project) {
        throw new BadRequestError('Invalid projectId: project not found in current tenant');
      }

      // 2. Validate optional relations if provided
      if (dto.wbsNodeId) {
        const wbs = await tx.wbsNode.findFirst({
          where: { id: dto.wbsNodeId, tenantId: ctx.tenantId, projectId: dto.projectId },
        });
        if (!wbs) throw new BadRequestError('Invalid wbsNodeId: node not found in current project/tenant');
      }
      if (dto.taskId) {
        const task = await tx.task.findFirst({
          where: { id: dto.taskId, tenantId: ctx.tenantId, projectId: dto.projectId },
        });
        if (!task) throw new BadRequestError('Invalid taskId: task not found in current project/tenant');
      }
      if (dto.materialId) {
        const mat = await tx.material.findFirst({
          where: { id: dto.materialId, tenantId: ctx.tenantId },
        });
        if (!mat) throw new BadRequestError('Invalid materialId: material not found in current tenant');
      }
      if (dto.goodsReceiptId) {
        const grn = await tx.goodsReceiptNote.findFirst({
          where: { id: dto.goodsReceiptId, tenantId: ctx.tenantId },
        });
        if (!grn) throw new BadRequestError('Invalid goodsReceiptId: GRN not found in current tenant');
      }
      if (dto.equipmentId) {
        const eq = await tx.equipment.findFirst({
          where: { id: dto.equipmentId, tenantId: ctx.tenantId },
        });
        if (!eq) throw new BadRequestError('Invalid equipmentId: equipment not found in current tenant');
      }
      if (dto.originalInspectionRequestId) {
        const orig = await tx.inspectionRequest.findFirst({
          where: { id: dto.originalInspectionRequestId, tenantId: ctx.tenantId },
        });
        if (!orig) throw new BadRequestError('Invalid originalInspectionRequestId: original inspection not found in current tenant');
      }

      // 3. Allocate Sequence Number
      const inspectionNumber = await getNextQualitySafetySequence(ctx.tenantId, 'INSP', tx);

      // 4. Create Inspection Request Header
      const inspection = await this.inspectionRepo.create(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          wbsNodeId: dto.wbsNodeId,
          taskId: dto.taskId,
          materialId: dto.materialId,
          goodsReceiptId: dto.goodsReceiptId,
          equipmentId: dto.equipmentId,
          originalInspectionRequestId: dto.originalInspectionRequestId,
          inspectionNumber,
          inspectionType: dto.inspectionType,
          discipline: dto.discipline,
          title: dto.title,
          location: dto.location,
          element: dto.element,
          gradeOrSpecification: dto.gradeOrSpecification,
          plannedQuantity: dto.plannedQuantity !== undefined && dto.plannedQuantity !== null ? dto.plannedQuantity : null,
          unit: dto.unit,
          isHoldPoint: dto.isHoldPoint ?? false,
          isWitnessPoint: dto.isWitnessPoint ?? false,
          requestedById: ctx.user.id,
          requestedAt: new Date(),
          plannedInspectionAt: dto.plannedInspectionAt ? new Date(dto.plannedInspectionAt) : null,
          status: InspectionStatus.DRAFT,
        },
        tx
      );

      // 5. Instantiate Snapshot Checkpoints from Code Catalog
      const catalog = getChecklistCatalog(dto.inspectionType);
      if (catalog && catalog.length > 0) {
        const itemsData = catalog.map((item) => ({
          tenantId: ctx.tenantId,
          inspectionRequestId: inspection.id,
          sequenceNumber: item.sequenceNumber,
          checkpointCode: item.checkpointCode,
          itemType: item.itemType,
          checkpointCategory: item.checkpointCategory,
          checkpointDescription: item.checkpointDescription,
          acceptanceCriteria: item.acceptanceCriteria,
          isMandatory: item.isMandatory,
          result: ChecklistResult.PENDING,
          unit: item.unit || null,
          testMethod: item.testMethod || null,
        }));

        await this.inspectionRepo.createChecklistItems(itemsData, tx);
      }

      // 6. Record Audit Log
      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: dto.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: inspection.id,
          action: 'CREATE',
          actorId: ctx.user.id,
          newState: inspection as any,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return (await this.inspectionRepo.findById(ctx.tenantId, inspection.id, tx)) as InspectionRequest;
    });
  }

  async getById(ctx: QualityRequestContext, id: string): Promise<InspectionRequest & { checklistItems: InspectionChecklistItem[] }> {
    const inspection = await this.inspectionRepo.findById(ctx.tenantId, id);
    if (!inspection) {
      throw new NotFoundError(`Inspection request with ID '${id}' not found`);
    }
    return inspection;
  }

  async list(
    ctx: QualityRequestContext,
    query: ListInspectionsQueryDto
  ): Promise<{ items: InspectionRequest[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.inspectionRepo.list(
      ctx.tenantId,
      {
        projectId: query.projectId,
        status: query.status,
        inspectionType: query.inspectionType,
        discipline: query.discipline,
        isHoldPoint: query.isHoldPoint,
      },
      { skip, take: limit }
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateDraft(ctx: QualityRequestContext, id: string, dto: UpdateDraftInspectionDto): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      if (existing.status !== InspectionStatus.DRAFT) {
        throw new BadRequestError(`Cannot edit inspection in ${existing.status} status. Only DRAFT inspections may be edited.`);
      }

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        {
          title: dto.title,
          location: dto.location,
          element: dto.element,
          gradeOrSpecification: dto.gradeOrSpecification,
          plannedQuantity: dto.plannedQuantity !== undefined && dto.plannedQuantity !== null ? dto.plannedQuantity : undefined,
          unit: dto.unit,
          isHoldPoint: dto.isHoldPoint,
          isWitnessPoint: dto.isWitnessPoint,
          plannedInspectionAt: dto.plannedInspectionAt ? new Date(dto.plannedInspectionAt) : undefined,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'UPDATE_DRAFT',
          actorId: ctx.user.id,
          previousState: existing as any,
          newState: updated as any,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async addCustomCheckpoint(
    ctx: QualityRequestContext,
    inspectionId: string,
    dto: AddCustomCheckpointDto
  ): Promise<InspectionChecklistItem> {
    return this.prisma.$transaction(async (tx) => {
      const inspection = await this.inspectionRepo.findById(ctx.tenantId, inspectionId, tx);
      if (!inspection) throw new NotFoundError('Inspection request not found');

      if (inspection.status !== InspectionStatus.DRAFT) {
        throw new BadRequestError(`Checklist structure is frozen. Custom checkpoints can only be added when status is DRAFT (current: ${inspection.status}).`);
      }

      const maxSeq = inspection.checklistItems.reduce((max, item) => Math.max(max, item.sequenceNumber), 0);
      const sequenceNumber = maxSeq + 1;

      // Check unique checkpointCode
      const codeExists = inspection.checklistItems.some((item) => item.checkpointCode === dto.checkpointCode);
      if (codeExists) {
        throw new ConflictError(`Checkpoint with code '${dto.checkpointCode}' already exists on this inspection`);
      }

      const item = await this.inspectionRepo.createChecklistItem(
        {
          tenantId: ctx.tenantId,
          inspectionRequestId: inspectionId,
          sequenceNumber,
          checkpointCode: dto.checkpointCode,
          itemType: dto.itemType,
          checkpointCategory: dto.checkpointCategory,
          checkpointDescription: dto.checkpointDescription,
          acceptanceCriteria: dto.acceptanceCriteria || null,
          isMandatory: dto.isMandatory ?? true,
          result: ChecklistResult.PENDING,
          unit: dto.unit || null,
          sampleReference: dto.sampleReference || null,
          testMethod: dto.testMethod || null,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: inspection.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: inspectionId,
          action: 'ADD_CHECKPOINT',
          actorId: ctx.user.id,
          newState: item as any,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return item;
    });
  }

  async submit(ctx: QualityRequestContext, id: string): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      if (existing.status !== InspectionStatus.DRAFT) {
        throw new BadRequestError(`Cannot submit inspection in ${existing.status} status. Expected DRAFT.`);
      }

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        { status: InspectionStatus.SUBMITTED },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'SUBMIT',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: InspectionStatus.SUBMITTED },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async schedule(ctx: QualityRequestContext, id: string, dto: ScheduleInspectionDto): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      if (existing.status !== InspectionStatus.SUBMITTED && existing.status !== InspectionStatus.SCHEDULED) {
        throw new BadRequestError(`Cannot schedule inspection in ${existing.status} status. Expected SUBMITTED or SCHEDULED.`);
      }

      if (dto.inspectedById) {
        const inspector = await tx.user.findFirst({
          where: { id: dto.inspectedById, tenantId: ctx.tenantId },
        });
        if (!inspector) throw new BadRequestError('Invalid inspectedById: user not found in tenant');
      }

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        {
          status: InspectionStatus.SCHEDULED,
          plannedInspectionAt: new Date(dto.plannedInspectionAt),
          inspectedById: dto.inspectedById || existing.inspectedById,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'SCHEDULE',
          actorId: ctx.user.id,
          previousState: { status: existing.status, plannedInspectionAt: existing.plannedInspectionAt },
          newState: { status: InspectionStatus.SCHEDULED, plannedInspectionAt: updated.plannedInspectionAt },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async startInspection(ctx: QualityRequestContext, id: string): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      if (existing.status !== InspectionStatus.SUBMITTED && existing.status !== InspectionStatus.SCHEDULED) {
        throw new BadRequestError(`Cannot start inspection in ${existing.status} status. Expected SUBMITTED or SCHEDULED.`);
      }

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        {
          status: InspectionStatus.IN_PROGRESS,
          inspectedById: existing.inspectedById || ctx.user.id,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'START',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: InspectionStatus.IN_PROGRESS },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async updateCheckpointResult(
    ctx: QualityRequestContext,
    inspectionId: string,
    checkpointId: string,
    dto: UpdateCheckpointResultDto
  ): Promise<InspectionChecklistItem> {
    return this.prisma.$transaction(async (tx) => {
      const inspection = await this.inspectionRepo.findById(ctx.tenantId, inspectionId, tx);
      if (!inspection) throw new NotFoundError('Inspection request not found');

      if (inspection.status !== InspectionStatus.IN_PROGRESS) {
        throw new BadRequestError(`Checkpoint results can only be recorded when inspection is IN_PROGRESS (current: ${inspection.status}).`);
      }

      const item = inspection.checklistItems.find((ci) => ci.id === checkpointId);
      if (!item) throw new NotFoundError(`Checklist item with ID '${checkpointId}' not found on this inspection`);

      // Validation 1: NOT_APPLICABLE on mandatory checkpoint requires remarks >= 5 chars
      if (dto.result === ChecklistResult.NOT_APPLICABLE && item.isMandatory) {
        const remarks = (dto.remarks || '').trim();
        if (remarks.length < 5) {
          throw new BadRequestError('Justification remarks (at least 5 characters) are mandatory when marking a mandatory checkpoint as NOT_APPLICABLE.');
        }
      }

      // Validation 2: Test items require measuredValue
      if (
        (item.itemType === ChecklistItemType.LABORATORY_TEST || item.itemType === ChecklistItemType.FIELD_TEST) &&
        dto.result !== ChecklistResult.NOT_APPLICABLE &&
        (dto.measuredValue === undefined || dto.measuredValue === null)
      ) {
        throw new BadRequestError(`measuredValue is mandatory for test checkpoint '${item.checkpointCode}' (${item.itemType}).`);
      }

      const isConforming = dto.result === ChecklistResult.PASS || dto.result === ChecklistResult.NOT_APPLICABLE;

      const updatedItem = await this.inspectionRepo.updateChecklistItem(
        ctx.tenantId,
        checkpointId,
        {
          result: dto.result,
          measuredValue: dto.measuredValue !== undefined && dto.measuredValue !== null ? dto.measuredValue : null,
          unit: dto.unit !== undefined ? dto.unit : undefined,
          remarks: dto.remarks || null,
          sampleReference: dto.sampleReference || item.sampleReference,
          testMethod: dto.testMethod || item.testMethod,
          isConforming: dto.isConforming !== undefined ? dto.isConforming : isConforming,
          inspectedById: ctx.user.id,
          inspectedAt: new Date(),
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: inspection.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: inspectionId,
          action: 'EVALUATE_CHECKPOINT',
          actorId: ctx.user.id,
          previousState: { checkpointCode: item.checkpointCode, result: item.result },
          newState: { checkpointCode: item.checkpointCode, result: dto.result, measuredValue: dto.measuredValue },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updatedItem;
    });
  }

  async submitEvaluation(ctx: QualityRequestContext, id: string, dto: SubmitEvaluationDto): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      if (existing.status !== InspectionStatus.IN_PROGRESS) {
        throw new BadRequestError(`Cannot submit evaluation in ${existing.status} status. Expected IN_PROGRESS.`);
      }

      // Checkpoint evaluation validation
      const items = existing.checklistItems;
      if (!items || items.length === 0) {
        throw new BadRequestError('Cannot submit evaluation on an inspection with 0 checklist items.');
      }

      // Rule 1: No checkpoint may remain PENDING
      const pendingItems = items.filter((item) => item.result === ChecklistResult.PENDING);
      if (pendingItems.length > 0) {
        const codes = pendingItems.map((i) => i.checkpointCode).join(', ');
        throw new BadRequestError(`Cannot submit evaluation: all checkpoints must be evaluated. Remaining PENDING: ${codes}`);
      }

      // Rule 2: Mandatory NOT_APPLICABLE justification check
      for (const item of items) {
        if (item.isMandatory && item.result === ChecklistResult.NOT_APPLICABLE) {
          const remarks = (item.remarks || '').trim();
          if (remarks.length < 5) {
            throw new BadRequestError(`Mandatory checkpoint '${item.checkpointCode}' marked NOT_APPLICABLE lacks required justification remarks (min 5 chars).`);
          }
        }
      }

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        {
          status: InspectionStatus.PENDING_APPROVAL,
          inspectedById: ctx.user.id,
          inspectedAt: new Date(),
          resultRemarks: dto.resultRemarks || existing.resultRemarks,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'SUBMIT_EVALUATION',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: InspectionStatus.PENDING_APPROVAL },
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async approve(ctx: QualityRequestContext, id: string, dto: ApproveInspectionDto): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      await ActiveApprovalGuard.assertNoActiveCentralApproval(
        tx,
        ctx.tenantId,
        'INSPECTION_REQUEST',
        id
      );

      if (existing.status !== InspectionStatus.PENDING_APPROVAL) {

        throw new BadRequestError(`Cannot approve inspection in ${existing.status} status. Expected PENDING_APPROVAL.`);
      }

      // Segregation of Duties: Requester cannot approve their own inspection
      if (existing.requestedById === ctx.user.id) {
        throw new ForbiddenError('Segregation of Duties violation: Inspection requester cannot approve their own inspection request.');
      }

      // Conformance verification: Unconditional PASS requires all mandatory checkpoints to be PASS or justified N/A
      const mandatoryFails = existing.checklistItems.filter(
        (item) => item.isMandatory && item.result === ChecklistResult.FAIL
      );
      if (mandatoryFails.length > 0) {
        const codes = mandatoryFails.map((i) => i.checkpointCode).join(', ');
        throw new BadRequestError(`Cannot grant unconditional approval: Mandatory checkpoints failed (${codes}). Use conditional approval or reject.`);
      }

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        {
          status: InspectionStatus.PASSED,
          approvedById: ctx.user.id,
          approvedAt: new Date(),
          resultRemarks: dto.approvalRemarks || existing.resultRemarks,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'APPROVE',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: InspectionStatus.PASSED, approvedById: ctx.user.id },
          reason: dto.approvalRemarks || undefined,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async conditionalApprove(
    ctx: QualityRequestContext,
    id: string,
    dto: ConditionalApproveInspectionDto
  ): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      await ActiveApprovalGuard.assertNoActiveCentralApproval(
        tx,
        ctx.tenantId,
        'INSPECTION_REQUEST',
        id
      );

      if (existing.status !== InspectionStatus.PENDING_APPROVAL) {

        throw new BadRequestError(`Cannot conditionally approve inspection in ${existing.status} status. Expected PENDING_APPROVAL.`);
      }

      // Segregation of Duties
      if (existing.requestedById === ctx.user.id) {
        throw new ForbiddenError('Segregation of Duties violation: Inspection requester cannot approve their own inspection request.');
      }

      // Validate Assignee XOR: exactly one of assignedToId or assignedVendorId
      const hasEmp = Boolean(dto.assignedToId);
      const hasVendor = Boolean(dto.assignedVendorId);
      if ((hasEmp && hasVendor) || (!hasEmp && !hasVendor)) {
        throw new BadRequestError('Conditional approval action requires exactly one assignee (assignedToId XOR assignedVendorId).');
      }

      if (dto.assignedToId) {
        const emp = await tx.employee.findFirst({
          where: { id: dto.assignedToId, tenantId: ctx.tenantId },
        });
        if (!emp) throw new BadRequestError('Invalid assignedToId: Employee not found in tenant');
      }
      if (dto.assignedVendorId) {
        const vendor = await tx.vendor.findFirst({
          where: { id: dto.assignedVendorId, tenantId: ctx.tenantId },
        });
        if (!vendor) throw new BadRequestError('Invalid assignedVendorId: Vendor not found in tenant');
      }

      // Create linked condition NCR for inspection condition
      const ncrNumber = await getNextQualitySafetySequence(ctx.tenantId, 'NCR', tx);
      const conditionNcr = await tx.nonConformanceReport.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          inspectionRequestId: existing.id,
          ncrNumber,
          title: `Conditional Approval: ${dto.actionTitle}`,
          description: dto.conditionalRemarks,
          location: existing.location,
          category: 'WORKMANSHIP',
          severity: 'MINOR',
          status: 'ACTION_REQUIRED',
          responsibleParty: dto.assignedVendorId ? 'SUBCONTRACTOR' : 'INTERNAL',
          responsibleVendorId: dto.assignedVendorId || null,
          raisedById: ctx.user.id,
          targetClosureDate: new Date(dto.dueDate),
        },
      });

      // Create linked QualitySafetyAction (CAPA)
      const actionNumber = await getNextQualitySafetySequence(ctx.tenantId, 'ACT', tx);
      const action = await tx.qualitySafetyAction.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          ncrId: conditionNcr.id,
          actionNumber,
          title: dto.actionTitle,
          actionType: ActionType.INSPECTION_HOLD_CONDITION,
          description: dto.actionDescription,
          assignedToId: dto.assignedToId || null,
          assignedVendorId: dto.assignedVendorId || null,
          priority: dto.priority || ActionPriority.HIGH,
          status: ActionStatus.OPEN,
          dueDate: new Date(dto.dueDate),
          createdById: ctx.user.id,
        },
      });

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        {
          status: InspectionStatus.CONDITIONALLY_PASSED,
          conditionalRemarks: dto.conditionalRemarks,
          conditionalActionId: action.id,
          approvedById: ctx.user.id,
          approvedAt: new Date(),
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'CONDITIONAL_APPROVE',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: InspectionStatus.CONDITIONALLY_PASSED, conditionalActionId: action.id },
          reason: dto.conditionalRemarks,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async reject(ctx: QualityRequestContext, id: string, dto: RejectInspectionDto): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      if (existing.status !== InspectionStatus.PENDING_APPROVAL) {
        throw new BadRequestError(`Cannot reject inspection in ${existing.status} status. Expected PENDING_APPROVAL.`);
      }

      // Segregation of Duties
      if (existing.requestedById === ctx.user.id) {
        throw new ForbiddenError('Segregation of Duties violation: Inspection requester cannot reject their own inspection request.');
      }

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        {
          status: InspectionStatus.REJECTED,
          approvedById: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: dto.rejectionReason,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'REJECT',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: InspectionStatus.REJECTED, rejectionReason: dto.rejectionReason },
          reason: dto.rejectionReason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async cancel(ctx: QualityRequestContext, id: string, dto: CancelInspectionDto): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!existing) throw new NotFoundError('Inspection request not found');

      if (
        existing.status !== InspectionStatus.DRAFT &&
        existing.status !== InspectionStatus.SUBMITTED &&
        existing.status !== InspectionStatus.SCHEDULED
      ) {
        throw new BadRequestError(`Cannot cancel inspection in ${existing.status} status. Only DRAFT, SUBMITTED, or SCHEDULED inspections may be cancelled.`);
      }

      const updated = await this.inspectionRepo.update(
        ctx.tenantId,
        id,
        {
          status: InspectionStatus.CANCELLED,
          rejectionReason: dto.reason,
        },
        tx
      );

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: existing.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: id,
          action: 'CANCEL',
          actorId: ctx.user.id,
          previousState: { status: existing.status },
          newState: { status: InspectionStatus.CANCELLED },
          reason: dto.reason,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return updated;
    });
  }

  async reinspect(ctx: QualityRequestContext, id: string): Promise<InspectionRequest> {
    return this.prisma.$transaction(async (tx) => {
      const original = await this.inspectionRepo.findById(ctx.tenantId, id, tx);
      if (!original) throw new NotFoundError('Original inspection request not found');

      if (original.status !== InspectionStatus.REJECTED && original.status !== InspectionStatus.CANCELLED) {
        throw new BadRequestError(`Reinspection is only permitted for REJECTED or CANCELLED inspections (current: ${original.status}).`);
      }

      // Allocate fresh sequence number
      const inspectionNumber = await getNextQualitySafetySequence(ctx.tenantId, 'INSP', tx);

      // Create new Inspection snapshot with provenance link
      const newInspection = await this.inspectionRepo.create(
        {
          tenantId: ctx.tenantId,
          projectId: original.projectId,
          wbsNodeId: original.wbsNodeId,
          taskId: original.taskId,
          materialId: original.materialId,
          goodsReceiptId: original.goodsReceiptId,
          equipmentId: original.equipmentId,
          originalInspectionRequestId: original.id,
          inspectionNumber,
          inspectionType: original.inspectionType,
          discipline: original.discipline,
          title: `Reinspection: ${original.title}`,
          location: original.location,
          element: original.element,
          gradeOrSpecification: original.gradeOrSpecification,
          plannedQuantity: original.plannedQuantity,
          unit: original.unit,
          isHoldPoint: original.isHoldPoint,
          isWitnessPoint: original.isWitnessPoint,
          requestedById: ctx.user.id,
          requestedAt: new Date(),
          status: InspectionStatus.DRAFT,
        },
        tx
      );

      // Re-instantiate fresh catalog checklist items
      const catalog = getChecklistCatalog(original.inspectionType);
      if (catalog && catalog.length > 0) {
        const itemsData = catalog.map((item) => ({
          tenantId: ctx.tenantId,
          inspectionRequestId: newInspection.id,
          sequenceNumber: item.sequenceNumber,
          checkpointCode: item.checkpointCode,
          itemType: item.itemType,
          checkpointCategory: item.checkpointCategory,
          checkpointDescription: item.checkpointDescription,
          acceptanceCriteria: item.acceptanceCriteria,
          isMandatory: item.isMandatory,
          result: ChecklistResult.PENDING,
          unit: item.unit || null,
          testMethod: item.testMethod || null,
        }));

        await this.inspectionRepo.createChecklistItems(itemsData, tx);
      }

      await this.auditRepo.record(
        {
          tenantId: ctx.tenantId,
          projectId: original.projectId,
          entityType: 'INSPECTION_REQUEST',
          entityId: newInspection.id,
          action: 'REINSPECT',
          actorId: ctx.user.id,
          previousState: { originalInspectionId: original.id },
          newState: { newInspectionId: newInspection.id, inspectionNumber },
          reason: `Reinspection of failed inspection ${original.inspectionNumber}`,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return (await this.inspectionRepo.findById(ctx.tenantId, newInspection.id, tx)) as InspectionRequest;
    });
  }

  async assertHoldPointReleased(
    ctx: QualityRequestContext,
    inspectionRequestId: string,
    tx?: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]
  ): Promise<HoldPointReleaseResult> {
    const client = tx || this.prisma;
    const inspection = await client.inspectionRequest.findFirst({
      where: { id: inspectionRequestId, tenantId: ctx.tenantId },
    });
    if (!inspection) {
      throw new NotFoundError(`Inspection request with ID '${inspectionRequestId}' not found in current tenant`);
    }

    if (!inspection.isHoldPoint) {
      throw new BadRequestError(`Inspection request '${inspectionRequestId}' is not a designated Hold Point`);
    }

    if (inspection.status === InspectionStatus.PASSED) {
      return {
        released: true,
        releaseType: 'UNCONDITIONAL',
        inspectionId: inspection.id,
        status: inspection.status,
      };
    }

    if (inspection.status === InspectionStatus.CONDITIONALLY_PASSED) {
      return {
        released: true,
        releaseType: 'CONDITIONAL',
        inspectionId: inspection.id,
        status: inspection.status,
        conditions: inspection.conditionalRemarks ?? undefined,
        linkedCapaActionId: inspection.conditionalActionId ?? undefined,
      };
    }

    return {
      released: false,
      releaseType: 'NOT_RELEASED',
      inspectionId: inspection.id,
      status: inspection.status,
    };
  }
}

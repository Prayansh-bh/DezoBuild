import { PrismaClient } from '@prisma/client';
import { EquipmentRepository } from '../repositories/equipment.repository.js';
import { AssignmentRepository } from '../repositories/assignment.repository.js';
import { EquipmentAuditRepository } from '../repositories/equipment-audit.repository.js';
import {
  CreateAssignmentDto,
  ReturnAssignmentDto,
  ListAssignmentsQueryDto,
} from '../dto/assignment.dto.js';
import { EquipmentRequestContext } from '../constants/equipment.constants.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../common/errors/index.js';

export class AssignmentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly equipmentRepo: EquipmentRepository,
    private readonly assignmentRepo: AssignmentRepository,
    private readonly auditRepo: EquipmentAuditRepository
  ) {}

  async assign(ctx: EquipmentRequestContext, equipmentId: string, dto: CreateAssignmentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock Equipment row
      const lockedEquipment = await this.equipmentRepo.lockById(ctx.tenantId, equipmentId, tx);
      if (!lockedEquipment) {
        throw new NotFoundError('Equipment not found');
      }

      // 2. Verify Equipment status is AVAILABLE
      if (lockedEquipment.status !== 'AVAILABLE') {
        throw new BadRequestError(
          `Equipment is not available for assignment. Current status: ${lockedEquipment.status}`
        );
      }

      // 3. Verify Project belongs to same tenant
      const project = await tx.project.findFirst({
        where: { id: dto.projectId, tenantId: ctx.tenantId },
      });
      if (!project) {
        throw new BadRequestError('Invalid projectId: project not found in current tenant');
      }

      // 4. Verify no active assignment exists
      const activeAssignment = await this.assignmentRepo.findActiveByEquipmentId(ctx.tenantId, equipmentId, tx);
      if (activeAssignment) {
        throw new ConflictError('Equipment already has an active assignment');
      }

      // 5. Create assignment ledger row
      const assignment = await this.assignmentRepo.create(
        ctx.tenantId,
        equipmentId,
        ctx.user.id,
        dto,
        tx
      );

      // 6. Update Equipment status to ASSIGNED and synchronize currentProjectId projection
      await this.equipmentRepo.updateStatus(ctx.tenantId, equipmentId, 'ASSIGNED', dto.projectId, tx);

      // 7. Write audit log
      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId,
          entityType: 'ASSIGNMENT',
          entityId: assignment.id,
          action: 'ASSIGN',
          actorId: ctx.user.id,
          newState: assignment,
          reason: dto.purpose ?? `Assigned to project ${project.name}`,
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return assignment;
    });
  }

  async returnAssignment(ctx: EquipmentRequestContext, assignmentId: string, dto: ReturnAssignmentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock assignment row
      const lockedAssignment = await this.assignmentRepo.lockById(ctx.tenantId, assignmentId, tx);
      if (!lockedAssignment) {
        throw new NotFoundError('Equipment assignment not found');
      }

      if (lockedAssignment.status !== 'ACTIVE') {
        throw new BadRequestError(`Assignment is not active. Current status: ${lockedAssignment.status}`);
      }

      const equipmentId = lockedAssignment.equipment_id;

      // 2. Lock equipment row
      const lockedEquipment = await this.equipmentRepo.lockById(ctx.tenantId, equipmentId, tx);
      if (!lockedEquipment) {
        throw new NotFoundError('Equipment not found');
      }

      // 3. Complete assignment
      const completed = await this.assignmentRepo.completeAssignment(ctx.tenantId, assignmentId, dto, tx);

      // 4. Synchronize Equipment state: clear currentProjectId projection and reset status to AVAILABLE
      // If equipment was BREAKDOWN or UNDER_MAINTENANCE during deployment, preserve maintenance status, otherwise AVAILABLE
      const nextStatus = (lockedEquipment.status === 'BREAKDOWN' || lockedEquipment.status === 'UNDER_MAINTENANCE')
        ? lockedEquipment.status
        : 'AVAILABLE';

      await this.equipmentRepo.updateStatus(ctx.tenantId, equipmentId, nextStatus, null, tx);

      // 5. Write audit log
      await this.auditRepo.log(
        {
          tenantId: ctx.tenantId,
          equipmentId,
          entityType: 'ASSIGNMENT',
          entityId: assignmentId,
          action: 'DEMOBILIZE',
          actorId: ctx.user.id,
          previousState: { status: 'ACTIVE', currentProjectId: lockedAssignment.project_id },
          newState: completed,
          reason: dto.notes ?? 'Assignment returned / demobilized',
          ipAddress: ctx.ipAddress,
        },
        tx
      );

      return completed;
    });
  }

  async listAssignments(ctx: EquipmentRequestContext, equipmentId: string, query: ListAssignmentsQueryDto) {
    const equipment = await this.equipmentRepo.findById(ctx.tenantId, equipmentId);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }
    return this.assignmentRepo.listByEquipmentId(ctx.tenantId, equipmentId, query);
  }
}

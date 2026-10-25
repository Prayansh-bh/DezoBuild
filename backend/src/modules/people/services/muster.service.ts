import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../common/errors/index.js';
import { PeopleRequestContext } from '../constants/people.constants.js';
import { CreateMusterDto, ApproveMusterDto, ListMustersQueryDto } from '../dto/muster.dto.js';
import { MusterRepository } from '../repositories/muster.repository.js';
import { ContractorRepository } from '../repositories/contractor.repository.js';
import { PeopleAuditRepository } from '../repositories/people-audit.repository.js';
import { ActiveApprovalGuard } from '../../approvals/helpers/active-approval.guard.js';


export class MusterService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly musterRepo: MusterRepository,
    private readonly contractorRepo: ContractorRepository,
    private readonly auditRepo: PeopleAuditRepository
  ) {}

  async createMuster(context: PeopleRequestContext, dto: CreateMusterDto) {
    // 1. Validate Project
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId: context.tenantId },
    });
    if (!project) {
      throw new NotFoundError(`Project '${dto.projectId}' not found in tenant`);
    }

    // 2. Validate Contractor
    const contractor = await this.contractorRepo.findById(context.tenantId, dto.contractorId);
    if (!contractor) {
      throw new NotFoundError(`Labour contractor '${dto.contractorId}' not found in tenant`);
    }

    // 3. Validate Shift if provided
    if (dto.shiftId) {
      const shift = await this.prisma.shiftMaster.findFirst({
        where: { id: dto.shiftId, tenantId: context.tenantId },
      });
      if (!shift) {
        throw new NotFoundError(`Shift '${dto.shiftId}' not found in tenant`);
      }
    }

    // 4. Duplicate check
    const musterDate = new Date(`${dto.musterDate}T00:00:00.000Z`);
    const existing = await this.musterRepo.findExistingMuster(
      context.tenantId,
      dto.projectId,
      dto.contractorId,
      musterDate,
      dto.shiftId
    );
    if (existing) {
      throw new ConflictError('A muster roll record already exists for this contractor, project, date and shift');
    }

    const muster = await this.musterRepo.create(context.tenantId, context.user.id, dto);

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'LABOUR_MUSTER',
      entityId: muster.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: muster,
      ipAddress: context.ipAddress,
    });

    return muster;
  }

  async getMusterById(context: PeopleRequestContext, id: string) {
    const muster = await this.musterRepo.findById(context.tenantId, id);
    if (!muster) {
      throw new NotFoundError(`Labour muster record '${id}' not found`);
    }
    return muster;
  }

  async approveMuster(context: PeopleRequestContext, id: string, dto?: ApproveMusterDto) {
    const muster = await this.getMusterById(context, id);

    await ActiveApprovalGuard.assertNoActiveCentralApproval(
      this.prisma,
      context.tenantId,
      'LABOUR_MUSTER_RECORD',
      id
    );

    if (muster.status === 'APPROVED') {

      return muster;
    }

    // Segregation of Duties: Submitter/recorder cannot approve their own muster
    if (muster.recordedById === context.user.id) {
      throw new ForbiddenError('Segregation of Duties violation: Submitter cannot approve their own muster record');
    }

    const approved = await this.musterRepo.updateStatus(
      context.tenantId,
      id,
      'APPROVED',
      context.user.id
    );

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'LABOUR_MUSTER',
      entityId: id,
      action: 'APPROVED',
      actorId: context.user.id,
      previousState: { status: muster.status },
      newState: { status: 'APPROVED' },
      reason: dto?.remarks,
      ipAddress: context.ipAddress,
    });

    return approved;
  }

  async listMusters(context: PeopleRequestContext, query: ListMustersQueryDto) {
    return this.musterRepo.list(context.tenantId, query);
  }
}

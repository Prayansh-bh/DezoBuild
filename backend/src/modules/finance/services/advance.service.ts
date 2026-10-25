import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../common/errors/index.js';
import { FinanceRequestContext } from '../constants/finance.constants.js';
import {
  CreateAdvanceRecordDto,
  ListAdvanceRecordsQueryDto,
} from '../dto/advance.dto.js';
import { AdvanceRepository } from '../repositories/advance.repository.js';
import { FinanceSequenceRepository } from '../repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from '../repositories/finance-audit.repository.js';

export class AdvanceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly advanceRepo: AdvanceRepository,
    private readonly sequenceRepo: FinanceSequenceRepository,
    private readonly auditRepo: FinanceAuditRepository
  ) {}

  async createAdvance(context: FinanceRequestContext, dto: CreateAdvanceRecordDto) {
    // 1. Verify Project
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, tenantId: context.tenantId },
    });
    if (!project) throw new NotFoundError(`Project '${dto.projectId}' not found`);

    // 2. Verify Beneficiary
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, tenantId: context.tenantId },
      });
      if (!vendor) throw new NotFoundError(`Vendor '${dto.vendorId}' not found`);
    }

    if (dto.employeeId) {
      const employee = await this.prisma.user.findFirst({
        where: { id: dto.employeeId, tenantId: context.tenantId },
      });
      if (!employee) throw new NotFoundError(`Employee '${dto.employeeId}' not found`);
    }

    // 3. Generate Sequence
    const advanceNumber = await this.sequenceRepo.getNextSequence(context.tenantId, 'ADV');

    // 4. Create Advance
    const advance = await this.advanceRepo.createAdvance(
      context.tenantId,
      advanceNumber,
      dto
    );

    // 5. Audit Log
    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'ADVANCE',
      entityId: advance.id,
      action: 'DISBURSED',
      actorId: context.user.id,
      newState: 'DISBURSED',
      ipAddress: context.ipAddress,
    });

    return advance;
  }

  async getAdvanceById(context: FinanceRequestContext, advanceId: string) {
    const advance = await this.advanceRepo.findAdvanceById(context.tenantId, advanceId);
    if (!advance) {
      throw new NotFoundError(`Advance record '${advanceId}' not found`);
    }
    return advance;
  }

  async listAdvances(context: FinanceRequestContext, query: ListAdvanceRecordsQueryDto, allowedProjectIds?: string[]) {
    return this.advanceRepo.listAdvances(context.tenantId, query, allowedProjectIds);
  }
}

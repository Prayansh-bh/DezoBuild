import { PrismaClient } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { PeopleRequestContext } from '../constants/people.constants.js';
import { CreateShiftDto, ListShiftsQueryDto } from '../dto/shift.dto.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import { PeopleAuditRepository } from '../repositories/people-audit.repository.js';

export class ShiftService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly shiftRepo: ShiftRepository,
    private readonly auditRepo: PeopleAuditRepository
  ) {}

  async createShift(context: PeopleRequestContext, dto: CreateShiftDto) {
    const existing = await this.shiftRepo.findByCode(context.tenantId, dto.code);
    if (existing) {
      throw new ConflictError(`Shift with code '${dto.code}' already exists`);
    }

    const shift = await this.shiftRepo.create(context.tenantId, dto);

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'SHIFT',
      entityId: shift.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: shift,
      ipAddress: context.ipAddress,
    });

    return shift;
  }

  async getShiftById(context: PeopleRequestContext, id: string) {
    const shift = await this.shiftRepo.findById(context.tenantId, id);
    if (!shift) {
      throw new NotFoundError(`Shift '${id}' not found`);
    }
    return shift;
  }

  async listShifts(context: PeopleRequestContext, query: ListShiftsQueryDto) {
    return this.shiftRepo.list(context.tenantId, query);
  }
}

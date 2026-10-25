import { PrismaClient } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { PeopleRequestContext } from '../constants/people.constants.js';
import { CreateHolidayDto, ListHolidaysQueryDto } from '../dto/holiday.dto.js';
import { HolidayRepository } from '../repositories/holiday.repository.js';
import { PeopleAuditRepository } from '../repositories/people-audit.repository.js';

export class HolidayService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly holidayRepo: HolidayRepository,
    private readonly auditRepo: PeopleAuditRepository
  ) {}

  async createHoliday(context: PeopleRequestContext, dto: CreateHolidayDto) {
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId: context.tenantId },
      });
      if (!branch) {
        throw new NotFoundError(`Branch '${dto.branchId}' not found in tenant`);
      }
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId: context.tenantId },
      });
      if (!project) {
        throw new NotFoundError(`Project '${dto.projectId}' not found in tenant`);
      }
    }

    const holidayDate = new Date(`${dto.holidayDate}T00:00:00.000Z`);
    const duplicate = await this.holidayRepo.findDuplicate(
      context.tenantId,
      holidayDate,
      dto.branchId,
      dto.projectId
    );
    if (duplicate) {
      throw new ConflictError('A holiday entry already exists for this scope and date');
    }

    const holiday = await this.holidayRepo.create(context.tenantId, dto);

    await this.auditRepo.log({
      tenantId: context.tenantId,
      entityType: 'HOLIDAY_CALENDAR',
      entityId: holiday.id,
      action: 'CREATED',
      actorId: context.user.id,
      newState: holiday,
      ipAddress: context.ipAddress,
    });

    return holiday;
  }

  async listHolidays(context: PeopleRequestContext, query: ListHolidaysQueryDto) {
    return this.holidayRepo.list(context.tenantId, query);
  }
}

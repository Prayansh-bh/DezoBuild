import { PrismaClient, Prisma } from '@prisma/client';
import { CreateHolidayDto, ListHolidaysQueryDto } from '../dto/holiday.dto.js';

export class HolidayRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, dto: CreateHolidayDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.holidayCalendar.create({
      data: {
        tenantId,
        holidayDate: new Date(dto.holidayDate),
        name: dto.name,
        isMandatory: dto.isMandatory ?? true,
        branchId: dto.branchId ?? undefined,
        projectId: dto.projectId ?? undefined,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findDuplicate(
    tenantId: string,
    holidayDate: Date,
    branchId?: string | null,
    projectId?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.holidayCalendar.findFirst({
      where: {
        tenantId,
        holidayDate,
        branchId: branchId ? branchId : null,
        projectId: projectId ? projectId : null,
      },
    });
  }

  async isHoliday(
    tenantId: string,
    date: Date,
    branchId?: string | null,
    projectId?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.holidayCalendar.findFirst({
      where: {
        tenantId,
        holidayDate: date,
        OR: [
          { branchId: null, projectId: null },
          ...(branchId ? [{ branchId, projectId: null }] : []),
          ...(projectId ? [{ projectId }] : []),
        ],
      },
    });
  }

  async list(tenantId: string, query: ListHolidaysQueryDto) {
    const where: Prisma.HolidayCalendarWhereInput = {
      tenantId,
      ...(query.branchId && { branchId: query.branchId }),
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.year && {
        holidayDate: {
          gte: new Date(`${query.year}-01-01`),
          lte: new Date(`${query.year}-12-31`),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.holidayCalendar.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { holidayDate: 'asc' },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          project: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.holidayCalendar.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}

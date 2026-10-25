import { PrismaClient, Prisma } from '@prisma/client';
import { CreateShiftDto, ListShiftsQueryDto } from '../dto/shift.dto.js';

export class ShiftRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, dto: CreateShiftDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.shiftMaster.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        gracePeriodMinutes: dto.gracePeriodMinutes ?? 15,
        halfDayThresholdMinutes: dto.halfDayThresholdMinutes ?? 240,
        fullDayThresholdMinutes: dto.fullDayThresholdMinutes ?? 480,
        isNightShift: dto.isNightShift ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.shiftMaster.findFirst({
      where: { id, tenantId },
    });
  }

  async findByCode(tenantId: string, code: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.shiftMaster.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
    });
  }

  async list(tenantId: string, query: ListShiftsQueryDto) {
    const where: Prisma.ShiftMasterWhereInput = {
      tenantId,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [items, total] = await Promise.all([
      this.prisma.shiftMaster.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { code: 'asc' },
      }),
      this.prisma.shiftMaster.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}

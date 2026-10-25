import { PrismaClient, Prisma } from '@prisma/client';
import { CreateMusterDto, ListMustersQueryDto } from '../dto/muster.dto.js';

export class MusterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, recordedById: string, dto: CreateMusterDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const skilled = dto.skilledCount ?? 0;
    const semiSkilled = dto.semiSkilledCount ?? 0;
    const unskilled = dto.unskilledCount ?? 0;
    const supervisor = dto.supervisorCount ?? 0;
    const totalHeadcount = skilled + semiSkilled + unskilled + supervisor;

    return client.labourMusterRecord.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        contractorId: dto.contractorId,
        shiftId: dto.shiftId ?? undefined,
        musterDate: new Date(dto.musterDate),
        skilledCount: skilled,
        semiSkilledCount: semiSkilled,
        unskilledCount: unskilled,
        supervisorCount: supervisor,
        totalHeadcount,
        regularHours: new Prisma.Decimal(dto.regularHours ?? 8),
        overtimeHours: new Prisma.Decimal(dto.overtimeHours ?? 0),
        remarks: dto.remarks ?? undefined,
        status: dto.status ?? 'DRAFT',
        recordedById,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        contractor: { select: { id: true, name: true, code: true, trade: true } },
        shift: true,
        recordedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.labourMusterRecord.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true, code: true } },
        contractor: { select: { id: true, name: true, code: true, trade: true } },
        shift: true,
        recordedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findExistingMuster(
    tenantId: string,
    projectId: string,
    contractorId: string,
    musterDate: Date,
    shiftId?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.labourMusterRecord.findFirst({
      where: {
        tenantId,
        projectId,
        contractorId,
        musterDate,
        shiftId: shiftId ? shiftId : null,
      },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    approvedById: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.labourMusterRecord.update({
      where: { id },
      data: {
        status,
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        contractor: { select: { id: true, name: true, code: true, trade: true } },
        shift: true,
        recordedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async list(tenantId: string, query: ListMustersQueryDto) {
    const where: Prisma.LabourMusterRecordWhereInput = {
      tenantId,
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.contractorId && { contractorId: query.contractorId }),
      ...(query.status && { status: query.status }),
      ...(query.startDate && query.endDate && {
        musterDate: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.labourMusterRecord.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ musterDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          project: { select: { id: true, name: true, code: true } },
          contractor: { select: { id: true, name: true, code: true, trade: true } },
          shift: true,
          recordedBy: { select: { id: true, fullName: true, email: true } },
          approvedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.labourMusterRecord.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}

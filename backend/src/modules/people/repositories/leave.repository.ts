import { PrismaClient, Prisma } from '@prisma/client';
import { CreateLeaveDto, ListLeavesQueryDto } from '../dto/leave.dto.js';

export class LeaveRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, employeeId: string, dto: CreateLeaveDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalDays = dto.totalDays ?? diffDays;

    return client.leaveRecord.create({
      data: {
        tenantId,
        employeeId,
        leaveType: dto.leaveType,
        startDate: start,
        endDate: end,
        totalDays: new Prisma.Decimal(totalDays),
        reason: dto.reason,
        status: 'SUBMITTED',
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.leaveRecord.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findOverlappingLeave(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.leaveRecord.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: ['SUBMITTED', 'APPROVED'] },
        ...(excludeId && { id: { not: excludeId } }),
        startDate: { lte: endDate },
        endDate: { gte: startDate },
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
    return client.leaveRecord.update({
      where: { id },
      data: {
        status,
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async list(tenantId: string, query: ListLeavesQueryDto) {
    const where: Prisma.LeaveRecordWhereInput = {
      tenantId,
      ...(query.employeeId && { employeeId: query.employeeId }),
      ...(query.leaveType && { leaveType: query.leaveType }),
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.leaveRecord.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { startDate: 'desc' },
        include: {
          employee: { select: { id: true, fullName: true, employeeNumber: true } },
          approvedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.leaveRecord.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}

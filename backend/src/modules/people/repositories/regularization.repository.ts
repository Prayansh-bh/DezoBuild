import { PrismaClient, Prisma } from '@prisma/client';
import { CreateRegularizationDto } from '../dto/attendance.dto.js';
import { ConflictError } from '../../../common/errors/app-error.js';

export class RegularizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    tenantId: string,
    employeeId: string,
    requestedById: string,
    attendanceRecordId: string | null,
    dto: CreateRegularizationDto,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.attendanceRegularization.create({
      data: {
        tenantId,
        employeeId,
        attendanceRecordId: attendanceRecordId ?? undefined,
        requestedDate: new Date(dto.requestedDate),
        requestedCheckIn: dto.requestedCheckIn ? new Date(dto.requestedCheckIn) : undefined,
        requestedCheckOut: dto.requestedCheckOut ? new Date(dto.requestedCheckOut) : undefined,
        requestedStatus: dto.requestedStatus ?? 'PRESENT',
        reason: dto.reason,
        status: 'SUBMITTED',
        requestedById,
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.attendanceRegularization.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        attendanceRecord: true,
      },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    approvedById: string,
    rejectionReason?: string,
    expectedStatus?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    if (expectedStatus) {
      const result = await client.attendanceRegularization.updateMany({
        where: { id, tenantId, status: expectedStatus },
        data: {
          status,
          approvedById,
          approvedAt: new Date(),
          rejectionReason: rejectionReason ?? undefined,
        },
      });
      if (result.count === 0) {
        throw new ConflictError(`Attendance regularization is no longer in '${expectedStatus}' status`);
      }
      return this.findById(tenantId, id, client);
    }

    return client.attendanceRegularization.update({
      where: { id },
      data: {
        status,
        approvedById,
        approvedAt: new Date(),
        rejectionReason: rejectionReason ?? undefined,
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }
}

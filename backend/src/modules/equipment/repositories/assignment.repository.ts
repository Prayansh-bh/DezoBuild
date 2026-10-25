import { PrismaClient, Prisma } from '@prisma/client';
import { CreateAssignmentDto, ReturnAssignmentDto, ListAssignmentsQueryDto } from '../dto/assignment.dto.js';

export class AssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    tenantId: string,
    equipmentId: string,
    assignedById: string,
    dto: CreateAssignmentDto,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.equipmentAssignment.create({
      data: {
        tenantId,
        equipmentId,
        projectId: dto.projectId,
        assignedFrom: new Date(dto.assignedFrom),
        assignedTo: dto.assignedTo ? new Date(dto.assignedTo) : undefined,
        status: 'ACTIVE',
        purpose: dto.purpose ?? undefined,
        assignedById,
        notes: dto.notes ?? undefined,
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
        project: { select: { id: true, name: true, code: true } },
        assignedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipmentAssignment.findFirst({
      where: { id, tenantId },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
        project: { select: { id: true, name: true, code: true } },
        assignedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findActiveByEquipmentId(tenantId: string, equipmentId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipmentAssignment.findFirst({
      where: { tenantId, equipmentId, status: 'ACTIVE' },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
        project: { select: { id: true, name: true, code: true } },
        assignedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async lockById(tenantId: string, id: string, tx: Prisma.TransactionClient) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    const rows = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM "equipment_assignments" WHERE "id" = $1::uuid AND "tenant_id" = $2::uuid FOR UPDATE`,
      id,
      tenantId
    );
    return rows[0] || null;
  }

  async completeAssignment(
    tenantId: string,
    id: string,
    dto: ReturnAssignmentDto,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.equipmentAssignment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualReturnedAt: dto.actualReturnedAt ? new Date(dto.actualReturnedAt) : new Date(),
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
        project: { select: { id: true, name: true, code: true } },
        assignedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async listByEquipmentId(tenantId: string, equipmentId: string, query: ListAssignmentsQueryDto) {
    const where: Prisma.EquipmentAssignmentWhereInput = {
      tenantId,
      equipmentId,
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.equipmentAssignment.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { assignedFrom: 'desc' },
        include: {
          equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
          project: { select: { id: true, name: true, code: true } },
          assignedBy: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.equipmentAssignment.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}

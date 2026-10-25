import { PrismaClient, Prisma } from '@prisma/client';
import { CreateFuelLogDto, ListFuelLogsQueryDto } from '../dto/fuel-log.dto.js';

export class FuelLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    tenantId: string,
    equipmentId: string,
    dispensedById: string,
    dto: CreateFuelLogDto,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.equipmentFuelLog.create({
      data: {
        tenantId,
        equipmentId,
        projectId: dto.projectId,
        storeId: dto.storeId ?? undefined,
        materialIssueId: dto.materialIssueId ?? undefined,
        slipNumber: dto.slipNumber,
        idempotencyKey: dto.idempotencyKey ?? undefined,
        fuelDate: new Date(dto.fuelDate),
        fuelType: dto.fuelType ?? 'DIESEL',
        quantityLiters: new Prisma.Decimal(dto.quantityLiters),
        unitRate: new Prisma.Decimal(dto.unitRate ?? 0),
        totalCost: new Prisma.Decimal(dto.totalCost ?? 0),
        meterReading: new Prisma.Decimal(dto.meterReading),
        source: dto.source ?? 'INTERNAL_STORE',
        supplierVendorId: dto.supplierVendorId ?? undefined,
        invoiceNumber: dto.invoiceNumber ?? undefined,
        dispensedById,
        remarks: dto.remarks ?? undefined,
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, fuelType: true } },
        project: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true, code: true } },
        materialIssue: { select: { id: true, issueNumber: true, status: true } },
        supplierVendor: { select: { id: true, name: true, code: true } },
        dispensedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipmentFuelLog.findFirst({
      where: { id, tenantId },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, fuelType: true } },
        project: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true, code: true } },
        materialIssue: { select: { id: true, issueNumber: true, status: true } },
        supplierVendor: { select: { id: true, name: true, code: true } },
        dispensedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findBySlipNumber(tenantId: string, slipNumber: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipmentFuelLog.findUnique({
      where: {
        tenantId_slipNumber: {
          tenantId,
          slipNumber,
        },
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, fuelType: true } },
        project: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true, code: true } },
        materialIssue: { select: { id: true, issueNumber: true, status: true } },
        supplierVendor: { select: { id: true, name: true, code: true } },
        dispensedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipmentFuelLog.findFirst({
      where: {
        tenantId,
        idempotencyKey,
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, fuelType: true } },
        project: { select: { id: true, name: true, code: true } },
        store: { select: { id: true, name: true, code: true } },
        materialIssue: { select: { id: true, issueNumber: true, status: true } },
        supplierVendor: { select: { id: true, name: true, code: true } },
        dispensedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async listByEquipmentId(tenantId: string, equipmentId: string, query: ListFuelLogsQueryDto) {
    const where: Prisma.EquipmentFuelLogWhereInput = {
      tenantId,
      equipmentId,
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.fuelDate && { fuelDate: new Date(query.fuelDate) }),
      ...(query.source && { source: query.source }),
    };

    const [items, total] = await Promise.all([
      this.prisma.equipmentFuelLog.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ fuelDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          equipment: { select: { id: true, equipmentCode: true, name: true, fuelType: true } },
          project: { select: { id: true, name: true, code: true } },
          store: { select: { id: true, name: true, code: true } },
          materialIssue: { select: { id: true, issueNumber: true, status: true } },
          supplierVendor: { select: { id: true, name: true, code: true } },
          dispensedBy: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.equipmentFuelLog.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}

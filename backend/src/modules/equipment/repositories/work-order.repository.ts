import { PrismaClient, Prisma } from '@prisma/client';
import { CreateWorkOrderDto, CompleteWorkOrderDto, ListWorkOrdersQueryDto } from '../dto/maintenance.dto.js';

export class WorkOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    tenantId: string,
    workOrderNumber: string,
    reportedById: string,
    dto: CreateWorkOrderDto,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.maintenanceWorkOrder.create({
      data: {
        tenantId,
        equipmentId: dto.equipmentId,
        projectId: dto.projectId ?? undefined,
        scheduleId: dto.scheduleId ?? undefined,
        workOrderNumber,
        category: dto.category ?? 'PREVENTIVE',
        priority: dto.priority ?? 'MEDIUM',
        status: dto.status ?? 'OPEN',
        reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : new Date(),
        reportedById,
        breakdownStartAt: dto.breakdownStartAt ? new Date(dto.breakdownStartAt) : undefined,
        breakdownEndAt: dto.breakdownEndAt ? new Date(dto.breakdownEndAt) : undefined,
        downtimeHours: new Prisma.Decimal(dto.downtimeHours ?? 0),
        symptoms: dto.symptoms ?? undefined,
        rootCause: dto.rootCause ?? undefined,
        workDone: dto.workDone ?? undefined,
        serviceProviderType: dto.serviceProviderType ?? 'INTERNAL',
        serviceVendorId: dto.serviceVendorId ?? undefined,
        technicianName: dto.technicianName ?? undefined,
        technicianPhone: dto.technicianPhone ?? undefined,
        materialIssueId: dto.materialIssueId ?? undefined,
        partsReplacedSummary: dto.partsReplacedSummary ?? undefined,
        meterReadingAtService: dto.meterReadingAtService !== undefined && dto.meterReadingAtService !== null
          ? new Prisma.Decimal(dto.meterReadingAtService)
          : undefined,
        labourCost: new Prisma.Decimal(dto.labourCost ?? 0),
        partsCost: new Prisma.Decimal(dto.partsCost ?? 0),
        vendorServiceCost: new Prisma.Decimal(dto.vendorServiceCost ?? 0),
        totalCost: new Prisma.Decimal(dto.totalCost ?? 0),
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
        project: { select: { id: true, name: true, code: true } },
        schedule: { select: { id: true, title: true, maintenanceType: true } },
        serviceVendor: { select: { id: true, name: true, code: true } },
        materialIssue: { select: { id: true, issueNumber: true, status: true } },
        reportedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.maintenanceWorkOrder.findFirst({
      where: { id, tenantId },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, status: true, currentMeterReading: true } },
        project: { select: { id: true, name: true, code: true } },
        schedule: { select: { id: true, title: true, maintenanceType: true } },
        serviceVendor: { select: { id: true, name: true, code: true } },
        materialIssue: { select: { id: true, issueNumber: true, status: true } },
        reportedBy: { select: { id: true, email: true, fullName: true } },
        completedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async findByNumber(tenantId: string, workOrderNumber: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.maintenanceWorkOrder.findUnique({
      where: {
        tenantId_workOrderNumber: {
          tenantId,
          workOrderNumber,
        },
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
        project: { select: { id: true, name: true, code: true } },
        schedule: { select: { id: true, title: true, maintenanceType: true } },
        serviceVendor: { select: { id: true, name: true, code: true } },
        materialIssue: { select: { id: true, issueNumber: true, status: true } },
        reportedBy: { select: { id: true, email: true, fullName: true } },
        completedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async lockById(tenantId: string, id: string, tx: Prisma.TransactionClient) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    const rows = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM "maintenance_work_orders" WHERE "id" = $1::uuid AND "tenant_id" = $2::uuid FOR UPDATE`,
      id,
      tenantId
    );
    return rows[0] || null;
  }

  async completeWorkOrder(
    tenantId: string,
    id: string,
    completedById: string,
    dto: CompleteWorkOrderDto,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.maintenanceWorkOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedById,
        completedAt: new Date(),
        workDone: dto.workDone,
        breakdownEndAt: dto.breakdownEndAt ? new Date(dto.breakdownEndAt) : undefined,
        downtimeHours: dto.downtimeHours !== undefined ? new Prisma.Decimal(dto.downtimeHours) : undefined,
        partsReplacedSummary: dto.partsReplacedSummary !== undefined ? dto.partsReplacedSummary : undefined,
        meterReadingAtService: dto.meterReadingAtService !== undefined && dto.meterReadingAtService !== null
          ? new Prisma.Decimal(dto.meterReadingAtService)
          : undefined,
        labourCost: dto.labourCost !== undefined ? new Prisma.Decimal(dto.labourCost) : undefined,
        partsCost: dto.partsCost !== undefined ? new Prisma.Decimal(dto.partsCost) : undefined,
        vendorServiceCost: dto.vendorServiceCost !== undefined ? new Prisma.Decimal(dto.vendorServiceCost) : undefined,
        totalCost: dto.totalCost !== undefined ? new Prisma.Decimal(dto.totalCost) : undefined,
      },
      include: {
        equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
        project: { select: { id: true, name: true, code: true } },
        schedule: { select: { id: true, title: true, maintenanceType: true } },
        serviceVendor: { select: { id: true, name: true, code: true } },
        materialIssue: { select: { id: true, issueNumber: true, status: true } },
        reportedBy: { select: { id: true, email: true, fullName: true } },
        completedBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  async list(tenantId: string, query: ListWorkOrdersQueryDto) {
    const where: Prisma.MaintenanceWorkOrderWhereInput = {
      tenantId,
      ...(query.equipmentId && { equipmentId: query.equipmentId }),
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
    };

    const [items, total] = await Promise.all([
      this.prisma.maintenanceWorkOrder.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          equipment: { select: { id: true, equipmentCode: true, name: true, status: true } },
          project: { select: { id: true, name: true, code: true } },
          schedule: { select: { id: true, title: true, maintenanceType: true } },
          serviceVendor: { select: { id: true, name: true, code: true } },
          materialIssue: { select: { id: true, issueNumber: true, status: true } },
          reportedBy: { select: { id: true, email: true, fullName: true } },
          completedBy: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.maintenanceWorkOrder.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}

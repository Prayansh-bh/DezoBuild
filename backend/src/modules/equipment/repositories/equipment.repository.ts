import { PrismaClient, Prisma } from '@prisma/client';
import { CreateEquipmentDto, UpdateEquipmentDto, ListEquipmentQueryDto } from '../dto/equipment.dto.js';

export class EquipmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, dto: CreateEquipmentDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipment.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        equipmentCode: dto.equipmentCode,
        name: dto.name,
        category: dto.category,
        equipmentType: dto.equipmentType,
        manufacturer: dto.manufacturer ?? undefined,
        modelNumber: dto.modelNumber ?? undefined,
        serialNumber: dto.serialNumber ?? undefined,
        yearOfManufacture: dto.yearOfManufacture ?? undefined,
        registrationNumber: dto.registrationNumber ?? undefined,
        ownershipType: dto.ownershipType ?? 'OWNED',
        ownerVendorId: dto.ownerVendorId ?? undefined,
        status: 'AVAILABLE',
        meterType: dto.meterType ?? 'HOURS',
        currentMeterReading: new Prisma.Decimal(dto.currentMeterReading ?? 0),
        fuelType: dto.fuelType ?? undefined,
        fuelEfficiencyNorm: dto.fuelEfficiencyNorm !== undefined && dto.fuelEfficiencyNorm !== null
          ? new Prisma.Decimal(dto.fuelEfficiencyNorm)
          : undefined,
        defaultHourlyRate: new Prisma.Decimal(dto.defaultHourlyRate ?? 0),
        monthlyRentalAmount: dto.monthlyRentalAmount !== undefined && dto.monthlyRentalAmount !== null
          ? new Prisma.Decimal(dto.monthlyRentalAmount)
          : undefined,
        currentBranchId: dto.currentBranchId ?? undefined,
        currentProjectId: undefined, // Always starts with null currentProjectId projection
        insuranceExpiryDate: dto.insuranceExpiryDate ? new Date(dto.insuranceExpiryDate) : undefined,
        fitnessExpiryDate: dto.fitnessExpiryDate ? new Date(dto.fitnessExpiryDate) : undefined,
        pucExpiryDate: dto.pucExpiryDate ? new Date(dto.pucExpiryDate) : undefined,
        isActive: dto.isActive ?? true,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        currentProject: { select: { id: true, name: true, code: true } },
        ownerVendor: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipment.findFirst({
      where: { id, tenantId },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        currentProject: { select: { id: true, name: true, code: true } },
        ownerVendor: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findByCode(tenantId: string, equipmentCode: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipment.findUnique({
      where: {
        tenantId_equipmentCode: {
          tenantId,
          equipmentCode,
        },
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        currentProject: { select: { id: true, name: true, code: true } },
        ownerVendor: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async lockById(tenantId: string, id: string, tx: Prisma.TransactionClient) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    const rows = await tx.$queryRawUnsafe<any[]>(
      `SELECT * FROM "equipment_masters" WHERE "id" = $1::uuid AND "tenant_id" = $2::uuid FOR UPDATE`,
      id,
      tenantId
    );
    return rows[0] || null;
  }

  async updateMetadata(tenantId: string, id: string, dto: UpdateEquipmentDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.equipment.update({
      where: { id },
      data: {
        companyId: dto.companyId,
        name: dto.name,
        category: dto.category,
        equipmentType: dto.equipmentType,
        manufacturer: dto.manufacturer !== undefined ? dto.manufacturer : undefined,
        modelNumber: dto.modelNumber !== undefined ? dto.modelNumber : undefined,
        serialNumber: dto.serialNumber !== undefined ? dto.serialNumber : undefined,
        yearOfManufacture: dto.yearOfManufacture !== undefined ? dto.yearOfManufacture : undefined,
        registrationNumber: dto.registrationNumber !== undefined ? dto.registrationNumber : undefined,
        ownershipType: dto.ownershipType,
        ownerVendorId: dto.ownerVendorId !== undefined ? dto.ownerVendorId : undefined,
        meterType: dto.meterType,
        fuelType: dto.fuelType !== undefined ? dto.fuelType : undefined,
        fuelEfficiencyNorm: dto.fuelEfficiencyNorm !== undefined
          ? (dto.fuelEfficiencyNorm !== null ? new Prisma.Decimal(dto.fuelEfficiencyNorm) : null)
          : undefined,
        defaultHourlyRate: dto.defaultHourlyRate !== undefined ? new Prisma.Decimal(dto.defaultHourlyRate) : undefined,
        monthlyRentalAmount: dto.monthlyRentalAmount !== undefined
          ? (dto.monthlyRentalAmount !== null ? new Prisma.Decimal(dto.monthlyRentalAmount) : null)
          : undefined,
        currentBranchId: dto.currentBranchId !== undefined ? dto.currentBranchId : undefined,
        insuranceExpiryDate: dto.insuranceExpiryDate !== undefined
          ? (dto.insuranceExpiryDate ? new Date(dto.insuranceExpiryDate) : null)
          : undefined,
        fitnessExpiryDate: dto.fitnessExpiryDate !== undefined
          ? (dto.fitnessExpiryDate ? new Date(dto.fitnessExpiryDate) : null)
          : undefined,
        pucExpiryDate: dto.pucExpiryDate !== undefined
          ? (dto.pucExpiryDate ? new Date(dto.pucExpiryDate) : null)
          : undefined,
        isActive: dto.isActive,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        currentProject: { select: { id: true, name: true, code: true } },
        ownerVendor: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    currentProjectId?: string | null,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.equipment.update({
      where: { id },
      data: {
        status,
        ...(currentProjectId !== undefined && { currentProjectId: currentProjectId ?? null }),
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        currentProject: { select: { id: true, name: true, code: true } },
        ownerVendor: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async updateMeterReading(
    tenantId: string,
    id: string,
    meterReading: Prisma.Decimal | number,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.equipment.update({
      where: { id },
      data: {
        currentMeterReading: new Prisma.Decimal(meterReading),
      },
    });
  }

  async list(tenantId: string, query: ListEquipmentQueryDto) {
    const where: Prisma.EquipmentWhereInput = {
      tenantId,
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
      ...(query.ownershipType && { ownershipType: query.ownershipType }),
      ...(query.currentProjectId && { currentProjectId: query.currentProjectId }),
      ...(query.currentBranchId && { currentBranchId: query.currentBranchId }),
      ...(query.search && {
        OR: [
          { equipmentCode: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
          { registrationNumber: { contains: query.search, mode: 'insensitive' } },
          { manufacturer: { contains: query.search, mode: 'insensitive' } },
          { modelNumber: { contains: query.search, mode: 'insensitive' } },
          { serialNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.equipment.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { equipmentCode: 'asc' },
        include: {
          company: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
          currentProject: { select: { id: true, name: true, code: true } },
          ownerVendor: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }
}

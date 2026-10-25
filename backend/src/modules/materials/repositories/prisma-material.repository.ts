import { Prisma, type PrismaClient, type Material } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IMaterialRepository,
  MaterialFilters,
} from './material.repository.interface';
import type { CreateMaterialDto, UpdateMaterialDto } from '../dto/material.dto';

export class PrismaMaterialRepository implements IMaterialRepository {
  private static instance: PrismaMaterialRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaMaterialRepository {
    if (!PrismaMaterialRepository.instance) {
      PrismaMaterialRepository.instance = new PrismaMaterialRepository();
    }
    return PrismaMaterialRepository.instance;
  }

  public async findById(tenantId: string, id: string): Promise<Material | null> {
    return this.prisma.material.findFirst({
      where: {
        id,
        tenantId,
      },
    });
  }

  public async findByItemCode(tenantId: string, itemCode: string): Promise<Material | null> {
    return this.prisma.material.findFirst({
      where: {
        tenantId,
        itemCode: itemCode.trim().toUpperCase(),
      },
    });
  }

  public async findMany(tenantId: string, filters: MaterialFilters): Promise<Material[]> {
    const where = this.buildWhereClause(tenantId, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    return this.prisma.material.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async count(tenantId: string, filters: MaterialFilters): Promise<number> {
    const where = this.buildWhereClause(tenantId, filters);
    return this.prisma.material.count({ where });
  }

  public async create(tenantId: string, data: CreateMaterialDto): Promise<Material> {
    return this.prisma.material.create({
      data: {
        tenantId,
        itemCode: data.itemCode,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        specification: data.specification ?? null,
        primaryUom: data.primaryUom,
        secondaryUom: data.secondaryUom ?? null,
        conversionFactor: data.conversionFactor ? new Prisma.Decimal(data.conversionFactor) : null,
        hsnCode: data.hsnCode ?? null,
        standardRate: new Prisma.Decimal(data.standardRate ?? 0),
        reorderLevel: new Prisma.Decimal(data.reorderLevel ?? 0),
        safetyStock: new Prisma.Decimal(data.safetyStock ?? 0),
        isBatchTracked: data.isBatchTracked ?? false,
        status: data.status ?? 'ACTIVE',
      },
    });
  }

  public async update(tenantId: string, id: string, data: UpdateMaterialDto): Promise<Material> {
    const updateData: Prisma.MaterialUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.specification !== undefined) updateData.specification = data.specification;
    if (data.primaryUom !== undefined) updateData.primaryUom = data.primaryUom;
    if (data.secondaryUom !== undefined) updateData.secondaryUom = data.secondaryUom;
    if (data.conversionFactor !== undefined) {
      updateData.conversionFactor = data.conversionFactor ? new Prisma.Decimal(data.conversionFactor) : null;
    }
    if (data.hsnCode !== undefined) updateData.hsnCode = data.hsnCode;
    if (data.standardRate !== undefined) updateData.standardRate = new Prisma.Decimal(data.standardRate);
    if (data.reorderLevel !== undefined) updateData.reorderLevel = new Prisma.Decimal(data.reorderLevel);
    if (data.safetyStock !== undefined) updateData.safetyStock = new Prisma.Decimal(data.safetyStock);
    if (data.isBatchTracked !== undefined) updateData.isBatchTracked = data.isBatchTracked;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.material.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  private buildWhereClause(tenantId: string, filters: MaterialFilters): Prisma.MaterialWhereInput {
    const where: Prisma.MaterialWhereInput = {
      tenantId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { itemCode: { contains: filters.search, mode: 'insensitive' } },
        { specification: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}

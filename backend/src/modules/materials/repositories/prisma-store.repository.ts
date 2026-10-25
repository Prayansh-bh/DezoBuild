import type { PrismaClient, Store, Prisma } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IStoreRepository,
  StoreFilters,
  StoreWithRelations,
} from './store.repository.interface';
import type { CreateStoreDto, UpdateStoreDto } from '../dto/store.dto';

export class PrismaStoreRepository implements IStoreRepository {
  private static instance: PrismaStoreRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaStoreRepository {
    if (!PrismaStoreRepository.instance) {
      PrismaStoreRepository.instance = new PrismaStoreRepository();
    }
    return PrismaStoreRepository.instance;
  }

  public async findById(tenantId: string, storeId: string): Promise<StoreWithRelations | null> {
    return this.prisma.store.findFirst({
      where: {
        id: storeId,
        tenantId,
      },
      include: {
        project: true,
      },
    });
  }

  public async findByCode(tenantId: string, code: string): Promise<Store | null> {
    return this.prisma.store.findFirst({
      where: {
        tenantId,
        code: code.trim().toUpperCase(),
      },
    });
  }

  public async findMany(
    tenantId: string,
    filters: StoreFilters,
    allowedStoreIds?: string[]
  ): Promise<StoreWithRelations[]> {
    const where = this.buildWhereClause(tenantId, filters, allowedStoreIds);
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    return this.prisma.store.findMany({
      where,
      skip,
      take: limit,
      include: {
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async count(
    tenantId: string,
    filters: StoreFilters,
    allowedStoreIds?: string[]
  ): Promise<number> {
    const where = this.buildWhereClause(tenantId, filters, allowedStoreIds);
    return this.prisma.store.count({ where });
  }

  public async create(tenantId: string, data: CreateStoreDto): Promise<StoreWithRelations> {
    const isCentral = data.isCentralWarehouse || data.storeType === 'CENTRAL';

    return this.prisma.store.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        address: data.address ?? null,
        location: data.location ?? null,
        isCentralWarehouse: isCentral,
        storeType: isCentral ? 'CENTRAL' : (data.storeType ?? 'PROJECT_SITE'),
        projectId: isCentral ? null : (data.projectId ?? null),
        branchId: data.branchId ?? null,
        status: data.status ?? 'ACTIVE',
      },
      include: {
        project: true,
      },
    });
  }

  public async update(tenantId: string, storeId: string, data: UpdateStoreDto): Promise<StoreWithRelations> {
    const updateData: Prisma.StoreUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.store.update({
      where: {
        id: storeId,
      },
      data: updateData,
      include: {
        project: true,
      },
    });
  }

  private buildWhereClause(
    tenantId: string,
    filters: StoreFilters,
    allowedStoreIds?: string[]
  ): Prisma.StoreWhereInput {
    const where: Prisma.StoreWhereInput = {
      tenantId,
    };

    if (allowedStoreIds) {
      where.id = { in: allowedStoreIds };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.storeType) {
      where.storeType = filters.storeType;
    }

    if (filters.isCentralWarehouse !== undefined) {
      where.isCentralWarehouse = filters.isCentralWarehouse;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}

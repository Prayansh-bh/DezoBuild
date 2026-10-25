import { Prisma, type PrismaClient, type StockMovement } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IStockMovementRepository,
  CreateMovementParams,
  StockMovementWithRelations,
} from './stock-movement.repository.interface';
import type { ListStockMovementsQueryDto } from '../dto/stock.dto';
import { OUTBOUND_MOVEMENT_TYPES } from '../constants/stock-movement-type.constant';

export class PrismaStockMovementRepository implements IStockMovementRepository {
  private static instance: PrismaStockMovementRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaStockMovementRepository {
    if (!PrismaStockMovementRepository.instance) {
      PrismaStockMovementRepository.instance = new PrismaStockMovementRepository();
    }
    return PrismaStockMovementRepository.instance;
  }

  public async create(
    tenantId: string,
    params: CreateMovementParams,
    tx?: Prisma.TransactionClient
  ): Promise<StockMovement> {
    const client = tx || this.prisma;

    return client.stockMovement.create({
      data: {
        tenantId,
        storeId: params.storeId,
        materialId: params.materialId,
        movementType: params.movementType,
        quantity: params.quantity,
        uom: params.uom,
        unitRate: params.unitRate ?? null,
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
        reason: params.reason ?? null,
        performedById: params.performedById ?? null,
        idempotencyKey: params.idempotencyKey ?? null,
        occurredAt: params.occurredAt ?? new Date(),
      },
    });
  }

  public async findById(
    tenantId: string,
    id: string
  ): Promise<StockMovementWithRelations | null> {
    return this.prisma.stockMovement.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        material: true,
        performedBy: true,
      },
    });
  }

  public async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: Prisma.TransactionClient
  ): Promise<StockMovement | null> {
    const client = tx || this.prisma;
    return client.stockMovement.findFirst({
      where: {
        tenantId,
        idempotencyKey,
      },
    });
  }

  public async findMany(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockMovementsQueryDto>
  ): Promise<StockMovementWithRelations[]> {
    const where = this.buildWhereClause(tenantId, storeId, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    return this.prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      include: {
        material: true,
        performedBy: true,
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  public async count(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockMovementsQueryDto>
  ): Promise<number> {
    const where = this.buildWhereClause(tenantId, storeId, filters);
    return this.prisma.stockMovement.count({ where });
  }

  public async sumMovements(
    tenantId: string,
    storeId: string,
    materialId: string,
    tx?: Prisma.TransactionClient
  ): Promise<{
    inboundSum: Prisma.Decimal;
    outboundSum: Prisma.Decimal;
    totalSum: Prisma.Decimal;
    count: number;
  }> {
    const client = tx || this.prisma;
    const movements = await client.stockMovement.findMany({
      where: {
        tenantId,
        storeId,
        materialId,
      },
    });

    let inboundSum = new Prisma.Decimal(0);
    let outboundSum = new Prisma.Decimal(0);

    for (const m of movements) {
      if (OUTBOUND_MOVEMENT_TYPES.includes(m.movementType as any)) {
        outboundSum = outboundSum.plus(m.quantity);
      } else {
        inboundSum = inboundSum.plus(m.quantity);
      }
    }

    const totalSum = inboundSum.minus(outboundSum);

    return {
      inboundSum,
      outboundSum,
      totalSum,
      count: movements.length,
    };
  }

  private buildWhereClause(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockMovementsQueryDto>
  ): Prisma.StockMovementWhereInput {
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      storeId,
    };

    if (filters.materialId) {
      where.materialId = filters.materialId;
    }

    if (filters.movementType) {
      where.movementType = filters.movementType;
    }

    if (filters.startDate || filters.endDate) {
      where.occurredAt = {};
      if (filters.startDate) {
        where.occurredAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        if (filters.endDate.length === 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        where.occurredAt.lte = end;
      }
    }

    return where;
  }
}

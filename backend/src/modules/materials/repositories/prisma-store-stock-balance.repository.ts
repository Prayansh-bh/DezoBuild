import { Prisma, type PrismaClient, type StoreStockBalance } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import type {
  IStoreStockBalanceRepository,
  StoreStockBalanceWithRelations,
} from './store-stock-balance.repository.interface';
import type { ListStockBalancesQueryDto } from '../dto/stock.dto';

export class PrismaStoreStockBalanceRepository implements IStoreStockBalanceRepository {
  private static instance: PrismaStoreStockBalanceRepository;
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(): PrismaStoreStockBalanceRepository {
    if (!PrismaStoreStockBalanceRepository.instance) {
      PrismaStoreStockBalanceRepository.instance = new PrismaStoreStockBalanceRepository();
    }
    return PrismaStoreStockBalanceRepository.instance;
  }

  public async findByStoreAndMaterial(
    tenantId: string,
    storeId: string,
    materialId: string,
    tx?: Prisma.TransactionClient
  ): Promise<StoreStockBalanceWithRelations | null> {
    const client = tx || this.prisma;
    const balance = await client.storeStockBalance.findFirst({
      where: {
        tenantId,
        storeId,
        materialId,
      },
      include: {
        material: true,
      },
    });

    if (!balance) return null;

    const onHand = Number(balance.quantityOnHand);
    const reserved = Number(balance.reservedQuantity);

    return {
      ...balance,
      availableQuantity: onHand - reserved,
    };
  }

  public async findManyByStore(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockBalancesQueryDto>
  ): Promise<StoreStockBalanceWithRelations[]> {
    const where = this.buildWhereClause(tenantId, storeId, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const balances = await this.prisma.storeStockBalance.findMany({
      where,
      skip,
      take: limit,
      include: {
        material: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return balances.map((b) => {
      const onHand = Number(b.quantityOnHand);
      const reserved = Number(b.reservedQuantity);
      return {
        ...b,
        availableQuantity: onHand - reserved,
      };
    });
  }

  public async countByStore(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockBalancesQueryDto>
  ): Promise<number> {
    const where = this.buildWhereClause(tenantId, storeId, filters);
    return this.prisma.storeStockBalance.count({ where });
  }

  public async lockAndGetBalance(
    tenantId: string,
    storeId: string,
    materialId: string,
    tx: Prisma.TransactionClient
  ): Promise<{
    id: string;
    tenantId: string;
    storeId: string;
    materialId: string;
    quantityOnHand: Prisma.Decimal;
    reservedQuantity: Prisma.Decimal;
  }> {
    // 1. Ensure initial row exists safely across concurrency
    await tx.$executeRaw`
      INSERT INTO "store_stock_balances" ("id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity", "created_at", "updated_at")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${storeId}::uuid, ${materialId}::uuid, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("store_id", "material_id") DO NOTHING;
    `;

    // 2. Select row FOR UPDATE exclusively
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        store_id: string;
        material_id: string;
        quantity_on_hand: string | number;
        reserved_quantity: string | number;
      }>
    >`
      SELECT "id", "tenant_id", "store_id", "material_id", "quantity_on_hand", "reserved_quantity"
      FROM "store_stock_balances"
      WHERE "store_id" = ${storeId}::uuid AND "material_id" = ${materialId}::uuid
      FOR UPDATE;
    `;

    const row = rows[0];
    if (!row) {
      throw new Error(`Failed to acquire lock on stock balance for store ${storeId} and material ${materialId}`);
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      storeId: row.store_id,
      materialId: row.material_id,
      quantityOnHand: new Prisma.Decimal(row.quantity_on_hand),
      reservedQuantity: new Prisma.Decimal(row.reserved_quantity),
    };
  }

  public async updateOnHand(
    balanceId: string,
    newOnHand: Prisma.Decimal,
    tx: Prisma.TransactionClient
  ): Promise<StoreStockBalance> {
    return tx.storeStockBalance.update({
      where: {
        id: balanceId,
      },
      data: {
        quantityOnHand: newOnHand,
      },
    });
  }

  private buildWhereClause(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockBalancesQueryDto>
  ): Prisma.StoreStockBalanceWhereInput {
    const where: Prisma.StoreStockBalanceWhereInput = {
      tenantId,
      storeId,
    };

    if (filters.materialId) {
      where.materialId = filters.materialId;
    }

    if (filters.search) {
      where.material = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { itemCode: { contains: filters.search, mode: 'insensitive' } },
          { category: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    return where;
  }
}

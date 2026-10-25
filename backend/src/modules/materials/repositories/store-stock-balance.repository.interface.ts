import type { StoreStockBalance, Material, Prisma } from '@prisma/client';
import type { ListStockBalancesQueryDto } from '../dto/stock.dto';

export type StoreStockBalanceWithRelations = StoreStockBalance & {
  material?: Material | null;
  availableQuantity: number;
};

export interface IStoreStockBalanceRepository {
  findByStoreAndMaterial(
    tenantId: string,
    storeId: string,
    materialId: string,
    tx?: Prisma.TransactionClient
  ): Promise<StoreStockBalanceWithRelations | null>;

  findManyByStore(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockBalancesQueryDto>
  ): Promise<StoreStockBalanceWithRelations[]>;

  countByStore(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockBalancesQueryDto>
  ): Promise<number>;

  lockAndGetBalance(
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
  }>;

  updateOnHand(
    balanceId: string,
    newOnHand: Prisma.Decimal,
    tx: Prisma.TransactionClient
  ): Promise<StoreStockBalance>;
}

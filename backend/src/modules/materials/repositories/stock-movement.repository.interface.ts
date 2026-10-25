import type { StockMovement, Material, User, Prisma } from '@prisma/client';
import type { ListStockMovementsQueryDto } from '../dto/stock.dto';

export type StockMovementWithRelations = StockMovement & {
  material?: Material | null;
  performedBy?: User | null;
};

export interface CreateMovementParams {
  storeId: string;
  materialId: string;
  movementType: string;
  quantity: Prisma.Decimal;
  uom: string;
  unitRate?: Prisma.Decimal | null;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  performedById?: string | null;
  idempotencyKey?: string | null;
  occurredAt?: Date;
}

export interface IStockMovementRepository {
  create(
    tenantId: string,
    params: CreateMovementParams,
    tx?: Prisma.TransactionClient
  ): Promise<StockMovement>;

  findById(
    tenantId: string,
    id: string
  ): Promise<StockMovementWithRelations | null>;

  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: Prisma.TransactionClient
  ): Promise<StockMovement | null>;

  findMany(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockMovementsQueryDto>
  ): Promise<StockMovementWithRelations[]>;

  count(
    tenantId: string,
    storeId: string,
    filters: Partial<ListStockMovementsQueryDto>
  ): Promise<number>;

  sumMovements(
    tenantId: string,
    storeId: string,
    materialId: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ inboundSum: Prisma.Decimal; outboundSum: Prisma.Decimal; totalSum: Prisma.Decimal; count: number }>;
}

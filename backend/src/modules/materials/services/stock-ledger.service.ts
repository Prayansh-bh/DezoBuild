import { Prisma, type PrismaClient, type StockMovement } from '@prisma/client';
import { DatabaseService } from '../../../database/database.service';
import { PrismaStockMovementRepository } from '../repositories/prisma-stock-movement.repository';
import type { IStockMovementRepository } from '../repositories/stock-movement.repository.interface';
import { PrismaStoreStockBalanceRepository } from '../repositories/prisma-store-stock-balance.repository';
import type {
  IStoreStockBalanceRepository,
  StoreStockBalanceWithRelations,
} from '../repositories/store-stock-balance.repository.interface';
import { PrismaMaterialRepository } from '../repositories/prisma-material.repository';
import type { IMaterialRepository } from '../repositories/material.repository.interface';
import { PrismaStoreRepository } from '../repositories/prisma-store.repository';
import type { IStoreRepository } from '../repositories/store.repository.interface';
import { AuthorizationService } from '../../rbac/services/authorization.service';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../../common/errors/app-error';
import {
  type StockMovementType,
  INBOUND_MOVEMENT_TYPES,
  OUTBOUND_MOVEMENT_TYPES,
} from '../constants/stock-movement-type.constant';
import type {
  RecordStockAdjustmentDto,
  ListStockBalancesQueryDto,
  ListStockMovementsQueryDto,
} from '../dto/stock.dto';

export interface RecordMovementServiceParams {
  storeId: string;
  materialId: string;
  movementType: StockMovementType;
  quantity: number;
  uom?: string;
  unitRate?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  performedById?: string | null;
  idempotencyKey?: string | null;
  occurredAt?: Date;
}

export interface RecordMovementResult {
  movement: StockMovement;
  updatedBalance: {
    id: string;
    storeId: string;
    materialId: string;
    quantityOnHand: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
  isReplay: boolean;
}

export interface ReconciliationReport {
  storeId: string;
  materialId: string;
  snapshotBalance: number;
  ledgerCalculatedBalance: number;
  inboundSum: number;
  outboundSum: number;
  movementCount: number;
  status: 'MATCH' | 'MISMATCH';
  discrepancy: number;
}

export interface StockLedgerServiceDependencies {
  stockMovementRepo?: IStockMovementRepository;
  stockBalanceRepo?: IStoreStockBalanceRepository;
  materialRepo?: IMaterialRepository;
  storeRepo?: IStoreRepository;
  authService?: AuthorizationService;
  prisma?: PrismaClient;
}

export class StockLedgerService {
  private static instance: StockLedgerService;
  private readonly stockMovementRepo: IStockMovementRepository;
  private readonly stockBalanceRepo: IStoreStockBalanceRepository;
  private readonly materialRepo: IMaterialRepository;
  private readonly storeRepo: IStoreRepository;
  private readonly authService: AuthorizationService;
  private readonly prisma: PrismaClient;

  constructor(deps?: StockLedgerServiceDependencies) {
    this.stockMovementRepo =
      deps?.stockMovementRepo || PrismaStockMovementRepository.getInstance();
    this.stockBalanceRepo =
      deps?.stockBalanceRepo || PrismaStoreStockBalanceRepository.getInstance();
    this.materialRepo =
      deps?.materialRepo || PrismaMaterialRepository.getInstance();
    this.storeRepo = deps?.storeRepo || PrismaStoreRepository.getInstance();
    this.authService =
      deps?.authService || AuthorizationService.getInstance();
    this.prisma = deps?.prisma || DatabaseService.getInstance().getClient();
  }

  public static getInstance(
    deps?: StockLedgerServiceDependencies
  ): StockLedgerService {
    if (!StockLedgerService.instance || deps) {
      StockLedgerService.instance = new StockLedgerService(deps);
    }
    return StockLedgerService.instance;
  }

  public static resetInstance(): void {
    StockLedgerService.instance = undefined as unknown as StockLedgerService;
  }

  /**
   * Core transactional engine for all stock mutations.
   * Enforces:
   * 1. Idempotency protection
   * 2. Row-level pessimistic locking (SELECT FOR UPDATE)
   * 3. Negative-stock prevention
   * 4. Single-source-of-truth balance updates and immutable movement ledger records
   */
  public async recordMovement(
    tenantId: string,
    params: RecordMovementServiceParams
  ): Promise<RecordMovementResult> {
    if (params.quantity <= 0) {
      throw new BadRequestError('Movement quantity must be greater than zero');
    }

    // 1. Validate Store existence in tenant
    const store = await this.storeRepo.findById(tenantId, params.storeId);
    if (!store) {
      throw new NotFoundError(
        `Store with ID ${params.storeId} not found in this tenant`
      );
    }

    // 2. Validate Material existence in tenant
    const material = await this.materialRepo.findById(tenantId, params.materialId);
    if (!material) {
      throw new NotFoundError(
        `Material with ID ${params.materialId} not found in this tenant`
      );
    }

    const uom = params.uom || material.primaryUom;

    // 3. Execute mutation inside an interactive database transaction
    return this.prisma.$transaction(async (tx) => {
      // Step A: Idempotency check
      if (params.idempotencyKey) {
        const existingMovement =
          await this.stockMovementRepo.findByIdempotencyKey(
            tenantId,
            params.idempotencyKey,
            tx
          );

        if (existingMovement) {
          const balance = await this.stockBalanceRepo.findByStoreAndMaterial(
            tenantId,
            params.storeId,
            params.materialId,
            tx
          );

          return {
            movement: existingMovement,
            updatedBalance: {
              id: balance?.id || '',
              storeId: params.storeId,
              materialId: params.materialId,
              quantityOnHand: Number(balance?.quantityOnHand ?? 0),
              reservedQuantity: Number(balance?.reservedQuantity ?? 0),
              availableQuantity: Number(balance?.availableQuantity ?? 0),
            },
            isReplay: true,
          };
        }
      }

      // Step B: Row-level lock on the (storeId, materialId) balance row
      const lockedBalance = await this.stockBalanceRepo.lockAndGetBalance(
        tenantId,
        params.storeId,
        params.materialId,
        tx
      );

      // Step C: Determine delta direction
      let delta: Prisma.Decimal;
      if (INBOUND_MOVEMENT_TYPES.includes(params.movementType as any)) {
        delta = new Prisma.Decimal(params.quantity);
      } else if (OUTBOUND_MOVEMENT_TYPES.includes(params.movementType as any)) {
        delta = new Prisma.Decimal(params.quantity).negated();
      } else {
        throw new BadRequestError(
          `Invalid stock movement type: ${params.movementType}`
        );
      }

      // Step D: Calculate new on-hand balance and enforce negative-stock invariant
      const currentOnHand = lockedBalance.quantityOnHand;
      const newOnHand = currentOnHand.plus(delta);

      if (newOnHand.lessThan(0)) {
        throw new BadRequestError(
          `Insufficient stock on hand for store ${params.storeId} and material ${params.materialId}. Requested deduction ${params.quantity}, available on-hand ${currentOnHand.toNumber()}`
        );
      }

      if (newOnHand.lessThan(lockedBalance.reservedQuantity)) {
        throw new BadRequestError(
          `Stock adjustment rejected: new on-hand quantity (${newOnHand.toNumber()}) cannot be less than active reserved quantity (${lockedBalance.reservedQuantity.toNumber()}) in store ${params.storeId}.`
        );
      }

      // Step E: Update snapshot balance
      const updatedBalanceRecord = await this.stockBalanceRepo.updateOnHand(
        lockedBalance.id,
        newOnHand,
        tx
      );

      // Step F: Create immutable movement ledger record
      const movement = await this.stockMovementRepo.create(
        tenantId,
        {
          storeId: params.storeId,
          materialId: params.materialId,
          movementType: params.movementType,
          quantity: new Prisma.Decimal(params.quantity),
          uom,
          unitRate:
            params.unitRate !== undefined && params.unitRate !== null
              ? new Prisma.Decimal(params.unitRate)
              : null,
          referenceType: params.referenceType ?? null,
          referenceId: params.referenceId ?? null,
          reason: params.reason ?? null,
          performedById: params.performedById ?? null,
          idempotencyKey: params.idempotencyKey ?? null,
          occurredAt: params.occurredAt ?? new Date(),
        },
        tx
      );

      const onHandNum = Number(updatedBalanceRecord.quantityOnHand);
      const reservedNum = Number(updatedBalanceRecord.reservedQuantity);

      return {
        movement,
        updatedBalance: {
          id: updatedBalanceRecord.id,
          storeId: updatedBalanceRecord.storeId,
          materialId: updatedBalanceRecord.materialId,
          quantityOnHand: onHandNum,
          reservedQuantity: reservedNum,
          availableQuantity: onHandNum - reservedNum,
        },
        isReplay: false,
      };
    });
  }

  /**
   * Privileged manual stock adjustment API
   */
  public async recordAdjustment(
    tenantId: string,
    userId: string,
    storeId: string,
    materialId: string,
    dto: RecordStockAdjustmentDto
  ): Promise<RecordMovementResult> {
    await this.verifyStoreAccess(tenantId, userId, storeId, 'materials:manage');

    return this.recordMovement(tenantId, {
      storeId,
      materialId,
      movementType: dto.movementType,
      quantity: dto.quantity,
      unitRate: dto.unitRate,
      referenceType: dto.referenceType || 'MANUAL_ADJUSTMENT',
      referenceId: dto.referenceId,
      reason: dto.reason,
      performedById: userId,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  /**
   * List all material stock balances for a given store
   */
  public async getStoreStocks(
    tenantId: string,
    userId: string,
    storeId: string,
    query: Partial<ListStockBalancesQueryDto>
  ): Promise<{
    items: StoreStockBalanceWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.verifyStoreAccess(tenantId, userId, storeId, 'materials:view');

    const page = query.page || 1;
    const limit = query.limit || 50;

    const [items, total] = await Promise.all([
      this.stockBalanceRepo.findManyByStore(tenantId, storeId, query),
      this.stockBalanceRepo.countByStore(tenantId, storeId, query),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Get single material stock balance in a store
   */
  public async getStockBalance(
    tenantId: string,
    userId: string,
    storeId: string,
    materialId: string
  ): Promise<StoreStockBalanceWithRelations> {
    await this.verifyStoreAccess(tenantId, userId, storeId, 'materials:view');

    const material = await this.materialRepo.findById(tenantId, materialId);
    if (!material) {
      throw new NotFoundError(
        `Material with ID ${materialId} not found in this tenant`
      );
    }

    const balance = await this.stockBalanceRepo.findByStoreAndMaterial(
      tenantId,
      storeId,
      materialId
    );

    if (!balance) {
      return {
        id: '',
        tenantId,
        storeId,
        materialId,
        quantityOnHand: new Prisma.Decimal(0),
        reservedQuantity: new Prisma.Decimal(0),
        availableQuantity: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        material,
      };
    }

    return balance;
  }

  /**
   * List ledger movements for a store with filtering and pagination
   */
  public async getStockMovements(
    tenantId: string,
    userId: string,
    storeId: string,
    query: Partial<ListStockMovementsQueryDto>
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.verifyStoreAccess(tenantId, userId, storeId, 'materials:view');

    const page = query.page || 1;
    const limit = query.limit || 50;

    const [items, total] = await Promise.all([
      this.stockMovementRepo.findMany(tenantId, storeId, query),
      this.stockMovementRepo.count(tenantId, storeId, query),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Audit reconciliation: verifies snapshot balance equals sum(inbound) - sum(outbound)
   */
  public async reconcileMaterialStock(
    tenantId: string,
    userId: string,
    storeId: string,
    materialId: string
  ): Promise<ReconciliationReport> {
    await this.verifyStoreAccess(tenantId, userId, storeId, 'materials:manage');

    const material = await this.materialRepo.findById(tenantId, materialId);
    if (!material) {
      throw new NotFoundError(
        `Material with ID ${materialId} not found in this tenant`
      );
    }

    const balance = await this.stockBalanceRepo.findByStoreAndMaterial(
      tenantId,
      storeId,
      materialId
    );
    const snapshotOnHand = balance
      ? new Prisma.Decimal(balance.quantityOnHand)
      : new Prisma.Decimal(0);

    const { inboundSum, outboundSum, totalSum, count } =
      await this.stockMovementRepo.sumMovements(tenantId, storeId, materialId);

    const discrepancy = snapshotOnHand.minus(totalSum);
    const isMatch = discrepancy.isZero();

    return {
      storeId,
      materialId,
      snapshotBalance: snapshotOnHand.toNumber(),
      ledgerCalculatedBalance: totalSum.toNumber(),
      inboundSum: inboundSum.toNumber(),
      outboundSum: outboundSum.toNumber(),
      movementCount: count,
      status: isMatch ? 'MATCH' : 'MISMATCH',
      discrepancy: discrepancy.toNumber(),
    };
  }

  private async verifyStoreAccess(
    tenantId: string,
    userId: string,
    storeId: string,
    permission: 'materials:view' | 'materials:manage'
  ): Promise<void> {
    const access = await this.authService.hasStoreAccess(
      tenantId,
      userId,
      storeId,
      permission
    );

    if (!access.granted) {
      const storeInTenant = await this.storeRepo.findById(tenantId, storeId);
      if (!storeInTenant) {
        throw new NotFoundError(
          `Store with ID ${storeId} not found in this tenant`
        );
      }
      throw new ForbiddenError(
        access.reason || 'User does not have access to this store'
      );
    }
  }
}

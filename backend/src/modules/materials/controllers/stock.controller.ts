import type { IncomingMessage } from 'node:http';
import { StockLedgerService, type RecordMovementResult, type ReconciliationReport } from '../services/stock-ledger.service';
import {
  RecordStockAdjustmentSchema,
  ListStockBalancesQuerySchema,
  ListStockMovementsQuerySchema,
} from '../dto/stock.dto';
import { requireAuth } from '../../auth/auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard';
import { DtoValidator } from '../../../common/validation/validator';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto';
import type { StoreStockBalanceWithRelations } from '../repositories/store-stock-balance.repository.interface';
import type { StockMovementWithRelations } from '../repositories/stock-movement.repository.interface';

export class StockController {
  private readonly stockLedgerService: StockLedgerService;

  constructor(stockLedgerService?: StockLedgerService) {
    this.stockLedgerService =
      stockLedgerService || StockLedgerService.getInstance();
  }

  public async listStoreStocks(
    req: IncomingMessage & {
      params?: { storeId?: string };
      query?: Record<string, string>;
    }
  ): Promise<
    ApiResponse<{
      items: StoreStockBalanceWithRelations[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const storeId = req.params?.storeId || '';
    const query = DtoValidator.validate(
      ListStockBalancesQuerySchema,
      req.query || {}
    );

    const result = await this.stockLedgerService.getStoreStocks(
      principal.tenantId,
      principal.userId,
      storeId,
      query
    );
    return createSuccessResponse(result, 'Store stock balances retrieved successfully');
  }

  public async getStockBalance(
    req: IncomingMessage & {
      params?: { storeId?: string; materialId?: string };
    }
  ): Promise<ApiResponse<StoreStockBalanceWithRelations>> {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const storeId = req.params?.storeId || '';
    const materialId = req.params?.materialId || '';

    const balance = await this.stockLedgerService.getStockBalance(
      principal.tenantId,
      principal.userId,
      storeId,
      materialId
    );
    return createSuccessResponse(balance, 'Stock balance retrieved successfully');
  }

  public async listStoreMovements(
    req: IncomingMessage & {
      params?: { storeId?: string };
      query?: Record<string, string>;
    }
  ): Promise<
    ApiResponse<{
      items: StockMovementWithRelations[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    await RbacGuard.requirePermission(req, 'materials:view');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const storeId = req.params?.storeId || '';
    const query = DtoValidator.validate(
      ListStockMovementsQuerySchema,
      req.query || {}
    );

    const result = await this.stockLedgerService.getStockMovements(
      principal.tenantId,
      principal.userId,
      storeId,
      query
    );
    return createSuccessResponse(result, 'Stock movements retrieved successfully');
  }

  public async recordAdjustment(
    req: IncomingMessage & {
      params?: { storeId?: string; materialId?: string };
      body?: unknown;
    }
  ): Promise<ApiResponse<RecordMovementResult>> {
    await RbacGuard.requirePermission(req, 'materials:manage');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const storeId = req.params?.storeId || '';
    const materialId = req.params?.materialId || '';
    const dto = DtoValidator.validate(
      RecordStockAdjustmentSchema,
      req.body || {}
    );

    const result = await this.stockLedgerService.recordAdjustment(
      principal.tenantId,
      principal.userId,
      storeId,
      materialId,
      dto
    );
    return createSuccessResponse(result, 'Stock adjustment recorded successfully');
  }

  public async reconcileStock(
    req: IncomingMessage & {
      params?: { storeId?: string; materialId?: string };
    }
  ): Promise<ApiResponse<ReconciliationReport>> {
    await RbacGuard.requirePermission(req, 'materials:manage');
    await EntitlementGuard.requireFeature(req, 'materials:core');

    const principal = await requireAuth(req);
    const storeId = req.params?.storeId || '';
    const materialId = req.params?.materialId || '';

    const report = await this.stockLedgerService.reconcileMaterialStock(
      principal.tenantId,
      principal.userId,
      storeId,
      materialId
    );
    return createSuccessResponse(report, 'Stock reconciliation report generated successfully');
  }
}

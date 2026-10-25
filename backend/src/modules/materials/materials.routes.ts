import type { HttpRouter } from '../../common/http/router';
import { MaterialsController } from './controllers/materials.controller';
import { VendorsController } from './controllers/vendors.controller';
import { StoresController } from './controllers/stores.controller';
import { StockController } from './controllers/stock.controller';
import { MaterialIndentsController } from './controllers/material-indents.controller';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { GoodsReceiptsController } from './controllers/goods-receipts.controller';
import { MaterialIssuesController } from './controllers/material-issues.controller';
import { MaterialReturnsController } from './controllers/material-returns.controller';
import { MaterialTransfersController } from './controllers/material-transfers.controller';
import { InventoryReservationsController } from './controllers/inventory-reservations.controller';
import { InventoryAvailabilityController } from './controllers/inventory-availability.controller';
import { appConfig } from '../../config/app.config';

export function registerMaterialsRoutes(
  router: HttpRouter,
  materialsController = new MaterialsController(),
  vendorsController = new VendorsController(),
  storesController = new StoresController(),
  stockController = new StockController(),
  indentsController = new MaterialIndentsController(),
  poController = new PurchaseOrdersController(),
  grnController = new GoodsReceiptsController(),
  issuesController = new MaterialIssuesController(),
  returnsController = new MaterialReturnsController(),
  transfersController = new MaterialTransfersController(),
  reservationsController = new InventoryReservationsController(),
  availabilityController = new InventoryAvailabilityController()
): void {
  const prefix = appConfig.app.apiPrefix;

  // ==========================================
  // INVENTORY AVAILABILITY & ALLOCATION INTELLIGENCE (Phase 07.10)
  // ==========================================

  // GET /api/v1/materials/availability
  router.get(`${prefix}/materials/availability`, async (req) =>
    availabilityController.listAvailability(req)
  );

  // GET /api/v1/materials/availability/by-project/:projectId
  router.get(`${prefix}/materials/availability/by-project/:projectId`, async (req) =>
    availabilityController.getProjectAvailability(req)
  );

  // GET /api/v1/materials/availability/by-store/:storeId
  router.get(`${prefix}/materials/availability/by-store/:storeId`, async (req) =>
    availabilityController.getStoreAvailability(req)
  );

  // GET /api/v1/materials/shortages
  router.get(`${prefix}/materials/shortages`, async (req) =>
    availabilityController.getShortages(req)
  );

  // GET /api/v1/materials/availability/:materialId
  router.get(`${prefix}/materials/availability/:materialId`, async (req) =>
    availabilityController.getMaterial360(req)
  );

  // ==========================================
  // INVENTORY RESERVATIONS & ALLOCATIONS (Phase 07.9)
  // ==========================================

  // GET /api/v1/materials/reservations
  router.get(`${prefix}/materials/reservations`, async (req) =>
    reservationsController.listReservations(req)
  );

  // POST /api/v1/materials/reservations
  router.post(`${prefix}/materials/reservations`, async (req) =>
    reservationsController.createReservation(req)
  );

  // POST /api/v1/materials/reservations/expire-stale (Must be before /:id)
  router.post(`${prefix}/materials/reservations/expire-stale`, async (req) =>
    reservationsController.expireStaleReservations(req)
  );

  // GET /api/v1/materials/reservations/:id
  router.get(`${prefix}/materials/reservations/:id`, async (req) =>
    reservationsController.getReservation(req)
  );

  // PATCH /api/v1/materials/reservations/:id
  router.patch(`${prefix}/materials/reservations/:id`, async (req) =>
    reservationsController.updateReservation(req)
  );

  // POST /api/v1/materials/reservations/:id/submit
  router.post(`${prefix}/materials/reservations/:id/submit`, async (req) =>
    reservationsController.submitReservation(req)
  );

  // POST /api/v1/materials/reservations/:id/approve
  router.post(`${prefix}/materials/reservations/:id/approve`, async (req) =>
    reservationsController.approveReservation(req)
  );

  // POST /api/v1/materials/reservations/:id/reject
  router.post(`${prefix}/materials/reservations/:id/reject`, async (req) =>
    reservationsController.rejectReservation(req)
  );

  // POST /api/v1/materials/reservations/:id/release
  router.post(`${prefix}/materials/reservations/:id/release`, async (req) =>
    reservationsController.releaseReservation(req)
  );

  // POST /api/v1/materials/reservations/:id/cancel
  router.post(`${prefix}/materials/reservations/:id/cancel`, async (req) =>
    reservationsController.cancelReservation(req)
  );

  // DELETE /api/v1/materials/reservations/:id
  router.delete(`${prefix}/materials/reservations/:id`, async (req) =>
    reservationsController.deleteReservation(req)
  );

  // ==========================================
  // MATERIAL TRANSFERS / INTER-STORE TRANSFER (Phase 07.8)
  // ==========================================

  // GET /api/v1/materials/transfers
  router.get(`${prefix}/materials/transfers`, async (req) =>
    transfersController.listMaterialTransfers(req)
  );

  // POST /api/v1/materials/transfers
  router.post(`${prefix}/materials/transfers`, async (req) =>
    transfersController.createMaterialTransfer(req)
  );

  // GET /api/v1/materials/transfers/:id
  router.get(`${prefix}/materials/transfers/:id`, async (req) =>
    transfersController.getMaterialTransfer(req)
  );

  // PATCH /api/v1/materials/transfers/:id
  router.patch(`${prefix}/materials/transfers/:id`, async (req) =>
    transfersController.updateMaterialTransfer(req)
  );

  // POST /api/v1/materials/transfers/:id/submit
  router.post(`${prefix}/materials/transfers/:id/submit`, async (req) =>
    transfersController.submitMaterialTransfer(req)
  );

  // POST /api/v1/materials/transfers/:id/approve
  router.post(`${prefix}/materials/transfers/:id/approve`, async (req) =>
    transfersController.approveMaterialTransfer(req)
  );

  // POST /api/v1/materials/transfers/:id/reject
  router.post(`${prefix}/materials/transfers/:id/reject`, async (req) =>
    transfersController.rejectMaterialTransfer(req)
  );

  // POST /api/v1/materials/transfers/:id/cancel
  router.post(`${prefix}/materials/transfers/:id/cancel`, async (req) =>
    transfersController.cancelMaterialTransfer(req)
  );

  // POST /api/v1/materials/transfers/:id/dispatch
  router.post(`${prefix}/materials/transfers/:id/dispatch`, async (req) =>
    transfersController.dispatchMaterialTransfer(req)
  );

  // POST /api/v1/materials/transfers/:id/receive
  router.post(`${prefix}/materials/transfers/:id/receive`, async (req) =>
    transfersController.receiveMaterialTransfer(req)
  );

  // DELETE /api/v1/materials/transfers/:id
  router.delete(`${prefix}/materials/transfers/:id`, async (req) =>
    transfersController.deleteMaterialTransfer(req)
  );

  // ==========================================
  // MATERIAL RETURNS / RETURN TO STORE (Phase 07.7)
  // ==========================================

  // GET /api/v1/materials/returns
  router.get(`${prefix}/materials/returns`, async (req) =>
    returnsController.listMaterialReturns(req)
  );

  // POST /api/v1/materials/returns
  router.post(`${prefix}/materials/returns`, async (req) =>
    returnsController.createMaterialReturn(req)
  );

  // GET /api/v1/materials/returns/:id
  router.get(`${prefix}/materials/returns/:id`, async (req) =>
    returnsController.getMaterialReturn(req)
  );

  // PATCH /api/v1/materials/returns/:id
  router.patch(`${prefix}/materials/returns/:id`, async (req) =>
    returnsController.updateMaterialReturn(req)
  );

  // POST /api/v1/materials/returns/:id/submit
  router.post(`${prefix}/materials/returns/:id/submit`, async (req) =>
    returnsController.submitMaterialReturn(req)
  );

  // POST /api/v1/materials/returns/:id/verify
  router.post(`${prefix}/materials/returns/:id/verify`, async (req) =>
    returnsController.verifyMaterialReturn(req)
  );

  // POST /api/v1/materials/returns/:id/reject
  router.post(`${prefix}/materials/returns/:id/reject`, async (req) =>
    returnsController.rejectMaterialReturn(req)
  );

  // POST /api/v1/materials/returns/:id/cancel
  router.post(`${prefix}/materials/returns/:id/cancel`, async (req) =>
    returnsController.cancelMaterialReturn(req)
  );

  // DELETE /api/v1/materials/returns/:id
  router.delete(`${prefix}/materials/returns/:id`, async (req) =>
    returnsController.deleteMaterialReturn(req)
  );

  // ==========================================
  // MATERIAL ISSUES / STOCK ISSUE (Phase 07.6)
  // ==========================================

  // GET /api/v1/materials/issues
  router.get(`${prefix}/materials/issues`, async (req) =>
    issuesController.listMaterialIssues(req)
  );

  // POST /api/v1/materials/issues
  router.post(`${prefix}/materials/issues`, async (req) =>
    issuesController.createMaterialIssue(req)
  );

  // GET /api/v1/materials/issues/:id
  router.get(`${prefix}/materials/issues/:id`, async (req) =>
    issuesController.getMaterialIssue(req)
  );

  // PATCH /api/v1/materials/issues/:id
  router.patch(`${prefix}/materials/issues/:id`, async (req) =>
    issuesController.updateMaterialIssue(req)
  );

  // POST /api/v1/materials/issues/:id/submit
  router.post(`${prefix}/materials/issues/:id/submit`, async (req) =>
    issuesController.submitMaterialIssue(req)
  );

  // POST /api/v1/materials/issues/:id/approve
  router.post(`${prefix}/materials/issues/:id/approve`, async (req) =>
    issuesController.approveMaterialIssue(req)
  );

  // POST /api/v1/materials/issues/:id/issue
  router.post(`${prefix}/materials/issues/:id/issue`, async (req) =>
    issuesController.issueMaterialIssue(req)
  );

  // POST /api/v1/materials/issues/:id/cancel
  router.post(`${prefix}/materials/issues/:id/cancel`, async (req) =>
    issuesController.cancelMaterialIssue(req)
  );

  // DELETE /api/v1/materials/issues/:id
  router.delete(`${prefix}/materials/issues/:id`, async (req) =>
    issuesController.deleteMaterialIssue(req)
  );

  // ==========================================
  // GOODS RECEIPT NOTES / PHYSICAL RECEIPT (Phase 07.5)
  // ==========================================

  // GET /api/v1/materials/goods-receipts
  router.get(`${prefix}/materials/goods-receipts`, async (req) =>
    grnController.listGoodsReceipts(req)
  );

  // POST /api/v1/materials/goods-receipts
  router.post(`${prefix}/materials/goods-receipts`, async (req) =>
    grnController.createGoodsReceipt(req)
  );

  // GET /api/v1/materials/goods-receipts/:id
  router.get(`${prefix}/materials/goods-receipts/:id`, async (req) =>
    grnController.getGoodsReceipt(req)
  );

  // PATCH /api/v1/materials/goods-receipts/:id
  router.patch(`${prefix}/materials/goods-receipts/:id`, async (req) =>
    grnController.updateGoodsReceipt(req)
  );

  // POST /api/v1/materials/goods-receipts/:id/submit
  router.post(`${prefix}/materials/goods-receipts/:id/submit`, async (req) =>
    grnController.submitGoodsReceipt(req)
  );

  // POST /api/v1/materials/goods-receipts/:id/verify
  router.post(`${prefix}/materials/goods-receipts/:id/verify`, async (req) =>
    grnController.verifyGoodsReceipt(req)
  );

  // POST /api/v1/materials/goods-receipts/:id/reject
  router.post(`${prefix}/materials/goods-receipts/:id/reject`, async (req) =>
    grnController.rejectGoodsReceipt(req)
  );

  // POST /api/v1/materials/goods-receipts/:id/cancel
  router.post(`${prefix}/materials/goods-receipts/:id/cancel`, async (req) =>
    grnController.cancelGoodsReceipt(req)
  );

  // DELETE /api/v1/materials/goods-receipts/:id
  router.delete(`${prefix}/materials/goods-receipts/:id`, async (req) =>
    grnController.deleteGoodsReceipt(req)
  );

  // ==========================================
  // PURCHASE ORDERS / PROCUREMENT (Phase 07.4)
  // ==========================================

  // GET /api/v1/materials/purchase-orders
  router.get(`${prefix}/materials/purchase-orders`, async (req) =>
    poController.listPurchaseOrders(req)
  );

  // POST /api/v1/materials/purchase-orders
  router.post(`${prefix}/materials/purchase-orders`, async (req) =>
    poController.createPurchaseOrder(req)
  );

  // GET /api/v1/materials/purchase-orders/:id
  router.get(`${prefix}/materials/purchase-orders/:id`, async (req) =>
    poController.getPurchaseOrder(req)
  );

  // PATCH /api/v1/materials/purchase-orders/:id
  router.patch(`${prefix}/materials/purchase-orders/:id`, async (req) =>
    poController.updatePurchaseOrder(req)
  );

  // POST /api/v1/materials/purchase-orders/:id/submit
  router.post(`${prefix}/materials/purchase-orders/:id/submit`, async (req) =>
    poController.submitPurchaseOrder(req)
  );

  // POST /api/v1/materials/purchase-orders/:id/approve
  router.post(`${prefix}/materials/purchase-orders/:id/approve`, async (req) =>
    poController.approvePurchaseOrder(req)
  );

  // POST /api/v1/materials/purchase-orders/:id/reject
  router.post(`${prefix}/materials/purchase-orders/:id/reject`, async (req) =>
    poController.rejectPurchaseOrder(req)
  );

  // POST /api/v1/materials/purchase-orders/:id/order
  router.post(`${prefix}/materials/purchase-orders/:id/order`, async (req) =>
    poController.orderPurchaseOrder(req)
  );

  // POST /api/v1/materials/purchase-orders/:id/cancel
  router.post(`${prefix}/materials/purchase-orders/:id/cancel`, async (req) =>
    poController.cancelPurchaseOrder(req)
  );

  // DELETE /api/v1/materials/purchase-orders/:id
  router.delete(`${prefix}/materials/purchase-orders/:id`, async (req) =>
    poController.deletePurchaseOrder(req)
  );

  // ==========================================
  // MATERIAL INDENTS / REQUISITIONS (Phase 07.3)
  // ==========================================

  // GET /api/v1/materials/indents
  router.get(`${prefix}/materials/indents`, async (req) =>
    indentsController.listIndents(req)
  );

  // POST /api/v1/materials/indents
  router.post(`${prefix}/materials/indents`, async (req) =>
    indentsController.createIndent(req)
  );

  // GET /api/v1/materials/indents/:id
  router.get(`${prefix}/materials/indents/:id`, async (req) =>
    indentsController.getIndent(req)
  );

  // PATCH /api/v1/materials/indents/:id
  router.patch(`${prefix}/materials/indents/:id`, async (req) =>
    indentsController.updateIndent(req)
  );

  // POST /api/v1/materials/indents/:id/submit
  router.post(`${prefix}/materials/indents/:id/submit`, async (req) =>
    indentsController.submitIndent(req)
  );

  // POST /api/v1/materials/indents/:id/approve
  router.post(`${prefix}/materials/indents/:id/approve`, async (req) =>
    indentsController.approveIndent(req)
  );

  // POST /api/v1/materials/indents/:id/reject
  router.post(`${prefix}/materials/indents/:id/reject`, async (req) =>
    indentsController.rejectIndent(req)
  );

  // POST /api/v1/materials/indents/:id/cancel
  router.post(`${prefix}/materials/indents/:id/cancel`, async (req) =>
    indentsController.cancelIndent(req)
  );

  // DELETE /api/v1/materials/indents/:id
  router.delete(`${prefix}/materials/indents/:id`, async (req) =>
    indentsController.deleteIndent(req)
  );

  // ==========================================
  // STOCK LEDGER & BALANCE ENGINE (Phase 07.2)
  // ==========================================

  // POST /api/v1/materials/stores/:storeId/stocks/:materialId/adjustments
  router.post(
    `${prefix}/materials/stores/:storeId/stocks/:materialId/adjustments`,
    async (req) => stockController.recordAdjustment(req)
  );

  // GET /api/v1/materials/stores/:storeId/stocks/:materialId/reconcile
  router.get(
    `${prefix}/materials/stores/:storeId/stocks/:materialId/reconcile`,
    async (req) => stockController.reconcileStock(req)
  );

  // GET /api/v1/materials/stores/:storeId/stocks/:materialId
  router.get(
    `${prefix}/materials/stores/:storeId/stocks/:materialId`,
    async (req) => stockController.getStockBalance(req)
  );

  // GET /api/v1/materials/stores/:storeId/stocks
  router.get(
    `${prefix}/materials/stores/:storeId/stocks`,
    async (req) => stockController.listStoreStocks(req)
  );

  // GET /api/v1/materials/stores/:storeId/movements
  router.get(
    `${prefix}/materials/stores/:storeId/movements`,
    async (req) => stockController.listStoreMovements(req)
  );

  // ==========================================
  // STORES / WAREHOUSES (Phase 07.1)
  // ==========================================

  // GET /api/v1/materials/stores
  router.get(`${prefix}/materials/stores`, async (req) =>
    storesController.listStores(req)
  );

  // POST /api/v1/materials/stores
  router.post(`${prefix}/materials/stores`, async (req) =>
    storesController.createStore(req)
  );

  // GET /api/v1/materials/stores/:storeId
  router.get(`${prefix}/materials/stores/:storeId`, async (req) =>
    storesController.getStore(req)
  );

  // PATCH /api/v1/materials/stores/:storeId
  router.patch(`${prefix}/materials/stores/:storeId`, async (req) =>
    storesController.updateStore(req)
  );

  // ==========================================
  // MATERIAL MASTER (Phase 07.1)
  // ==========================================

  // GET /api/v1/materials
  router.get(`${prefix}/materials`, async (req) =>
    materialsController.listMaterials(req)
  );

  // POST /api/v1/materials
  router.post(`${prefix}/materials`, async (req) =>
    materialsController.createMaterial(req)
  );

  // GET /api/v1/materials/:id
  router.get(`${prefix}/materials/:id`, async (req) =>
    materialsController.getMaterial(req)
  );

  // PATCH /api/v1/materials/:id
  router.patch(`${prefix}/materials/:id`, async (req) =>
    materialsController.updateMaterial(req)
  );

  // ==========================================
  // VENDOR MASTER (Phase 07.1)
  // ==========================================

  // GET /api/v1/vendors
  router.get(`${prefix}/vendors`, async (req) =>
    vendorsController.listVendors(req)
  );

  // POST /api/v1/vendors
  router.post(`${prefix}/vendors`, async (req) =>
    vendorsController.createVendor(req)
  );

  // GET /api/v1/vendors/:id
  router.get(`${prefix}/vendors/:id`, async (req) =>
    vendorsController.getVendor(req)
  );

  // PATCH /api/v1/vendors/:id
  router.patch(`${prefix}/vendors/:id`, async (req) =>
    vendorsController.updateVendor(req)
  );
}

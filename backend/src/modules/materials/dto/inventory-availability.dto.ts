import { z } from 'zod';

export const ListAvailabilityQuerySchema = z.object({
  storeId: z.string().uuid('Invalid store UUID format').optional(),
  projectId: z.string().uuid('Invalid project UUID format').optional(),
  materialId: z.string().uuid('Invalid material UUID format').optional(),
  category: z.string().max(100).optional(),
  search: z.string().max(100).optional(),
  belowReorderOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  belowSafetyOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export interface ListAvailabilityQueryDto {
  storeId?: string;
  projectId?: string;
  materialId?: string;
  category?: string;
  search?: string;
  belowReorderOnly?: boolean;
  belowSafetyOnly?: boolean;
  page?: number;
  limit?: number;
}

export const GetShortagesQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project UUID format').optional(),
  storeId: z.string().uuid('Invalid store UUID format').optional(),
  category: z.string().max(100).optional(),
  severity: z
    .enum(['ALL', 'CRITICAL_SAFETY', 'REORDER_POINT', 'PROJECT_SHORTAGE'])
    .default('ALL')
    .optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export interface GetShortagesQueryDto {
  projectId?: string;
  storeId?: string;
  category?: string;
  severity?: 'ALL' | 'CRITICAL_SAFETY' | 'REORDER_POINT' | 'PROJECT_SHORTAGE';
  page?: number;
  limit?: number;
}

export interface StoreBalanceItem {
  storeId: string;
  storeCode: string;
  storeName: string;
  storeType: string;
  isCentralWarehouse: boolean;
  projectId: string | null;
  projectName?: string | null;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  inTransitInbound: number;
  inTransitOutbound: number;
  storeProjectedAvailable: number;
}

export interface MaterialAvailabilityItem {
  materialId: string;
  itemCode: string;
  name: string;
  category: string;
  primaryUom: string;
  reorderLevel: number;
  safetyStock: number;
  totalQuantityOnHand: number;
  totalReservedQuantity: number;
  totalAvailableQuantity: number;
  totalInTransitInbound: number;
  totalInTransitOutbound: number;
  totalPendingPOInbound: number;
  totalProjectedAvailable: number;
  reorderAlert: boolean;
  safetyStockAlert: boolean;
  storeBalances: StoreBalanceItem[];
}

export interface ProjectAllocationBreakdown {
  reservationId: string;
  reservationNumber: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  reservedQuantity: number;
  fulfilledQuantity: number;
  releasedQuantity: number;
  remainingReservedQuantity: number;
  priority: string;
  requiredDate: string | null;
  expiryDate: string | null;
  wbsNodeId: string | null;
  taskId: string | null;
}

export interface Material360Availability {
  material: {
    id: string;
    itemCode: string;
    name: string;
    description: string | null;
    category: string;
    primaryUom: string;
    secondaryUom: string | null;
    conversionFactor: number | null;
    standardRate: number;
    reorderLevel: number;
    safetyStock: number;
    status: string;
  };
  summary: {
    totalQuantityOnHand: number;
    totalReservedQuantity: number;
    totalAvailableQuantity: number;
    totalInTransitInbound: number;
    totalInTransitOutbound: number;
    totalPendingPOInbound: number;
    totalProjectedAvailable: number;
    reorderAlert: boolean;
    safetyStockAlert: boolean;
  };
  storeBalances: StoreBalanceItem[];
  activeReservations: ProjectAllocationBreakdown[];
  inTransitTransfers: Array<{
    transferId: string;
    transferNumber: string;
    sourceStoreId: string;
    sourceStoreName: string;
    destinationStoreId: string;
    destinationStoreName: string;
    quantityTransferred: number;
    dispatchDate: string | null;
  }>;
  pendingPurchaseOrders: Array<{
    purchaseOrderId: string;
    poNumber: string;
    projectId: string;
    projectName: string;
    vendorId: string;
    vendorName: string;
    quantityOrdered: number;
    quantityReceived: number;
    remainingQuantity: number;
    expectedDeliveryDate: string | null;
  }>;
}

export interface ProjectMaterialPositionItem {
  materialId: string;
  itemCode: string;
  name: string;
  category: string;
  primaryUom: string;
  siteStoresPhysicalOnHand: number;
  siteStoresReservedQuantity: number;
  siteStoresFreeAvailable: number;
  centralWarehouseAllocatedReserved: number;
  totalProjectControlledStock: number;
  inTransitTransferInbound: number;
  pendingPOInbound: number;
  totalProjectProjectedSupply: number;
  openIndentDemand: number;
  activeReservationDemand: number;
  immediateSiteShortage: number;
  netProjectShortage: number;
}

export interface ProjectAvailabilityPosition {
  project: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
  siteStores: Array<{
    id: string;
    code: string;
    name: string;
    storeType: string;
  }>;
  materialPositions: ProjectMaterialPositionItem[];
}

export interface StoreAvailabilityPosition {
  store: {
    id: string;
    code: string;
    name: string;
    storeType: string;
    isCentralWarehouse: boolean;
    projectId: string | null;
    projectName: string | null;
    status: string;
  };
  materialBalances: Array<{
    materialId: string;
    itemCode: string;
    name: string;
    category: string;
    primaryUom: string;
    quantityOnHand: number;
    reservedQuantity: number;
    availableQuantity: number;
    inTransitInbound: number;
    inTransitOutbound: number;
    storeProjectedAvailable: number;
    reorderLevel: number;
    safetyStock: number;
    reorderAlert: boolean;
    safetyStockAlert: boolean;
  }>;
  centralStoreProjectAllocations?: ProjectAllocationBreakdown[];
}

export interface MaterialShortageItem {
  materialId: string;
  itemCode: string;
  name: string;
  category: string;
  primaryUom: string;
  reorderLevel: number;
  safetyStock: number;
  totalOnHand: number;
  totalReserved: number;
  totalFreeAvailable: number;
  totalInTransitInbound: number;
  totalPendingPOInbound: number;
  totalProjectedSupply: number;
  totalDemand: number;
  immediateShortage: number;
  netShortage: number;
  severity: 'CRITICAL_SAFETY' | 'REORDER_POINT' | 'PROJECT_SHORTAGE' | 'NORMAL';
  reorderAlert: boolean;
  safetyStockAlert: boolean;
  affectedProjects: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    demandQuantity: number;
    siteAvailable: number;
    centralAllocated: number;
    netShortage: number;
  }>;
}

import { apiClient } from "../client";
import type {
  MaterialDto,
  CreateMaterialRequest,
  StoreDto,
  CreateStoreRequest,
  VendorDto,
  CreateVendorRequest,
  MaterialIndentDto,
  CreateIndentRequest,
  PurchaseOrderDto,
  CreatePurchaseOrderRequest,
  GoodsReceiptDto,
  CreateGoodsReceiptRequest,
  MaterialIssueDto,
  CreateMaterialIssueRequest,
  MaterialReturnDto,
  CreateMaterialReturnRequest,
  MaterialTransferDto,
  CreateMaterialTransferRequest,
  StockBalanceDto,
  StockMovementDto,
  PaginatedResponse,
} from "../types";

export const materialsApi = {
  // Material Master
  listMaterials: async (params?: { search?: string; category?: string; status?: string }): Promise<MaterialDto[]> => {
    return apiClient.get<MaterialDto[]>("/materials", { params });
  },

  getMaterialById: async (id: string): Promise<MaterialDto> => {
    return apiClient.get<MaterialDto>(`/materials/${id}`);
  },

  createMaterial: async (data: CreateMaterialRequest): Promise<MaterialDto> => {
    return apiClient.post<MaterialDto>("/materials", data);
  },

  updateMaterial: async (id: string, data: Partial<CreateMaterialRequest>): Promise<MaterialDto> => {
    return apiClient.patch<MaterialDto>(`/materials/${id}`, data);
  },

  // Stores
  listStores: async (params?: { projectId?: string }): Promise<StoreDto[]> => {
    return apiClient.get<StoreDto[]>("/materials/stores", { params });
  },

  getStoreById: async (storeId: string): Promise<StoreDto> => {
    return apiClient.get<StoreDto>(`/materials/stores/${storeId}`);
  },

  createStore: async (data: CreateStoreRequest): Promise<StoreDto> => {
    return apiClient.post<StoreDto>("/materials/stores", data);
  },

  // Vendors
  listVendors: async (params?: { search?: string }): Promise<VendorDto[]> => {
    return apiClient.get<VendorDto[]>("/vendors", { params });
  },

  createVendor: async (data: CreateVendorRequest): Promise<VendorDto> => {
    return apiClient.post<VendorDto>("/vendors", data);
  },

  // Stock & Balances
  listStoreStocks: async (storeId: string): Promise<StockBalanceDto[]> => {
    return apiClient.get<StockBalanceDto[]>(`/materials/stores/${storeId}/stocks`);
  },

  getStockBalance: async (storeId: string, materialId: string): Promise<StockBalanceDto> => {
    return apiClient.get<StockBalanceDto>(`/materials/stores/${storeId}/stocks/${materialId}`);
  },

  listStoreMovements: async (storeId: string): Promise<StockMovementDto[]> => {
    return apiClient.get<StockMovementDto[]>(`/materials/stores/${storeId}/movements`);
  },

  // Indents
  listIndents: async (params?: { projectId?: string; status?: string }): Promise<MaterialIndentDto[]> => {
    return apiClient.get<MaterialIndentDto[]>("/materials/indents", { params });
  },

  getIndentById: async (id: string): Promise<MaterialIndentDto> => {
    return apiClient.get<MaterialIndentDto>(`/materials/indents/${id}`);
  },

  createIndent: async (data: CreateIndentRequest): Promise<MaterialIndentDto> => {
    return apiClient.post<MaterialIndentDto>("/materials/indents", data);
  },

  submitIndent: async (id: string): Promise<MaterialIndentDto> => {
    return apiClient.post<MaterialIndentDto>(`/materials/indents/${id}/submit`);
  },

  approveIndent: async (id: string, approvalRemarks?: string): Promise<MaterialIndentDto> => {
    return apiClient.post<MaterialIndentDto>(`/materials/indents/${id}/approve`, { approvalRemarks });
  },

  // Purchase Orders
  listPurchaseOrders: async (params?: { projectId?: string; status?: string }): Promise<PurchaseOrderDto[]> => {
    return apiClient.get<PurchaseOrderDto[]>("/materials/purchase-orders", { params });
  },

  getPurchaseOrderById: async (id: string): Promise<PurchaseOrderDto> => {
    return apiClient.get<PurchaseOrderDto>(`/materials/purchase-orders/${id}`);
  },

  createPurchaseOrder: async (data: CreatePurchaseOrderRequest): Promise<PurchaseOrderDto> => {
    return apiClient.post<PurchaseOrderDto>("/materials/purchase-orders", data);
  },

  submitPurchaseOrder: async (id: string, notes?: string): Promise<PurchaseOrderDto> => {
    return apiClient.post<PurchaseOrderDto>(`/materials/purchase-orders/${id}/submit`, { notes });
  },

  approvePurchaseOrder: async (id: string, approvalRemarks?: string): Promise<PurchaseOrderDto> => {
    return apiClient.post<PurchaseOrderDto>(`/materials/purchase-orders/${id}/approve`, { approvalRemarks });
  },

  orderPurchaseOrder: async (id: string, notes?: string): Promise<PurchaseOrderDto> => {
    return apiClient.post<PurchaseOrderDto>(`/materials/purchase-orders/${id}/order`, { notes });
  },

  // Goods Receipts (GRN)
  listGoodsReceipts: async (params?: { storeId?: string; status?: string; projectId?: string }): Promise<GoodsReceiptDto[]> => {
    return apiClient.get<GoodsReceiptDto[]>("/materials/goods-receipts", { params });
  },

  createGoodsReceipt: async (data: CreateGoodsReceiptRequest): Promise<GoodsReceiptDto> => {
    return apiClient.post<GoodsReceiptDto>("/materials/goods-receipts", data);
  },

  submitGoodsReceipt: async (id: string, remarks?: string): Promise<GoodsReceiptDto> => {
    return apiClient.post<GoodsReceiptDto>(`/materials/goods-receipts/${id}/submit`, { remarks });
  },

  verifyGoodsReceipt: async (id: string, verificationRemarks?: string): Promise<GoodsReceiptDto> => {
    return apiClient.post<GoodsReceiptDto>(`/materials/goods-receipts/${id}/verify`, { verificationRemarks });
  },

  // Material Issues
  listMaterialIssues: async (params?: { storeId?: string; projectId?: string }): Promise<MaterialIssueDto[]> => {
    return apiClient.get<MaterialIssueDto[]>("/materials/issues", { params });
  },

  createMaterialIssue: async (data: CreateMaterialIssueRequest): Promise<MaterialIssueDto> => {
    return apiClient.post<MaterialIssueDto>("/materials/issues", data);
  },

  approveMaterialIssue: async (id: string): Promise<MaterialIssueDto> => {
    return apiClient.post<MaterialIssueDto>(`/materials/issues/${id}/approve`);
  },

  issueMaterialIssue: async (id: string): Promise<MaterialIssueDto> => {
    return apiClient.post<MaterialIssueDto>(`/materials/issues/${id}/issue`);
  },

  // Material Returns
  listMaterialReturns: async (params?: { storeId?: string }): Promise<MaterialReturnDto[]> => {
    return apiClient.get<MaterialReturnDto[]>("/materials/returns", { params });
  },

  createMaterialReturn: async (data: CreateMaterialReturnRequest): Promise<MaterialReturnDto> => {
    return apiClient.post<MaterialReturnDto>("/materials/returns", data);
  },

  // Material Transfers
  listMaterialTransfers: async (): Promise<MaterialTransferDto[]> => {
    return apiClient.get<MaterialTransferDto[]>("/materials/transfers");
  },

  createMaterialTransfer: async (data: CreateMaterialTransferRequest): Promise<MaterialTransferDto> => {
    return apiClient.post<MaterialTransferDto>("/materials/transfers", data);
  },

  // Shortages & Availability
  listAvailability: async (params?: { projectId?: string; storeId?: string }): Promise<any[]> => {
    return apiClient.get<any[]>("/materials/availability", { params });
  },

  getShortages: async (params?: { projectId?: string }): Promise<any[]> => {
    return apiClient.get<any[]>("/materials/shortages", { params });
  },
};

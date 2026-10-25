import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type {
  CreateMaterialRequest,
  CreateStoreRequest,
  CreateVendorRequest,
  CreateIndentRequest,
  CreatePurchaseOrderRequest,
  CreateGoodsReceiptRequest,
  CreateMaterialIssueRequest,
  CreateMaterialReturnRequest,
  CreateMaterialTransferRequest,
} from "@/lib/api";

export function useMaterialsList(params?: { search?: string; category?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.list(params),
    queryFn: () => materialsApi.listMaterials(params),
    staleTime: 30_000,
  });
}

export function useStoresList(params?: { projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.stores(params),
    queryFn: () => materialsApi.listStores(params),
    staleTime: 30_000,
  });
}

export function useStoreStocks(storeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.materials.stocks(storeId || ""),
    queryFn: () => materialsApi.listStoreStocks(storeId!),
    enabled: Boolean(storeId),
  });
}

export function useVendorsList(params?: { search?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.vendors(params),
    queryFn: () => materialsApi.listVendors(params),
    staleTime: 60_000,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorRequest) => materialsApi.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
    },
  });
}

export function useMaterialIndents(params?: { projectId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.indents(params),
    queryFn: () => materialsApi.listIndents(params),
  });
}

export function useCreateIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateIndentRequest) => materialsApi.createIndent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useSubmitIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => materialsApi.submitIndent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useApproveIndent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approvalRemarks, notes }: { id: string; approvalRemarks?: string; notes?: string }) =>
      materialsApi.approveIndent(id, approvalRemarks ?? notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function usePurchaseOrders(params?: { projectId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.purchaseOrders(params),
    queryFn: () => materialsApi.listPurchaseOrders(params),
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseOrderRequest) => materialsApi.createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => materialsApi.submitPurchaseOrder(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approvalRemarks }: { id: string; approvalRemarks?: string }) =>
      materialsApi.approvePurchaseOrder(id, approvalRemarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

export function useOrderPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => materialsApi.orderPurchaseOrder(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

export function useGoodsReceipts(params?: { storeId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.goodsReceipts(params),
    queryFn: () => materialsApi.listGoodsReceipts(params),
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoodsReceiptRequest) => materialsApi.createGoodsReceipt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useSubmitGoodsReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => materialsApi.submitGoodsReceipt(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useVerifyGoodsReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks, verificationRemarks }: { id: string; remarks?: string; verificationRemarks?: string }) =>
      materialsApi.verifyGoodsReceipt(id, verificationRemarks ?? remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useMaterialIssues(params?: { storeId?: string; projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.issues(params),
    queryFn: () => materialsApi.listMaterialIssues(params),
  });
}

export function useCreateMaterialIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaterialIssueRequest) => materialsApi.createMaterialIssue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useMaterialReturns(params?: { storeId?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.returns(params),
    queryFn: () => materialsApi.listMaterialReturns(params),
  });
}

export function useCreateMaterialReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaterialReturnRequest) => materialsApi.createMaterialReturn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
    },
  });
}

export function useMaterialTransfers() {
  return useQuery({
    queryKey: queryKeys.materials.transfers(),
    queryFn: () => materialsApi.listMaterialTransfers(),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type {
  CreateExpenseRequest,
  CreateInvoiceRequest,
  CreateRaBillRequest,
  CreatePaymentVoucherRequest,
  CreateAdvanceRequest,
} from "@/lib/api";

export function useExpensesList(params?: { projectId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.finance.expenses(params),
    queryFn: () => financeApi.listExpenses(params),
    staleTime: 30_000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => financeApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.controlTower.all });
    },
  });
}

export function useSubmitExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.submitExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => financeApi.approveExpense(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useInvoicesList(params?: { projectId?: string; vendorId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.finance.invoices(params),
    queryFn: () => financeApi.listInvoices(params),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceRequest) => financeApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useRaBillsList(params?: { projectId?: string; contractorId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.finance.raBills(params),
    queryFn: () => financeApi.listRaBills(params),
  });
}

export function useCreateRaBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRaBillRequest) => financeApi.createRaBill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function usePaymentsList(params?: { projectId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.finance.payments(params),
    queryFn: () => financeApi.listPayments(params),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentVoucherRequest) => financeApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useAdvancesList(params?: { projectId?: string; payeeType?: string }) {
  return useQuery({
    queryKey: queryKeys.finance.advances(params),
    queryFn: () => financeApi.listAdvances(params),
  });
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdvanceRequest) => financeApi.createAdvance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

export function useProjectCostSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.projectCostSummary(projectId || ""),
    queryFn: () => financeApi.getProjectCostSummary(projectId!),
    enabled: Boolean(projectId),
  });
}

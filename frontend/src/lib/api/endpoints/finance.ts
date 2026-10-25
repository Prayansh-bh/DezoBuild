import { apiClient } from "../client";
import type {
  ExpenseDto,
  CreateExpenseRequest,
  InvoiceDto,
  CreateInvoiceRequest,
  RaBillDto,
  CreateRaBillRequest,
  PaymentVoucherDto,
  CreatePaymentVoucherRequest,
  AdvanceDto,
  CreateAdvanceRequest,
  ProjectCostSummaryDto,
  PaginatedResponse,
} from "../types";

export const financeApi = {
  // Expenses
  listExpenses: async (params?: { projectId?: string; status?: string }): Promise<ExpenseDto[]> => {
    return apiClient.get<ExpenseDto[]>("/finance/expenses", { params });
  },

  getExpenseById: async (id: string): Promise<ExpenseDto> => {
    return apiClient.get<ExpenseDto>(`/finance/expenses/${id}`);
  },

  createExpense: async (data: CreateExpenseRequest): Promise<ExpenseDto> => {
    return apiClient.post<ExpenseDto>("/finance/expenses", data);
  },

  submitExpense: async (id: string): Promise<ExpenseDto> => {
    return apiClient.post<ExpenseDto>(`/finance/expenses/${id}/submit`);
  },

  approveExpense: async (id: string, notes?: string): Promise<ExpenseDto> => {
    return apiClient.post<ExpenseDto>(`/finance/expenses/${id}/approve`, { notes });
  },

  rejectExpense: async (id: string, reason?: string): Promise<ExpenseDto> => {
    return apiClient.post<ExpenseDto>(`/finance/expenses/${id}/reject`, { reason });
  },

  listCategories: async (): Promise<any[]> => {
    return apiClient.get<any[]>("/finance/expense-categories");
  },

  // Invoices
  listInvoices: async (params?: { projectId?: string; vendorId?: string; status?: string }): Promise<InvoiceDto[]> => {
    return apiClient.get<InvoiceDto[]>("/finance/invoices", { params });
  },

  getInvoiceById: async (id: string): Promise<InvoiceDto> => {
    return apiClient.get<InvoiceDto>(`/finance/invoices/${id}`);
  },

  createInvoice: async (data: CreateInvoiceRequest): Promise<InvoiceDto> => {
    return apiClient.post<InvoiceDto>("/finance/invoices", data);
  },

  verifyInvoice: async (id: string, notes?: string): Promise<InvoiceDto> => {
    return apiClient.post<InvoiceDto>(`/finance/invoices/${id}/verify`, { notes });
  },

  approveInvoice: async (id: string, notes?: string): Promise<InvoiceDto> => {
    return apiClient.post<InvoiceDto>(`/finance/invoices/${id}/approve`, { notes });
  },

  // RA Bills
  listRaBills: async (params?: { projectId?: string; contractorId?: string; status?: string }): Promise<RaBillDto[]> => {
    return apiClient.get<RaBillDto[]>("/finance/ra-bills", { params });
  },

  getRaBillById: async (id: string): Promise<RaBillDto> => {
    return apiClient.get<RaBillDto>(`/finance/ra-bills/${id}`);
  },

  createRaBill: async (data: CreateRaBillRequest): Promise<RaBillDto> => {
    return apiClient.post<RaBillDto>("/finance/ra-bills", data);
  },

  verifyRaBill: async (id: string, notes?: string): Promise<RaBillDto> => {
    return apiClient.post<RaBillDto>(`/finance/ra-bills/${id}/verify`, { notes });
  },

  approveRaBill: async (id: string, notes?: string): Promise<RaBillDto> => {
    return apiClient.post<RaBillDto>(`/finance/ra-bills/${id}/approve`, { notes });
  },

  // Payments
  listPayments: async (params?: { projectId?: string; status?: string }): Promise<PaymentVoucherDto[]> => {
    return apiClient.get<PaymentVoucherDto[]>("/finance/payments", { params });
  },

  getPaymentById: async (id: string): Promise<PaymentVoucherDto> => {
    return apiClient.get<PaymentVoucherDto>(`/finance/payments/${id}`);
  },

  createPayment: async (data: CreatePaymentVoucherRequest): Promise<PaymentVoucherDto> => {
    return apiClient.post<PaymentVoucherDto>("/finance/payments", data);
  },

  approvePayment: async (id: string, notes?: string): Promise<PaymentVoucherDto> => {
    return apiClient.post<PaymentVoucherDto>(`/finance/payments/${id}/approve`, { notes });
  },

  disbursePayment: async (id: string, details?: any): Promise<PaymentVoucherDto> => {
    return apiClient.post<PaymentVoucherDto>(`/finance/payments/${id}/disburse`, details);
  },

  // Advances
  listAdvances: async (params?: { projectId?: string; payeeType?: string }): Promise<AdvanceDto[]> => {
    return apiClient.get<AdvanceDto[]>("/finance/advances", { params });
  },

  createAdvance: async (data: CreateAdvanceRequest): Promise<AdvanceDto> => {
    return apiClient.post<AdvanceDto>("/finance/advances", data);
  },

  // Payables
  listPayables: async (params?: { projectId?: string }): Promise<any[]> => {
    return apiClient.get<any[]>("/finance/payables", { params });
  },

  // Project Cost Summary
  getProjectCostSummary: async (projectId: string): Promise<ProjectCostSummaryDto> => {
    return apiClient.get<ProjectCostSummaryDto>(`/finance/projects/${projectId}/summary`);
  },
};

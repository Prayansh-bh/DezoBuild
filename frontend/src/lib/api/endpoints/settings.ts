import { apiClient } from "../client";

export interface TenantSettingsDto {
  id: string;
  name: string;
  code: string;
  currency?: string;
  fiscalYearStart?: number;
  timezone?: string;
  status: string;
}

export interface CompanyDto {
  id: string;
  tenantId: string;
  legalName: string;
  tradeName?: string;
  taxId?: string;
  currency: string;
  country: string;
  status: string;
}

export interface BranchDto {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  city?: string;
  state?: string;
  country?: string;
  isHeadquarters?: boolean;
}

export interface DepartmentDto {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
}

export const settingsApi = {
  // Tenancy & Organization
  getTenant: async (id: string): Promise<TenantSettingsDto> => {
    return apiClient.get<TenantSettingsDto>(`/tenants/${id}`);
  },

  updateTenant: async (id: string, data: Partial<TenantSettingsDto>): Promise<TenantSettingsDto> => {
    return apiClient.patch<TenantSettingsDto>(`/tenants/${id}`, data);
  },

  listCompanies: async (): Promise<CompanyDto[]> => {
    return apiClient.get<CompanyDto[]>("/companies");
  },

  createCompany: async (data: Partial<CompanyDto>): Promise<CompanyDto> => {
    return apiClient.post<CompanyDto>("/companies", data);
  },

  listBranches: async (params?: { companyId?: string }): Promise<BranchDto[]> => {
    return apiClient.get<BranchDto[]>("/branches", { params });
  },

  listDepartments: async (params?: { companyId?: string }): Promise<DepartmentDto[]> => {
    return apiClient.get<DepartmentDto[]>("/departments", { params });
  },
};

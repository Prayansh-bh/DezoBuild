import { ownerApiClient } from "./client";
import { platformAuthApi } from "./auth";

export interface PlatformTenantListItem {
  id: string;
  code: string;
  name: string;
  domain: string | null;
  status: string;
  planTier: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  companyCount: number;
  userCount: number;
  projectCount: number;
  subscription: {
    status: string;
    billingCycle: string;
    planCode: string;
    planName: string;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
  } | null;
}

export interface PaginatedPlatformTenants {
  items: PlatformTenantListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProvisionTenantDto {
  code: string;
  name: string;
  legalName?: string;
  domain?: string;
  planTier: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  currency?: string;
  currencySymbol?: string;
  timezone?: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
}

export interface ProvisionedTenantResult {
  id: string;
  code: string;
  name: string;
  domain: string | null;
  planTier: string;
  status: string;
  companyId: string;
  branchId: string;
  adminUser: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  createdAt: string;
}

export const platformTenantsApi = {
  async listTenants(params?: {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    status?: string | undefined;
  }): Promise<PaginatedPlatformTenants> {
    await platformAuthApi.ensureAuthenticated();
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.status && params.status !== "all") query.set("status", params.status);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return ownerApiClient.get<PaginatedPlatformTenants>(`/platform/tenants${queryString}`);
  },

  async getTenant(id: string): Promise<PlatformTenantListItem> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.get<PlatformTenantListItem>(`/platform/tenants/${id}`);
  },

  async provisionTenant(dto: ProvisionTenantDto): Promise<ProvisionedTenantResult> {
    await platformAuthApi.ensureAuthenticated();
    return ownerApiClient.post<ProvisionedTenantResult>("/platform/tenants", dto);
  },
};

export interface TenantEntity {
  id: string;
  code: string;
  name: string;
  domain?: string | null;
  status: string;
  planTier: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateTenantParams {
  id?: string | undefined;
  code: string;
  name: string;
  domain?: string | undefined;
  planTier?: string | undefined;
  currency?: string | undefined;
  currencySymbol?: string | undefined;
  timezone?: string | undefined;
}

export interface UpdateTenantParams {
  name?: string | undefined;
  domain?: string | undefined;
  status?: string | undefined;
  currency?: string | undefined;
  currencySymbol?: string | undefined;
  timezone?: string | undefined;
}

export interface ITenantRepository {
  findById(id: string): Promise<TenantEntity | null>;
  findByCode(code: string): Promise<TenantEntity | null>;
  create(params: CreateTenantParams): Promise<TenantEntity>;
  update(id: string, params: UpdateTenantParams): Promise<TenantEntity>;
  softDelete(id: string): Promise<void>;
}

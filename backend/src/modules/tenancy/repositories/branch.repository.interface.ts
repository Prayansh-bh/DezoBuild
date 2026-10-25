export interface BranchEntity {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  gstin: string;
  city: string;
  state: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBranchParams {
  id?: string | undefined;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  gstin: string;
  city: string;
  state: string;
  status?: string | undefined;
}

export interface UpdateBranchParams {
  name?: string | undefined;
  gstin?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  status?: string | undefined;
}

export interface IBranchRepository {
  findById(id: string, tenantId: string): Promise<BranchEntity | null>;
  findByCode(code: string, companyId: string, tenantId: string): Promise<BranchEntity | null>;
  findManyByTenant(tenantId: string, companyId?: string): Promise<BranchEntity[]>;
  create(params: CreateBranchParams): Promise<BranchEntity>;
  update(id: string, tenantId: string, params: UpdateBranchParams): Promise<BranchEntity>;
  delete(id: string, tenantId: string): Promise<void>;
}

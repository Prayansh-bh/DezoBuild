export interface CompanyEntity {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  legalName: string;
  cinNumber?: string | null;
  panNumber: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyParams {
  id?: string | undefined;
  tenantId: string;
  code: string;
  name: string;
  legalName: string;
  cinNumber?: string | undefined;
  panNumber: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status?: string | undefined;
}

export interface UpdateCompanyParams {
  name?: string | undefined;
  legalName?: string | undefined;
  cinNumber?: string | undefined;
  panNumber?: string | undefined;
  gstin?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  pincode?: string | undefined;
  status?: string | undefined;
}

export interface ICompanyRepository {
  findById(id: string, tenantId: string): Promise<CompanyEntity | null>;
  findByCode(code: string, tenantId: string): Promise<CompanyEntity | null>;
  findManyByTenant(tenantId: string): Promise<CompanyEntity[]>;
  create(params: CreateCompanyParams): Promise<CompanyEntity>;
  update(id: string, tenantId: string, params: UpdateCompanyParams): Promise<CompanyEntity>;
  delete(id: string, tenantId: string): Promise<void>;
}

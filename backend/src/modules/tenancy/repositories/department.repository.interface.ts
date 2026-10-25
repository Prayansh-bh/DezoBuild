export interface DepartmentEntity {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepartmentParams {
  id?: string | undefined;
  tenantId: string;
  name: string;
  code: string;
  description?: string | undefined;
}

export interface UpdateDepartmentParams {
  name?: string | undefined;
  description?: string | undefined;
}

export interface IDepartmentRepository {
  findById(id: string, tenantId: string): Promise<DepartmentEntity | null>;
  findByCode(code: string, tenantId: string): Promise<DepartmentEntity | null>;
  findManyByTenant(tenantId: string): Promise<DepartmentEntity[]>;
  create(params: CreateDepartmentParams): Promise<DepartmentEntity>;
  update(id: string, tenantId: string, params: UpdateDepartmentParams): Promise<DepartmentEntity>;
  delete(id: string, tenantId: string): Promise<void>;
}

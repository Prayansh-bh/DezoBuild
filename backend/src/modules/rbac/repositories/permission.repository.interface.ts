export interface PermissionEntity {
  id: string;
  name: string;
  module: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePermissionParams {
  id?: string;
  name: string;
  module: string;
  description?: string;
}

export interface IPermissionRepository {
  findById(id: string): Promise<PermissionEntity | null>;
  findByName(name: string): Promise<PermissionEntity | null>;
  findMany(module?: string): Promise<PermissionEntity[]>;
  createMany(params: CreatePermissionParams[]): Promise<void>;
  create(params: CreatePermissionParams): Promise<PermissionEntity>;
}

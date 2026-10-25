export interface RoleEntity {
  id: string;
  tenantId: string | null;
  name: string;
  displayName: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: string[];
}

export interface CreateRoleParams {
  id?: string;
  tenantId?: string | null;
  name: string;
  displayName?: string;
  description?: string;
  isSystemRole?: boolean;
}

export interface IRoleRepository {
  findById(id: string, tenantId?: string): Promise<RoleEntity | null>;
  findByName(name: string, tenantId?: string): Promise<RoleEntity | null>;
  findMany(tenantId?: string): Promise<RoleEntity[]>;
  create(params: CreateRoleParams): Promise<RoleEntity>;
  assignPermissions(roleId: string, permissionIds: string[]): Promise<void>;
  getPermissionsForRole(roleId: string): Promise<string[]>;
}

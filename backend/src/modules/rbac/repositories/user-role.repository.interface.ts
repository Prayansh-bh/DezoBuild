export interface UserRoleAssignmentEntity {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  role?: {
    id: string;
    name: string;
    displayName: string;
    isSystemRole: boolean;
  };
}

export interface AssignRoleParams {
  tenantId: string;
  userId: string;
  roleId: string;
  scopeType?: string;
  scopeId?: string | null;
}

export interface IUserRoleRepository {
  assignRole(params: AssignRoleParams, tx?: any): Promise<UserRoleAssignmentEntity>;
  removeRole(tenantId: string, userId: string, roleId: string, scopeType?: string, scopeId?: string | null): Promise<boolean>;
  findUserRoles(tenantId: string, userId: string): Promise<UserRoleAssignmentEntity[]>;
  hasRole(tenantId: string, userId: string, roleName: string): Promise<boolean>;
  clearUserRoles(tenantId: string, userId: string): Promise<number>;
}

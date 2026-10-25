import { apiClient } from "../client";

export interface PermissionDto {
  id: string;
  name: string;
  description?: string;
  module: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions?: PermissionDto[];
}

export const rbacApi = {
  listPermissions: async (): Promise<PermissionDto[]> => {
    return apiClient.get<PermissionDto[]>("/rbac/permissions");
  },

  listRoles: async (): Promise<RoleDto[]> => {
    return apiClient.get<RoleDto[]>("/rbac/roles");
  },

  getRoleById: async (id: string): Promise<RoleDto> => {
    return apiClient.get<RoleDto>(`/rbac/roles/${id}`);
  },

  getUserRoles: async (userId: string): Promise<RoleDto[]> => {
    return apiClient.get<RoleDto[]>(`/rbac/users/${userId}/roles`);
  },

  assignRole: async (data: { userId: string; roleId: string }): Promise<any> => {
    return apiClient.post("/rbac/users/roles", data);
  },

  removeRole: async (userId: string, roleId: string): Promise<any> => {
    return apiClient.delete(`/rbac/users/${userId}/roles/${roleId}`);
  },
};

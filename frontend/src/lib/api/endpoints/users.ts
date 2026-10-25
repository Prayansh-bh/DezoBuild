import { apiClient } from "../client";
import type { ListTenantUsersResponse } from "../types";

export const usersApi = {
  /**
   * List all SaaS users, their roles, and pending invitations for the current workspace.
   * GET /api/v1/tenants/users
   */
  listTenantUsers: async (): Promise<ListTenantUsersResponse> => {
    return apiClient.get<ListTenantUsersResponse>("/tenants/users");
  },
};

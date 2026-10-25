import { apiClient } from '../client';

export interface WorkspaceModuleStatus {
  featureKey: string;
  name: string;
  domain: string;
  description: string;
  platformEntitled: boolean;
  workspaceEnabled: boolean;
  effectiveActive: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

export const workspaceModulesApi = {
  getWorkspaceModules: async (): Promise<WorkspaceModuleStatus[]> => {
    return apiClient.get<WorkspaceModuleStatus[]>('/tenants/workspace-modules');
  },

  updateWorkspaceModule: async (
    featureKey: string,
    isEnabled: boolean
  ): Promise<WorkspaceModuleStatus> => {
    return apiClient.put<WorkspaceModuleStatus>('/tenants/workspace-modules', {
      featureKey,
      isEnabled,
    });
  },
};

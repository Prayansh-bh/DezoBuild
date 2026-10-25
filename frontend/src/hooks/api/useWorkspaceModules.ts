import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceModulesApi } from "@/lib/api/endpoints/workspace-modules";

export const WORKSPACE_MODULES_QUERY_KEY = ["workspace-modules"] as const;

export function useWorkspaceModules() {
  return useQuery({
    queryKey: WORKSPACE_MODULES_QUERY_KEY,
    queryFn: () => workspaceModulesApi.getWorkspaceModules(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateWorkspaceModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      featureKey,
      isEnabled,
    }: {
      featureKey: string;
      isEnabled: boolean;
    }) => workspaceModulesApi.updateWorkspaceModule(featureKey, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_MODULES_QUERY_KEY });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { controlTowerApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";

export function useControlTowerSummary(params?: { projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.controlTower.summary(params),
    queryFn: () => controlTowerApi.getSummary(params),
    staleTime: 30_000,
  });
}

export function useAiInsights(params?: { projectId?: string; category?: string }) {
  return useQuery({
    queryKey: queryKeys.controlTower.insights(params),
    queryFn: () => controlTowerApi.listInsights(params),
    staleTime: 30_000,
  });
}

export function useAcknowledgeAiInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => controlTowerApi.acknowledgeInsight(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.controlTower.insights() });
    },
  });
}

export function useDismissAiInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => controlTowerApi.dismissInsight(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.controlTower.insights() });
    },
  });
}

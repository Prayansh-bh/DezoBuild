import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalsApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type { SubmitApprovalRequest } from "@/lib/api";

export function useApprovalRequests(params?: { entityType?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.approvals.requests(params),
    queryFn: () => approvalsApi.listRequests(params),
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: queryKeys.approvals.pending(),
    queryFn: () => approvalsApi.listPending(),
    refetchInterval: 60_000,
  });
}

export function useSubmitApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitApprovalRequest) => approvalsApi.submitRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useApproveStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => approvalsApi.approveStep(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

export function useRejectApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => approvalsApi.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useReturnApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => approvalsApi.returnRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useCancelApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => approvalsApi.cancelRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

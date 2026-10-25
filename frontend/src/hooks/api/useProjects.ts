import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type {
  ProjectDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateWbsNodeRequest,
  CreateTaskRequest,
  CreateDprRequest,
  CreateBoqItemRequest,
  CreateDigitalMbEntryRequest,
} from "@/lib/api";

export function useProjectsList(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: async () => {
      const res = await projectsApi.list(params);
      if (Array.isArray(res)) return res;
      return (res as any)?.items || (res as any)?.data || [];
    },
    staleTime: 30_000,
  });
}

export function useProjectDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id || ""),
    queryFn: () => projectsApi.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.controlTower.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) => projectsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useProjectWbs(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.wbs(projectId || ""),
    queryFn: () => projectsApi.getWbs(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateWbsNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateWbsNodeRequest }) =>
      projectsApi.createWbsNode(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.wbs(projectId) });
    },
  });
}

export function useProjectTasks(projectId: string | undefined, params?: { wbsNodeId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.projects.tasks(projectId || "", params),
    queryFn: () => projectsApi.getTasks(projectId!, params),
    enabled: Boolean(projectId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateTaskRequest }) =>
      projectsApi.createTask(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.tasks(projectId) });
    },
  });
}

export function useProjectDprs(projectId: string | undefined, params?: { date?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.projects.dprs(projectId || "", params),
    queryFn: () => projectsApi.getDprs(projectId!, params),
    enabled: Boolean(projectId),
  });
}

export function useCreateDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateDprRequest }) =>
      projectsApi.createDpr(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.dprs(projectId) });
    },
  });
}

export function useSubmitDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, dprId }: { projectId: string; dprId: string }) =>
      projectsApi.submitDpr(projectId, dprId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.dprs(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useApproveDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, dprId, notes }: { projectId: string; dprId: string; notes?: string }) =>
      projectsApi.approveDpr(projectId, dprId, notes),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.dprs(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useProjectBoq(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.boq(projectId || ""),
    queryFn: () => projectsApi.getBoqItems(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectDigitalMb(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.mb(projectId || ""),
    queryFn: () => projectsApi.getDigitalMbEntries(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateBoqItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateBoqItemRequest }) =>
      projectsApi.createBoqItem(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.boq(projectId) });
    },
  });
}

export function useCreateDigitalMbEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateDigitalMbEntryRequest }) =>
      projectsApi.createDigitalMbEntry(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.mb(projectId) });
    },
  });
}

export function useVerifyDigitalMbEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, entryId, remarks }: { projectId: string; entryId: string; remarks?: string }) =>
      projectsApi.verifyDigitalMbEntry(projectId, entryId, remarks),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.mb(projectId) });
    },
  });
}

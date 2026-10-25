import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type {
  CreateDocumentRequest,
  RegisterDocumentVersionRequest,
  CreateTransmittalRequest,
  CreateRfiRequest,
} from "@/lib/api";

export function useDocumentsList(params?: { projectId?: string; category?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.documents.list(params),
    queryFn: () => documentsApi.listDocuments(params),
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocumentRequest) => documentsApi.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useDocumentVersions(documentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.documents.versions(documentId || ""),
    queryFn: () => documentsApi.listVersions(documentId!),
    enabled: Boolean(documentId),
  });
}

export function useRegisterDocumentVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: RegisterDocumentVersionRequest }) =>
      documentsApi.registerVersion(documentId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.versions(documentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useTransmittalsList(params?: { projectId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.documents.transmittals(params),
    queryFn: () => documentsApi.listTransmittals(params),
  });
}

export function useCreateTransmittal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransmittalRequest) => documentsApi.createTransmittal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.transmittals() });
    },
  });
}

export function useRfisList(params?: { projectId?: string; status?: string; priority?: string }) {
  return useQuery({
    queryKey: queryKeys.documents.rfis(params),
    queryFn: () => documentsApi.listRfis(params),
  });
}

export function useCreateRfi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRfiRequest) => documentsApi.createRfi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.rfis() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useSubmitRfi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.submitRfi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.rfis() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
    },
  });
}

export function useRespondRfi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) => documentsApi.respondRfi(id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.rfis() });
    },
  });
}

export function useCloseRfi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.closeRfi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.rfis() });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invitationsApi, rbacApi, type InviteUserRequest, type AcceptInviteRequest } from "@/lib/api";
import { queryKeys } from "./queryKeys";

/**
 * Mutation hook to invite a new team member to the workspace.
 * Invalidates invitations and team-related queries upon success.
 */
export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteUserRequest) => invitationsApi.inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.rbac.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Mutation hook to revoke an existing invitation.
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => invitationsApi.revokeInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.rbac.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Mutation hook to accept an invitation token and establish a session.
 */
export function useAcceptInvite() {
  return useMutation({
    mutationFn: (data: AcceptInviteRequest) => invitationsApi.acceptInvite(data),
  });
}

/**
 * Query hook to list roles from the backend.
 */
export function useRoles() {
  return useQuery({
    queryKey: queryKeys.rbac.roles(),
    queryFn: () => rbacApi.listRoles(),
    staleTime: 60_000,
  });
}

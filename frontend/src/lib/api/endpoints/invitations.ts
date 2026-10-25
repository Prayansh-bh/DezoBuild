import { apiClient } from "../client";
import type {
  InviteUserRequest,
  InvitationDto,
  AcceptInviteRequest,
  AcceptInviteResponse,
} from "../types";

export const invitationsApi = {
  /**
   * Invites a new team member to the caller's tenant.
   * POST /api/v1/tenants/users/invite
   */
  inviteUser: async (data: InviteUserRequest): Promise<InvitationDto> => {
    return apiClient.post<InvitationDto>("/tenants/users/invite", data);
  },

  /**
   * Accepts an invitation token, sets the password, and establishes a real session.
   * POST /api/v1/auth/accept-invite
   */
  acceptInvite: async (data: AcceptInviteRequest): Promise<AcceptInviteResponse> => {
    const res = await apiClient.post<AcceptInviteResponse>("/auth/accept-invite", data, {
      skipAuth: true,
    });
    if (res?.accessToken) {
      apiClient.setTokens(res.accessToken, res.refreshToken);
    }
    return res;
  },

  /**
   * Revokes an existing pending invitation.
   * POST /api/v1/tenants/users/invitations/:id/revoke
   */
  revokeInvitation: async (invitationId: string): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(
      `/tenants/users/invitations/${invitationId}/revoke`,
      {}
    );
  },
};


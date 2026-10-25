import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Invalid email format.")
    .max(255, "Email is too long."),
  fullName: z
    .string({ required_error: "Full name is required." })
    .trim()
    .min(1, "Full name must not be empty.")
    .max(255, "Full name is too long."),
  roleId: z
    .string({ required_error: "Role ID is required." })
    .uuid("Role ID must be a valid UUID."),
});

export type InviteUserDto = z.infer<typeof inviteUserSchema>;

export const acceptInviteSchema = z.object({
  token: z
    .string({ required_error: "Invitation token is required." })
    .trim()
    .min(1, "Invitation token is required."),
  password: z
    .string({ required_error: "Password is required." })
    .min(8, "Password must be at least 8 characters long.")
    .max(255, "Password is too long."),
  fullName: z
    .string()
    .trim()
    .min(1, "Full name must not be empty.")
    .max(255, "Full name is too long.")
    .optional(),
});

export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;

export const revokeInviteParamsSchema = z.object({
  id: z.string().uuid("Invalid invitation ID format."),
});

export type RevokeInviteParamsDto = z.infer<typeof revokeInviteParamsSchema>;

export interface InvitationResponseData {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

import { z } from 'zod';

export const assignRoleDtoSchema = z.object({
  userId: z.string().uuid('Invalid userId UUID'),
  roleId: z.string().uuid('Invalid roleId UUID'),
  scopeType: z.enum(['TENANT', 'COMPANY', 'PROJECT']).default('TENANT'),
  scopeId: z.string().uuid('Invalid scopeId UUID').optional().nullable(),
});

export const removeRoleDtoSchema = z.object({
  userId: z.string().uuid('Invalid userId UUID'),
  roleId: z.string().uuid('Invalid roleId UUID'),
  scopeType: z.enum(['TENANT', 'COMPANY', 'PROJECT']).default('TENANT'),
  scopeId: z.string().uuid('Invalid scopeId UUID').optional().nullable(),
});

export type AssignRoleDto = z.input<typeof assignRoleDtoSchema>;
export type RemoveRoleDto = z.input<typeof removeRoleDtoSchema>;

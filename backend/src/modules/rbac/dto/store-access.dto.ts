import { z } from 'zod';

export const grantStoreAccessDtoSchema = z.object({
  userId: z.string().uuid('Invalid userId UUID'),
  accessLevel: z.enum(['FULL', 'READ_ONLY', 'ISSUE_ONLY']).default('FULL'),
});

export type GrantStoreAccessDto = z.input<typeof grantStoreAccessDtoSchema>;

import { z } from 'zod';

export const addProjectMemberDtoSchema = z.object({
  userId: z.string().uuid('Invalid userId UUID'),
  projectRole: z.string().min(2).max(100).default('MEMBER'),
  isLead: z.boolean().default(false),
});

export type AddProjectMemberDto = z.input<typeof addProjectMemberDtoSchema>;

import { z } from "zod";
import { CANONICAL_FEATURE_KEYS } from "../constants/plan.catalog";

export const updateWorkspaceModuleDtoSchema = z.object({
  featureKey: z.enum(CANONICAL_FEATURE_KEYS as unknown as [string, ...string[]]),
  isEnabled: z.boolean(),
});

export type UpdateWorkspaceModuleDto = z.infer<typeof updateWorkspaceModuleDtoSchema>;

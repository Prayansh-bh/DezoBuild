import { z } from 'zod';
import {
  InspectionType,
  InspectionDiscipline,
  ChecklistItemType,
  ChecklistResult,
} from '../constants/quality.constants.js';

export const createInspectionSchema = z.object({
  projectId: z.string().uuid(),
  wbsNodeId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
  materialId: z.string().uuid().optional().nullable(),
  goodsReceiptId: z.string().uuid().optional().nullable(),
  equipmentId: z.string().uuid().optional().nullable(),
  originalInspectionRequestId: z.string().uuid().optional().nullable(),
  inspectionType: z.nativeEnum(InspectionType),
  discipline: z.nativeEnum(InspectionDiscipline),
  title: z.string().min(3).max(255),
  location: z.string().min(1).max(255),
  element: z.string().min(1).max(255),
  gradeOrSpecification: z.string().max(100).optional().nullable(),
  plannedQuantity: z.number().nonnegative().optional().nullable(),
  unit: z.string().max(20).optional().nullable(),
  isHoldPoint: z.boolean().optional().default(false),
  isWitnessPoint: z.boolean().optional().default(false),
  plannedInspectionAt: z.string().datetime().optional().nullable(),
});
export type CreateInspectionDto = z.infer<typeof createInspectionSchema>;

export const updateDraftInspectionSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  location: z.string().min(1).max(255).optional(),
  element: z.string().min(1).max(255).optional(),
  gradeOrSpecification: z.string().max(100).optional().nullable(),
  plannedQuantity: z.number().nonnegative().optional().nullable(),
  unit: z.string().max(20).optional().nullable(),
  isHoldPoint: z.boolean().optional(),
  isWitnessPoint: z.boolean().optional(),
  plannedInspectionAt: z.string().datetime().optional().nullable(),
});
export type UpdateDraftInspectionDto = z.infer<typeof updateDraftInspectionSchema>;

export const scheduleInspectionSchema = z.object({
  plannedInspectionAt: z.string().datetime(),
  inspectedById: z.string().uuid().optional().nullable(),
});
export type ScheduleInspectionDto = z.infer<typeof scheduleInspectionSchema>;

export const addCustomCheckpointSchema = z.object({
  checkpointCode: z.string().min(1).max(50),
  itemType: z.nativeEnum(ChecklistItemType),
  checkpointCategory: z.string().min(1).max(100),
  checkpointDescription: z.string().min(3),
  acceptanceCriteria: z.string().optional().nullable(),
  isMandatory: z.boolean().optional().default(true),
  unit: z.string().max(20).optional().nullable(),
  sampleReference: z.string().max(100).optional().nullable(),
  testMethod: z.string().max(100).optional().nullable(),
});
export type AddCustomCheckpointDto = z.infer<typeof addCustomCheckpointSchema>;

export const updateCheckpointResultSchema = z.object({
  result: z.nativeEnum(ChecklistResult),
  measuredValue: z.number().optional().nullable(),
  unit: z.string().max(20).optional().nullable(),
  remarks: z.string().optional().nullable(),
  sampleReference: z.string().max(100).optional().nullable(),
  testMethod: z.string().max(100).optional().nullable(),
  isConforming: z.boolean().optional().nullable(),
});
export type UpdateCheckpointResultDto = z.infer<typeof updateCheckpointResultSchema>;

export const submitEvaluationSchema = z.object({
  resultRemarks: z.string().optional().nullable(),
});
export type SubmitEvaluationDto = z.infer<typeof submitEvaluationSchema>;

export const approveInspectionSchema = z.object({
  approvalRemarks: z.string().optional().nullable(),
});
export type ApproveInspectionDto = z.infer<typeof approveInspectionSchema>;

export const conditionalApproveInspectionSchema = z.object({
  conditionalRemarks: z.string().min(10, 'Conditional remarks must be at least 10 characters detailing interim mitigation'),
  actionTitle: z.string().min(3).max(255),
  actionDescription: z.string().min(5),
  assignedToId: z.string().uuid().optional().nullable(),
  assignedVendorId: z.string().uuid().optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('HIGH'),
});
export type ConditionalApproveInspectionDto = z.infer<typeof conditionalApproveInspectionSchema>;

export const rejectInspectionSchema = z.object({
  rejectionReason: z.string().min(5, 'Rejection reason is required and must be at least 5 characters'),
});
export type RejectInspectionDto = z.infer<typeof rejectInspectionSchema>;

export const cancelInspectionSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required'),
});
export type CancelInspectionDto = z.infer<typeof cancelInspectionSchema>;

export const listInspectionsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  inspectionType: z.string().optional(),
  discipline: z.string().optional(),
  isHoldPoint: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type ListInspectionsQueryDto = z.infer<typeof listInspectionsQuerySchema>;

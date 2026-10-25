import { z } from 'zod';
import { EMPLOYMENT_TYPES, EMPLOYMENT_STATUSES } from '../constants/people.constants.js';

export const createEmployeeSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  employeeNumber: z.string().min(1).max(50).trim(),
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  reportingManagerId: z.string().uuid().optional().nullable(),
  fullName: z.string().min(1).max(255).trim(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  designation: z.string().min(1).max(100).trim(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional().default('FULL_TIME'),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional().default('ACTIVE'),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'joiningDate must be YYYY-MM-DD'),
  exitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'exitDate must be YYYY-MM-DD').optional().nullable(),
  emergencyContactName: z.string().max(255).optional().nullable(),
  emergencyContactPhone: z.string().max(50).optional().nullable(),
}).refine(data => {
  if (data.exitDate && data.joiningDate) {
    return new Date(data.exitDate) >= new Date(data.joiningDate);
  }
  return true;
}, {
  message: 'exitDate must be greater than or equal to joiningDate',
  path: ['exitDate'],
});

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  reportingManagerId: z.string().uuid().optional().nullable(),
  fullName: z.string().min(1).max(255).trim().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  designation: z.string().min(1).max(100).trim().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  emergencyContactName: z.string().max(255).optional().nullable(),
  emergencyContactPhone: z.string().max(50).optional().nullable(),
});

export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;

export const updateEmployeeStatusSchema = z.object({
  status: z.enum(EMPLOYMENT_STATUSES),
  exitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'exitDate must be YYYY-MM-DD').optional().nullable(),
  reason: z.string().max(1000).optional(),
});

export type UpdateEmployeeStatusDto = z.infer<typeof updateEmployeeStatusSchema>;

export const listEmployeesQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.enum(EMPLOYMENT_STATUSES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListEmployeesQueryDto = z.infer<typeof listEmployeesQuerySchema>;

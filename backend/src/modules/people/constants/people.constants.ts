/**
 * DEZOBUILD Phase 11: People / Attendance / Workforce Domain Constants & Types
 */

export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'CONTRACT',
  'INTERN',
  'DAILY_WAGE',
  'PART_TIME',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_STATUSES = [
  'ACTIVE',
  'ON_LEAVE',
  'SUSPENDED',
  'RESIGNED',
  'TERMINATED',
  'RETIRED',
] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const PUNCH_TYPES = ['IN', 'OUT'] as const;
export type PunchType = (typeof PUNCH_TYPES)[number];

export const ATTENDANCE_SOURCES = [
  'ONLINE',
  'MOBILE',
  'BIOMETRIC',
  'MANUAL',
  'IMPORT',
  'REGULARIZED',
  'SYSTEM',
] as const;
export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number];

export const ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEK_OFF',
  'REGULARIZED',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const REGULARIZATION_STATUSES = [
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
] as const;
export type RegularizationStatus = (typeof REGULARIZATION_STATUSES)[number];

export const CONTRACTOR_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'BLACKLISTED',
] as const;
export type ContractorStatus = (typeof CONTRACTOR_STATUSES)[number];

export const CONTRACTOR_TRADES = [
  'MASONRY',
  'CARPENTRY',
  'BAR_BENDING',
  'PLUMBING',
  'ELECTRICAL',
  'PAINTING',
  'GENERAL_LABOUR',
  'EARTHWORK',
  'FABRICATION',
  'SCAFFOLDING',
  'OTHER',
] as const;
export type ContractorTrade = (typeof CONTRACTOR_TRADES)[number];

export const MUSTER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
] as const;
export type MusterStatus = (typeof MUSTER_STATUSES)[number];

export const LEAVE_TYPES = [
  'CASUAL',
  'SICK',
  'EARNED',
  'UNPAID',
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = [
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export interface PeopleRequestContext {
  tenantId: string;
  user: {
    id: string;
    email?: string;
  };
  ipAddress?: string;
}

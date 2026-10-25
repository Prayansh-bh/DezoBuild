/**
 * DEZOBUILD Phase 12: Equipment / Machinery / Fuel / Maintenance Domain Constants & Types
 */

export const EQUIPMENT_CATEGORIES = [
  'EARTHMOVING',
  'LIFTING',
  'CONCRETE',
  'POWER_GENERATION',
  'TRANSPORT_HAULAGE',
  'COMPACTION_ROAD',
  'PILING_FOUNDATION',
  'UTILITY_MISC',
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export const EQUIPMENT_STATUSES = [
  'AVAILABLE',
  'ASSIGNED',
  'UNDER_MAINTENANCE',
  'BREAKDOWN',
  'RETIRED',
  'DISPOSED',
] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const OWNERSHIP_TYPES = [
  'OWNED',
  'RENTED',
  'LEASED',
  'SUBCONTRACTOR_SUPPLIED',
] as const;
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];

export const METER_TYPES = [
  'HOURS',
  'KILOMETERS',
] as const;
export type MeterType = (typeof METER_TYPES)[number];

export const FUEL_TYPES = [
  'DIESEL',
  'PETROL',
  'ELECTRIC',
  'DUAL_FUEL',
  'NONE',
] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const ASSIGNMENT_STATUSES = [
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const FUEL_SOURCES = [
  'INTERNAL_STORE',
  'EXTERNAL_VENDOR',
  'SITE_BOWSER',
] as const;
export type FuelSource = (typeof FUEL_SOURCES)[number];

export const MAINTENANCE_TYPES = [
  'PREVENTIVE',
  'BREAKDOWN',
  'ROUTINE_SERVICE',
  'STATUTORY_INSPECTION',
  'EMERGENCY',
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const WORK_ORDER_CATEGORIES = [
  'PREVENTIVE',
  'BREAKDOWN',
  'ROUTINE_SERVICE',
  'STATUTORY_INSPECTION',
  'EMERGENCY',
] as const;
export type WorkOrderCategory = (typeof WORK_ORDER_CATEGORIES)[number];

export const WORK_ORDER_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export const WORK_ORDER_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const SERVICE_PROVIDER_TYPES = [
  'INTERNAL',
  'VENDOR',
] as const;
export type ServiceProviderType = (typeof SERVICE_PROVIDER_TYPES)[number];

export const EQUIPMENT_AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE_METADATA',
  'ASSIGN',
  'DEMOBILIZE',
  'FUEL_LOG',
  'METER_CORRECTION',
  'BREAKDOWN_REPORT',
  'WORK_ORDER_COMPLETE',
  'RETIRE',
  'DISPOSE',
] as const;
export type EquipmentAuditAction = (typeof EQUIPMENT_AUDIT_ACTIONS)[number];

export const EQUIPMENT_ENTITY_TYPES = [
  'EQUIPMENT',
  'ASSIGNMENT',
  'OPERATING_LOG',
  'FUEL_LOG',
  'WORK_ORDER',
  'SCHEDULE',
] as const;
export type EquipmentEntityType = (typeof EQUIPMENT_ENTITY_TYPES)[number];

export interface EquipmentRequestContext {
  tenantId: string;
  user: {
    id: string;
    email?: string;
  };
  ipAddress?: string;
}

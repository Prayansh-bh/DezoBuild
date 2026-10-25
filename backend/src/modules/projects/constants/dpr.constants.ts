/**
 * DEZOBUILD Daily Progress Reports (DPR) Constants
 */

export const DPR_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
export type DprStatus = (typeof DPR_STATUSES)[number];

export const DPR_WEATHER_TYPES = [
  'SUNNY',
  'CLOUDY',
  'RAINY',
  'WINDY',
  'OVERCAST',
  'STORMY',
] as const;
export type DprWeatherType = (typeof DPR_WEATHER_TYPES)[number];

export const DPR_SHIFT_TYPES = [
  'GENERAL',
  'FIRST',
  'SECOND',
  'NIGHT',
] as const;
export type DprShiftType = (typeof DPR_SHIFT_TYPES)[number];

export const DPR_EQUIPMENT_STATUSES = [
  'RUNNING',
  'IDLE',
  'BREAKDOWN',
] as const;
export type DprEquipmentStatus = (typeof DPR_EQUIPMENT_STATUSES)[number];

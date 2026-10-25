/**
 * DEZOBUILD Bill of Quantities (BOQ) & Digital Measurement Book (MB) Constants
 *
 * Defines the canonical statuses, measurement types, UOM categories,
 * and dimensional calculation rules for Phase 07.
 */

export const BOQ_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type BoqStatus = (typeof BOQ_STATUSES)[number];

export const BOQ_UOMS = [
  // Volume
  'CUM',
  'CFT',
  // Area
  'SQM',
  'SQFT',
  // Length
  'RMT',
  'M',
  'FT',
  // Weight
  'MT',
  'KG',
  'TON',
  // Count
  'NOS',
  'BAGS',
  'TRIP',
  'SET',
  // Commercial / Lump Sum
  'LS',
  'MONTH',
  'DAY',
] as const;

export type BoqUom = (typeof BOQ_UOMS)[number];

export function isValidBoqUom(uom: string): uom is BoqUom {
  return BOQ_UOMS.includes(uom as BoqUom);
}

export type UomCategory = 'VOLUME' | 'AREA' | 'LENGTH' | 'WEIGHT' | 'COUNT' | 'COMMERCIAL';

export function getUomCategory(uom: string): UomCategory {
  switch (uom) {
    case 'CUM':
    case 'CFT':
      return 'VOLUME';
    case 'SQM':
    case 'SQFT':
      return 'AREA';
    case 'RMT':
    case 'M':
    case 'FT':
      return 'LENGTH';
    case 'MT':
    case 'KG':
    case 'TON':
      return 'WEIGHT';
    case 'NOS':
    case 'BAGS':
    case 'TRIP':
    case 'SET':
      return 'COUNT';
    case 'LS':
    case 'MONTH':
    case 'DAY':
    default:
      return 'COMMERCIAL';
  }
}

export const MEASUREMENT_TYPES = ['DIMENSIONAL', 'DIRECT_QUANTITY'] as const;
export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

export const MB_STATUSES = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'REJECTED'] as const;
export type MbStatus = (typeof MB_STATUSES)[number];

export const ALLOWED_MEASUREMENT_FACTORS = [1.0, -1.0] as const;

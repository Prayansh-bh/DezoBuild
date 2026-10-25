export const MATERIAL_UOMS = [
  'MT',
  'KG',
  'BAGS',
  'CFT',
  'CUM',
  'NOS',
  'SQFT',
  'SQM',
  'RMT',
  'LTR',
] as const;

export type MaterialUom = (typeof MATERIAL_UOMS)[number];

export function isValidMaterialUom(uom: string): uom is MaterialUom {
  return MATERIAL_UOMS.includes(uom as MaterialUom);
}

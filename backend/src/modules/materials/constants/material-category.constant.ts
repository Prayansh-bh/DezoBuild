export const MATERIAL_CATEGORIES = [
  'Steel & Rebar',
  'Cement & Concrete',
  'Aggregates & Sand',
  'Masonry & AAC Blocks',
  'Plumbing & Sanitary',
  'Electrical & Conduits',
  'Finishing & Paints',
  'Timber & Formwork',
  'Chemicals & Waterproofing',
  'Hardware & Fasteners',
  'Consumables & Tools',
  'Safety & PPE',
  'Other',
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

import { ChecklistItemType } from './quality.constants.js';

export interface ChecklistItemTemplate {
  sequenceNumber: number;
  checkpointCode: string;
  itemType: ChecklistItemType;
  checkpointCategory: string;
  checkpointDescription: string;
  acceptanceCriteria: string;
  isMandatory: boolean;
  unit?: string;
  testMethod?: string;
}

export const CHECKLIST_CONCRETE_POUR_V1: ChecklistItemTemplate[] = [
  {
    sequenceNumber: 1,
    checkpointCode: 'POUR-01',
    itemType: ChecklistItemType.VISUAL_CHECK,
    checkpointCategory: 'Pre-Pour Formwork',
    checkpointDescription: 'Formwork line, level, surface finish, tightness and props alignment',
    acceptanceCriteria: 'Forms must be rigid, plumb within ±3mm tolerance, and properly sealed without grout leakage gaps',
    isMandatory: true,
  },
  {
    sequenceNumber: 2,
    checkpointCode: 'POUR-02',
    itemType: ChecklistItemType.MEASUREMENT,
    checkpointCategory: 'Reinforcement & Cover',
    checkpointDescription: 'Rebar spacing, diameter, lap length, chair spacing and concrete cover block verification',
    acceptanceCriteria: 'Clear cover: Slabs 20mm, Beams 25mm, Columns 40mm (±2mm tolerance as per IS 456)',
    isMandatory: true,
    unit: 'mm',
  },
  {
    sequenceNumber: 3,
    checkpointCode: 'POUR-03',
    itemType: ChecklistItemType.DOCUMENT_VERIFICATION,
    checkpointCategory: 'MEP Clearance',
    checkpointDescription: 'Electrical conduits, plumbing sleeves, embedment plates and box fixtures signed off by MEP engineer',
    acceptanceCriteria: 'All MEP conduit routes and sleeves verified against approved shop drawings',
    isMandatory: true,
  },
  {
    sequenceNumber: 4,
    checkpointCode: 'POUR-04',
    itemType: ChecklistItemType.FIELD_TEST,
    checkpointCategory: 'Workability / Slump Test',
    checkpointDescription: 'Slump test on arrival of Ready-Mix Concrete (RMC) transit mixer at batch site',
    acceptanceCriteria: 'Workability slump 100 mm to 150 mm as per mix design specification',
    isMandatory: true,
    unit: 'mm',
    testMethod: 'IS 1199 Slump Cone Method',
  },
  {
    sequenceNumber: 5,
    checkpointCode: 'POUR-05',
    itemType: ChecklistItemType.HOLD_POINT_GATE,
    checkpointCategory: 'Final Pour Authorization',
    checkpointDescription: 'Final hold-point sign-off: vibrators standby, weather suitability, lighting and safety clearance',
    acceptanceCriteria: 'Dual needle vibrators functional on site, safety walkways clear, batch plant delivery authorized',
    isMandatory: true,
  },
];

export const CHECKLIST_REBAR_V1: ChecklistItemTemplate[] = [
  {
    sequenceNumber: 1,
    checkpointCode: 'REBAR-01',
    itemType: ChecklistItemType.DOCUMENT_VERIFICATION,
    checkpointCategory: 'Material Mill Certificate',
    checkpointDescription: 'MTC certificate verification against batch heat number (Fe 500D / Fe 550D)',
    acceptanceCriteria: 'MTC yields conforming tensile strength and elongation percentage per IS 1786',
    isMandatory: true,
  },
  {
    sequenceNumber: 2,
    checkpointCode: 'REBAR-02',
    itemType: ChecklistItemType.MEASUREMENT,
    checkpointCategory: 'Bar Bending & Placement',
    checkpointDescription: 'Bar diameters, spacing, hook length (135 degree bend), and stirrup/tie alignment',
    acceptanceCriteria: 'Spacing tolerance within ±5mm of BBS schedule; tie wires properly knotted',
    isMandatory: true,
    unit: 'mm',
  },
  {
    sequenceNumber: 3,
    checkpointCode: 'REBAR-03',
    itemType: ChecklistItemType.MEASUREMENT,
    checkpointCategory: 'Lap Length & Staggering',
    checkpointDescription: 'Splice lap length and minimum 50% staggered distribution across adjacent bars',
    acceptanceCriteria: 'Lap length >= 50d (in tension) or per approved structural drawing',
    isMandatory: true,
    unit: 'mm',
  },
  {
    sequenceNumber: 4,
    checkpointCode: 'REBAR-04',
    itemType: ChecklistItemType.VISUAL_CHECK,
    checkpointCategory: 'Surface Cleanliness',
    checkpointDescription: 'Rebar surface free of heavy rust, oil, mud, grease or organic coatings',
    acceptanceCriteria: 'Surface clean and free of detrimental scaling',
    isMandatory: false,
  },
];

export const CHECKLIST_FORMWORK_V1: ChecklistItemTemplate[] = [
  {
    sequenceNumber: 1,
    checkpointCode: 'FORM-01',
    itemType: ChecklistItemType.VISUAL_CHECK,
    checkpointCategory: 'Material Condition',
    checkpointDescription: 'Plywood/steel shutters surface smooth, undented, and cleaned of hardened slurry',
    acceptanceCriteria: 'No delamination of shuttering plywood; releasing agent applied uniformly without puddles',
    isMandatory: true,
  },
  {
    sequenceNumber: 2,
    checkpointCode: 'FORM-02',
    itemType: ChecklistItemType.MEASUREMENT,
    checkpointCategory: 'Dimensional Check',
    checkpointDescription: 'Internal dimensions, diagonal squareness, and camber provision for long spans',
    acceptanceCriteria: 'Cross-section dimensions ±3mm of architectural drawings',
    isMandatory: true,
    unit: 'mm',
  },
  {
    sequenceNumber: 3,
    checkpointCode: 'FORM-03',
    itemType: ChecklistItemType.HOLD_POINT_GATE,
    checkpointCategory: 'Staging & Propping Sturdiness',
    checkpointDescription: 'Acro-props, cuplock staging, base plates, diagonal bracing and sole plates on firm ground',
    acceptanceCriteria: 'Props vertical within 1:300 plumb tolerance, bracings locked in both orthogonal directions',
    isMandatory: true,
  },
];

export const CHECKLIST_WATERPROOFING_V1: ChecklistItemTemplate[] = [
  {
    sequenceNumber: 1,
    checkpointCode: 'WP-01',
    itemType: ChecklistItemType.VISUAL_CHECK,
    checkpointCategory: 'Surface Preparation',
    checkpointDescription: 'Substrate concrete hacked, cleaned, laitances removed, fillet/coving done at all 90-deg junctions',
    acceptanceCriteria: 'Substrate sound, dry, with 50mm x 50mm polymer coving completed at wall-slab joints',
    isMandatory: true,
  },
  {
    sequenceNumber: 2,
    checkpointCode: 'WP-02',
    itemType: ChecklistItemType.MEASUREMENT,
    checkpointCategory: 'Membrane / Coating Thickness',
    checkpointDescription: 'Dry Film Thickness (DFT) / Wet Film Thickness (WFT) measurement across applied coats',
    acceptanceCriteria: 'Total DFT >= 1.5mm or as per manufacturer specification sheet',
    isMandatory: true,
    unit: 'mm',
  },
  {
    sequenceNumber: 3,
    checkpointCode: 'WP-03',
    itemType: ChecklistItemType.FIELD_TEST,
    checkpointCategory: 'Ponding Water Test',
    checkpointDescription: 'Continuous water ponding test with min 50mm head for 72 hours duration',
    acceptanceCriteria: 'Zero seepage or damp patches observed on underside of slab after 72 hours',
    isMandatory: true,
    unit: 'hours',
    testMethod: '72h Continuous Ponding Protocol',
  },
];

export const CHECKLIST_SCAFFOLDING_V1: ChecklistItemTemplate[] = [
  {
    sequenceNumber: 1,
    checkpointCode: 'SCAF-01',
    itemType: ChecklistItemType.VISUAL_CHECK,
    checkpointCategory: 'Foundation & Sole Plates',
    checkpointDescription: 'Base jacks seated on solid timber sole plates on compacted ground',
    acceptanceCriteria: 'Sole plates min 225mm x 38mm thickness, no settlement or void below plates',
    isMandatory: true,
  },
  {
    sequenceNumber: 2,
    checkpointCode: 'SCAF-02',
    itemType: ChecklistItemType.VISUAL_CHECK,
    checkpointCategory: 'Bracing & Ties',
    checkpointDescription: 'Façade diagonal bracing and wall tie-in anchors installed at every 2 lifts (4m max)',
    acceptanceCriteria: 'Positive tie anchors secured to structural columns/beams with right-angle couplers',
    isMandatory: true,
  },
  {
    sequenceNumber: 3,
    checkpointCode: 'SCAF-03',
    itemType: ChecklistItemType.HOLD_POINT_GATE,
    checkpointCategory: 'Working Platform & Guardrails',
    checkpointDescription: 'Full decking boards, top handrail (1.0m), mid-rail (0.5m), and 150mm toe-boards in place',
    acceptanceCriteria: 'No gaps > 25mm in platform, green safety tag issued and signed by competent scaffold inspector',
    isMandatory: true,
  },
];

export const CHECKLIST_STEEL_RECEIVING_V1: ChecklistItemTemplate[] = [
  {
    sequenceNumber: 1,
    checkpointCode: 'MAT-01',
    itemType: ChecklistItemType.DOCUMENT_VERIFICATION,
    checkpointCategory: 'Invoice & Test Certificates',
    checkpointDescription: 'Manufacturer test certificate verification against physical bundle tags',
    acceptanceCriteria: 'Grade, heat number, and invoice quantities reconcile 100%',
    isMandatory: true,
  },
  {
    sequenceNumber: 2,
    checkpointCode: 'MAT-02',
    itemType: ChecklistItemType.MEASUREMENT,
    checkpointCategory: 'Dimensional & Weight Verification',
    checkpointDescription: 'Diameter measurement with vernier caliper and rolling margin weight test per meter',
    acceptanceCriteria: 'Rolling weight within ±7% standard nominal mass per meter as per IS 1786',
    isMandatory: true,
    unit: 'kg/m',
    testMethod: '1-meter Bar Cut Weighing Protocol',
  },
];

export const CHECKLIST_GENERAL_QA_V1: ChecklistItemTemplate[] = [
  {
    sequenceNumber: 1,
    checkpointCode: 'GEN-01',
    itemType: ChecklistItemType.VISUAL_CHECK,
    checkpointCategory: 'General Workmanship',
    checkpointDescription: 'Visual inspection of executed element against approved technical drawings and specifications',
    acceptanceCriteria: 'Workmanship conforms to relevant building codes and contract standards',
    isMandatory: true,
  },
  {
    sequenceNumber: 2,
    checkpointCode: 'GEN-02',
    itemType: ChecklistItemType.MEASUREMENT,
    checkpointCategory: 'Geometry & Dimensions',
    checkpointDescription: 'Physical dimensional survey of alignment, level, and clearances',
    acceptanceCriteria: 'Variations within project tolerance specifications (±5mm)',
    isMandatory: true,
    unit: 'mm',
  },
  {
    sequenceNumber: 3,
    checkpointCode: 'GEN-03',
    itemType: ChecklistItemType.HOLD_POINT_GATE,
    checkpointCategory: 'QA/QC Clearance',
    checkpointDescription: 'Verification that all preceding sub-activities are conforming and signed off',
    acceptanceCriteria: 'All trade checkpoints verified and non-conformances cleared',
    isMandatory: true,
  },
];

export function getChecklistCatalog(type: string): ChecklistItemTemplate[] {
  switch (type) {
    case 'POUR_CARD':
    case 'CONCRETE_PRE_POUR':
      return CHECKLIST_CONCRETE_POUR_V1;
    case 'REBAR':
      return CHECKLIST_REBAR_V1;
    case 'FORMWORK':
      return CHECKLIST_FORMWORK_V1;
    case 'WATERPROOFING':
      return CHECKLIST_WATERPROOFING_V1;
    case 'SCAFFOLDING':
      return CHECKLIST_SCAFFOLDING_V1;
    case 'MATERIAL_RECEIVING':
    case 'STRUCTURAL_STEEL':
      return CHECKLIST_STEEL_RECEIVING_V1;
    default:
      return CHECKLIST_GENERAL_QA_V1;
  }
}

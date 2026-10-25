/**
 * DEZOBUILD Canonical Subscription & Feature Entitlement Catalog
 *
 * Defines the frozen commercial plan tiers, capacity constraints,
 * and canonical product feature keys for Phase 05.
 */

export const CANONICAL_PLAN_CODES = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const;
export type CanonicalPlanCode = (typeof CANONICAL_PLAN_CODES)[number];

export interface PlanDefinition {
  code: CanonicalPlanCode;
  name: string;
  description: string;
  maxProjects: number | null; // null = Unlimited
  maxSeats: number | null;    // null = Unlimited / Enterprise
  maxStorageGb: number | null;// null = 5000 GB (5 TB)
  priceMonthly: number;
  priceAnnual: number;
}

export const PLAN_DEFINITIONS: readonly PlanDefinition[] = [
  {
    code: 'STARTER',
    name: 'Starter Tier',
    description: 'For boutique contractors and single-site construction projects.',
    maxProjects: 2,
    maxSeats: 5,
    maxStorageGb: 50,
    priceMonthly: 49999,
    priceAnnual: 499990,
  },
  {
    code: 'PROFESSIONAL',
    name: 'Professional Tier',
    description: 'For growing general contractors and mid-scale infrastructure developers.',
    maxProjects: 10,
    maxSeats: 15,
    maxStorageGb: 200,
    priceMonthly: 149999,
    priceAnnual: 1499990,
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise Tier',
    description: 'For large construction conglomerates, EPC leaders, and multi-metro infrastructure developers.',
    maxProjects: null, // Unlimited
    maxSeats: null,    // Unlimited
    maxStorageGb: 5000,
    priceMonthly: 399999,
    priceAnnual: 3999990,
  },
] as const;

/**
 * The 12 Canonical Feature Keys
 */
export const CANONICAL_FEATURE_KEYS = [
  'projects:core',
  'projects:wbs',
  'materials:core',
  'materials:po_matching',
  'finance:commercial',
  'bim:3d_viewer',
  'ai:schedule_forecasting',
  'integrations:erp_sync',
  'hardware:biometric',
  'survey:drone_orthomosaic',
  'security:custom_domain',
  'compliance:audit_export',
] as const;

export type CanonicalFeatureKey = (typeof CANONICAL_FEATURE_KEYS)[number];

export interface FeatureDefinition {
  key: CanonicalFeatureKey;
  name: string;
  domain: 'projects' | 'materials' | 'finance' | 'bim' | 'ai' | 'integrations' | 'hardware' | 'survey' | 'security' | 'compliance';
  description: string;
}

export const FEATURE_DEFINITIONS: readonly FeatureDefinition[] = [
  {
    key: 'projects:core',
    name: 'Core Projects & DPR Mobile Logging',
    domain: 'projects',
    description: 'Capital project registry, site parameters, project metadata, and Daily Progress Reports.',
  },
  {
    key: 'projects:wbs',
    name: 'Work Breakdown Structure (WBS) & Scheduling',
    domain: 'projects',
    description: 'Multi-level hierarchical WBS trees, milestone scheduling, and physical activity progress.',
  },
  {
    key: 'materials:core',
    name: 'Materials & Store Receipts (GRN)',
    domain: 'materials',
    description: 'Material catalogue masters, store inventory bin tracking, and Goods Receipt Notes.',
  },
  {
    key: 'materials:po_matching',
    name: 'Vendor Purchase Orders & 3-Way Matching',
    domain: 'materials',
    description: 'Purchase order generation, vendor challan reconciliation, and 3-way delivery matching.',
  },
  {
    key: 'finance:commercial',
    name: 'Commercial Ledgers & Contractor RA Bills',
    domain: 'finance',
    description: 'Running Account (RA) bills, statutory tax compliance (TDS, Cess), retention ledgers.',
  },
  {
    key: 'bim:3d_viewer',
    name: 'BIM 3D Model Viewer & Clash Overlays',
    domain: 'bim',
    description: 'Multi-disciplinary 3D IFC model rendering, clash detection, and revision overlays.',
  },
  {
    key: 'ai:schedule_forecasting',
    name: 'AI Schedule Slippage & Risk Forecaster',
    domain: 'ai',
    description: 'Machine learning milestone variance model trained on daily execution velocity.',
  },
  {
    key: 'integrations:erp_sync',
    name: 'ERP & Tally Prime Sync Gateway',
    domain: 'integrations',
    description: 'Automated two-way ledger and voucher synchronization with Tally Prime / SAP gateways.',
  },
  {
    key: 'hardware:biometric',
    name: 'Biometric Turnstile Machine Bridge',
    domain: 'hardware',
    description: 'Direct IP and MQTT broker bridge for real-time site biometric attendance turnstiles.',
  },
  {
    key: 'survey:drone_orthomosaic',
    name: 'Drone Survey Volumetric Earthwork Models',
    domain: 'survey',
    description: 'GeoTIFF aerial point-cloud volumetric earthwork cut/fill calculation models.',
  },
  {
    key: 'security:custom_domain',
    name: 'Custom Domain Mapping & Dedicated SSL',
    domain: 'security',
    description: 'White-label custom enterprise domain routing with dedicated SSL certificates.',
  },
  {
    key: 'compliance:audit_export',
    name: 'Cryptographic Audit Trail Export',
    domain: 'compliance',
    description: 'Cryptographically signed, immutable export of platform-wide access and mutation logs.',
  },
] as const;

/**
 * Canonical Plan -> Feature Entitlement Matrix
 */
export const PLAN_FEATURE_MATRIX: Record<CanonicalPlanCode, readonly CanonicalFeatureKey[]> = {
  STARTER: [
    'projects:core',
    'materials:core',
  ],

  PROFESSIONAL: [
    'projects:core',
    'projects:wbs',
    'materials:core',
    'materials:po_matching',
    'finance:commercial',
    'integrations:erp_sync',
    'hardware:biometric',
  ],

  ENTERPRISE: [
    'projects:core',
    'projects:wbs',
    'materials:core',
    'materials:po_matching',
    'finance:commercial',
    'bim:3d_viewer',
    'ai:schedule_forecasting',
    'integrations:erp_sync',
    'hardware:biometric',
    'survey:drone_orthomosaic',
    'security:custom_domain',
    'compliance:audit_export',
  ],
};

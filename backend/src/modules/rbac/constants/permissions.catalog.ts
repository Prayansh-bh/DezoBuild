/**
 * DEZOBUILD Canonical Permission Catalog
 *
 * Defines the complete, authoritative, and frozen permission catalog
 * structured under the domain:entity:action taxonomy.
 */

export interface PermissionDefinition {
  name: string;
  module: string;
  description: string;
}

export const CANONICAL_PERMISSIONS: readonly PermissionDefinition[] = [
  // ==========================================
  // 1. PROJECTS MODULE
  // ==========================================
  {
    name: "projects:view",
    module: "projects",
    description: "View capital project registry, portfolio overviews, and summaries",
  },
  {
    name: "projects:create",
    module: "projects",
    description: "Create new capital project records",
  },
  {
    name: "projects:manage",
    module: "projects",
    description: "Update project metadata, milestones, budgets, or archive projects",
  },
  {
    name: "projects:wbs:edit",
    module: "projects",
    description: "Modify Work Breakdown Structure (WBS) trees, activities, and budgeted quantities",
  },
  {
    name: "projects:dpr:create",
    module: "projects",
    description: "Create Daily Progress Reports (DPR)",
  },
  {
    name: "projects:dpr:submit",
    module: "projects",
    description: "Submit Daily Progress Reports for managerial verification",
  },
  {
    name: "projects:dpr:approve",
    module: "projects",
    description: "Approve DPRs and commit executed quantities to project progress",
  },

  // ==========================================
  // 2. MATERIALS & PROCUREMENT MODULE
  // ==========================================
  {
    name: "materials:view",
    module: "materials",
    description: "View material catalogues, stock balances, and rate masters",
  },
  {
    name: "materials:manage",
    module: "materials",
    description: "Create and edit material catalogue items, units, and standard rates",
  },
  {
    name: "materials:indent:create",
    module: "materials",
    description: "Create site material procurement indents",
  },
  {
    name: "materials:indent:approve",
    module: "materials",
    description: "Approve site material indents for purchase ordering",
  },
  {
    name: "materials:po:create",
    module: "materials",
    description: "Generate Purchase Orders (PO) for vendor materials",
  },
  {
    name: "materials:po:approve",
    module: "materials",
    description: "Authorize and issue Purchase Orders to vendors",
  },
  {
    name: "materials:grn:create",
    module: "materials",
    description: "Record Goods Receipt Note (GRN) site gate delivery",
  },
  {
    name: "materials:grn:verify",
    module: "materials",
    description: "Perform 3-way match verification (PO-Challan-Weight) and commit stock balance",
  },
  {
    name: "materials:stock:issue",
    module: "materials",
    description: "Issue materials from store yard to WBS construction activity",
  },
  {
    name: "materials:stock:transfer",
    module: "materials",
    description: "Dispatch inter-site material stock transfers",
  },
  {
    name: "materials:stock:receive",
    module: "materials",
    description: "Receive and accept inbound inter-site stock transfers",
  },

  // ==========================================
  // 3. FINANCE & COMMERCIAL MODULE
  // ==========================================
  {
    name: "finance:view",
    module: "finance",
    description: "View project budgets, expense claims, contractor RA bills, and commercial ledgers",
  },
  {
    name: "finance:expense:create",
    module: "finance",
    description: "Create site petty cash and expense reimbursement claims",
  },
  {
    name: "finance:expense:approve",
    module: "finance",
    description: "Approve site expense claims for payment",
  },
  {
    name: "finance:bill:create",
    module: "finance",
    description: "Generate contractor Running Account (RA) bills",
  },
  {
    name: "finance:bill:verify",
    module: "finance",
    description: "Verify RA bill physical dimensional measurements and statutory deductions",
  },
  {
    name: "finance:bill:approve",
    module: "finance",
    description: "Approve contractor RA bill and release payment voucher",
  },
  {
    name: "finance:claim:create",
    module: "finance",
    description: "Create client billing measurement claims",
  },
  {
    name: "finance:claim:certify",
    module: "finance",
    description: "Certify client billing measurement claims",
  },
  {
    name: "finance:payment:create",
    module: "finance",
    description: "Generate financial payment disbursement vouchers",
  },
  {
    name: "finance:payment:disburse",
    module: "finance",
    description: "Authorize and disburse commercial payouts",
  },

  // ==========================================
  // 4. PEOPLE & WORKFORCE MODULE
  // ==========================================
  {
    name: "people:view",
    module: "people",
    description: "View staff directory, trade gangs, and daily muster rolls",
  },
  {
    name: "people:manage",
    module: "people",
    description: "Onboard employees, trade gangs, and labour contractors",
  },
  {
    name: "people:attendance:create",
    module: "people",
    description: "Record manual and turnstile biometric attendance punches",
  },
  {
    name: "people:attendance:approve",
    module: "people",
    description: "Approve daily muster logs, overtime hours, and wage summaries",
  },

  // ==========================================
  // 5. EQUIPMENT & FLEET MODULE
  // ==========================================
  {
    name: "equipment:view",
    module: "equipment",
    description: "View heavy machinery inventory, runtime logs, and hour meters",
  },
  {
    name: "equipment:manage",
    module: "equipment",
    description: "Register machinery assets, rental agreements, and rate cards",
  },
  {
    name: "equipment:fuel:log",
    module: "equipment",
    description: "Dispense diesel fuel and record machinery hour meters",
  },
  {
    name: "equipment:maintenance:create",
    module: "equipment",
    description: "Open and log preventative machinery maintenance tickets",
  },

  // ==========================================
  // 6. QUALITY & POUR CARDS MODULE
  // ==========================================
  {
    name: "quality:view",
    module: "quality",
    description: "View concrete pour cards, Non-Conformance Reports (NCRs), and inspection logs",
  },
  {
    name: "quality:pour:create",
    module: "quality",
    description: "Create 5-point concrete pour card checklists",
  },
  {
    name: "quality:pour:approve",
    module: "quality",
    description: "Perform QA/QC verification and approve concrete pour readiness",
  },
  {
    name: "quality:ncr:create",
    module: "quality",
    description: "Issue Non-Conformance Reports (NCR) on defective workmanship",
  },
  {
    name: "quality:ncr:verify",
    module: "quality",
    description: "Verify Corrective/Preventative Actions (CAPA) and close NCRs",
  },

  // ==========================================
  // 7. SAFETY & EHS MODULE
  // ==========================================
  {
    name: "safety:view",
    module: "safety",
    description: "View safety audits, tool-box talks, and hazard registers",
  },
  {
    name: "safety:audit:create",
    module: "safety",
    description: "Conduct and log daily site safety walkthrough audits",
  },
  {
    name: "safety:incident:create",
    module: "safety",
    description: "Log near-miss, property damage, or Lost Time Incident (LTI) records",
  },

  // ==========================================
  // 8. DOCUMENTS, DRAWINGS & RFIS MODULE
  // ==========================================
  {
    name: "documents:view",
    module: "documents",
    description: "View Good-for-Construction (GFC) drawings, specifications, and RFIs",
  },
  {
    name: "documents:manage",
    module: "documents",
    description: "Upload GFC drawing revisions and supersede obsolete blueprints",
  },
  {
    name: "documents:rfi:create",
    module: "documents",
    description: "Raise technical Requests for Information (RFI) to structural consultants",
  },
  {
    name: "documents:rfi:respond",
    module: "documents",
    description: "Provide authoritative technical RFI clarifications and attachments",
  },

  // ==========================================
  // 9. SETTINGS & GOVERNANCE MODULE
  // ==========================================
  {
    name: "settings:view",
    module: "settings",
    description: "View corporate entity masters, company profile, and branch settings",
  },
  {
    name: "settings:manage",
    module: "settings",
    description: "Manage company masters, legal entities, branches, and GSTIN registrations",
  },
  {
    name: "settings:rbac:manage",
    module: "settings",
    description: "Assign user roles, project memberships, and store access assignments",
  },

  // ==========================================
  // 10. REPORTS & EXPORTS MODULE
  // ==========================================
  {
    name: "reports:view",
    module: "reports",
    description: "View interactive operational reports, progress S-curves, and cash summaries",
  },
  {
    name: "reports:generate",
    module: "reports",
    description: "Queue asynchronous heavy report exports (PDF / XLSX)",
  },
  {
    name: "reports:export",
    module: "reports",
    description: "Download certified audit reports and export financial schedules",
  },

  // ==========================================
  // 11. ALERTS & NOTIFICATIONS MODULE (Phase 16)
  // ==========================================
  {
    name: "alerts:view",
    module: "alerts",
    description: "View real-time exception alerts and event notification feeds",
  },
  {
    name: "alerts:manage",
    module: "alerts",
    description: "Acknowledge, resolve, and dismiss active exception alerts",
  },

  // ==========================================
  // 12. EXTERNAL INTEGRATIONS MODULE (Phase 17)
  // ==========================================
  {
    name: "integrations:view",
    module: "integrations",
    description: "View configured external system connections and sync job statuses",
  },
  {
    name: "integrations:manage",
    module: "integrations",
    description: "Configure, test, rotate credentials, and trigger external system synchronization",
  },

  // ==========================================
  // 13. AI & INTELLIGENCE CONTROL LAYER (Phase 17)
  // ==========================================
  {
    name: "ai:view",
    module: "ai",
    description: "View AI analysis requests, operational control-tower summaries, and generated insights",
  },
  {
    name: "ai:generate",
    module: "ai",
    description: "Execute AI forecasting, risk summaries, cost variance explanations, and acknowledge insights",
  },
] as const;

export type CanonicalPermissionName = (typeof CANONICAL_PERMISSIONS)[number]["name"];

export const ALL_CANONICAL_PERMISSION_NAMES: readonly string[] = CANONICAL_PERMISSIONS.map((p) => p.name);

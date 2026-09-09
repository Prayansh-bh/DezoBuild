/**
 * DEZOBUILD — Master Customer Module Catalog
 * 
 * Centralized catalog of capabilities, domains, and submodules
 * for the customer application (app.dezobuild.com).
 * 
 * Platform Level administration (owner.dezobuild.com / SUPER_ADMIN)
 * is separated from Customer Company capabilities.
 */

export interface SubmoduleItem {
  id: string;
  name: string;
  description: string;
  route?: string;
  badgeKey?: string;
  capabilityTag: string;
}

export interface ModuleDomain {
  id: string;
  name: string;
  description: string;
  iconName: string;
  primaryRoute: string;
  submodules: SubmoduleItem[];
}

export const MASTER_MODULE_CATALOG: Record<string, ModuleDomain> = {
  PROJECTS: {
    id: "projects",
    name: "Projects",
    description: "Core construction project management, WBS, DPR, progress tracking and milestones.",
    iconName: "Building2",
    primaryRoute: "/projects",
    submodules: [
      { id: "projects_list", name: "Projects", description: "Portfolio and site overview", route: "/projects", capabilityTag: "projects:view" },
      { id: "wbs", name: "WBS & Activities", description: "Work breakdown structure and task scheduling", route: "/projects", capabilityTag: "wbs:view" },
      { id: "milestones", name: "Milestones", description: "Critical path milestones and delivery dates", route: "/projects", capabilityTag: "milestones:view" },
      { id: "dpr", name: "DPR (Daily Progress Report)", description: "Daily site progress, manpower, equipment logs", route: "/projects", capabilityTag: "dpr:view" },
      { id: "progress", name: "Progress Tracking", description: "S-curves, physical vs financial progress", route: "/projects", capabilityTag: "progress:view" },
    ],
  },
  PROCUREMENT_STORE: {
    id: "procurement_store",
    name: "Procurement & Store",
    description: "Materials lifecycle, indents, purchase orders, GRN, warehouse inventory and stock transfers.",
    iconName: "Boxes",
    primaryRoute: "/materials",
    submodules: [
      { id: "materials_inventory", name: "Inventory", description: "Current warehouse and site stock levels", route: "/materials", capabilityTag: "inventory:view" },
      { id: "indents", name: "Indents & Requisitions", description: "Site material requests and approvals", route: "/materials", capabilityTag: "indents:view" },
      { id: "purchase_orders", name: "Purchase Orders", description: "Vendor PO issuance and tracking", route: "/materials", capabilityTag: "po:view" },
      { id: "grn", name: "GRN (Goods Receipt Note)", description: "Material inspection and gate entry", route: "/materials", capabilityTag: "grn:view" },
      { id: "material_issues", name: "Material Issues", description: "Issue to WBS activities and contractors", route: "/materials", capabilityTag: "issues:view" },
      { id: "material_returns", name: "Material Returns", description: "Returns from site to store", route: "/materials", capabilityTag: "returns:view" },
      { id: "stock_transfers", name: "Stock Transfers", description: "Inter-warehouse and inter-site transfers", route: "/materials", capabilityTag: "transfers:view" },
      { id: "vendors", name: "Vendors", description: "Supplier directory and performance ratings", route: "/materials", capabilityTag: "vendors:view" },
    ],
  },
  PEOPLE_HR: {
    id: "people_hr",
    name: "People & HR",
    description: "Workforce directory, daily labour muster, attendance, leave, payroll and subcontractor gangs.",
    iconName: "Users",
    primaryRoute: "/people",
    submodules: [
      { id: "employees", name: "Employees", description: "Staff directory and role allocations", route: "/people", capabilityTag: "employees:view" },
      { id: "attendance", name: "Attendance & Muster", description: "Daily biometric and muster roll tracking", route: "/people", capabilityTag: "attendance:view" },
      { id: "labour_contractors", name: "Labour Contractors", description: "Subcontractor gang deployments", route: "/people", capabilityTag: "contractors:view" },
      { id: "leave", name: "Leave Management", description: "Staff leave requests and approvals", route: "/people", capabilityTag: "leave:view" },
      { id: "payroll", name: "Payroll & Wages", description: "Wage computations and wage payments", route: "/people", capabilityTag: "payroll:view" },
      { id: "performance", name: "Performance", description: "Staff and contractor productivity metrics", route: "/people", capabilityTag: "performance:view" },
    ],
  },
  PLANT_EQUIPMENT: {
    id: "plant_equipment",
    name: "Plant & Equipment",
    description: "Heavy machinery fleet, site allocation, hour-meter logs, fuel dispensing and maintenance.",
    iconName: "Truck",
    primaryRoute: "/equipment",
    submodules: [
      { id: "equipment_fleet", name: "Equipment Fleet", description: "Owned and rented heavy machinery assets", route: "/equipment", capabilityTag: "equipment:view" },
      { id: "allocation", name: "Site Allocation", description: "Asset deployment across active sites", route: "/equipment", capabilityTag: "equipment_alloc:view" },
      { id: "usage_logs", name: "Usage & Hour Meters", description: "Daily operating hours and operator logs", route: "/equipment", capabilityTag: "equipment_usage:view" },
      { id: "fuel_logs", name: "Fuel Dispensing", description: "Diesel consumption, unit rates and spend", route: "/equipment", capabilityTag: "fuel:view" },
      { id: "maintenance", name: "Maintenance & Service", description: "Breakdown tickets and preventative service", route: "/equipment", capabilityTag: "maintenance:view" },
    ],
  },
  FINANCE_COMMERCIAL: {
    id: "finance_commercial",
    name: "Finance & Commercial",
    description: "Project budgets, site petty cash expenses, vendor payments, client billing and cash flow.",
    iconName: "WalletCards",
    primaryRoute: "/finance",
    submodules: [
      { id: "budget_control", name: "Budget Control", description: "Cost code budgets vs commitments vs actuals", route: "/finance", capabilityTag: "budget:view" },
      { id: "expenses", name: "Site Expenses", description: "Petty cash and site expense vouchers", route: "/finance", capabilityTag: "expenses:view" },
      { id: "payments", name: "Payments & Vouchers", description: "Vendor and contractor disbursements", route: "/finance", capabilityTag: "payments:view" },
      { id: "advances", name: "Advances & Recoveries", description: "Supplier advances and retention balances", route: "/finance", capabilityTag: "advances:view" },
      { id: "receivables", name: "Receivables & Billing", description: "Client RA bills and retention collections", route: "/finance", capabilityTag: "receivables:view" },
      { id: "cost_control", name: "Cost Control", description: "Cost variance and cash burn forecasting", route: "/finance", capabilityTag: "cost_control:view" },
    ],
  },
  ISSUES_ALERTS: {
    id: "issues_alerts",
    name: "Issues & Alerts",
    description: "Automated cost variance alerts, safety incidents, quality snags and pending approval queues.",
    iconName: "Bell",
    primaryRoute: "/alerts",
    submodules: [
      { id: "alerts_feed", name: "Alerts & Exceptions", description: "Real-time cost, schedule and material alerts", route: "/alerts", badgeKey: "alerts", capabilityTag: "alerts:view" },
      { id: "issues_snags", name: "Issues & Snags", description: "Quality defects and safety observations", route: "/alerts", capabilityTag: "issues:view" },
      { id: "approvals", name: "Approval Workflows", description: "Pending indents, expenses, and DPR sign-offs", route: "/alerts", capabilityTag: "approvals:view" },
    ],
  },
  ANALYTICS_REPORTS: {
    id: "analytics_reports",
    name: "Analytics & Reports",
    description: "Cross-site executive dashboards, financial summaries, material reconciliation and PDF exports.",
    iconName: "FileBarChart",
    primaryRoute: "/reports",
    submodules: [
      { id: "operational_reports", name: "Operational Reports", description: "DPR digests, labor muster and plant reports", route: "/reports", capabilityTag: "reports_ops:view" },
      { id: "project_reports", name: "Project Reports", description: "WBS progress and milestone slippage reports", route: "/reports", capabilityTag: "reports_proj:view" },
      { id: "financial_reports", name: "Financial Reports", description: "Cash flow, cost variance and expense ledgers", route: "/reports", capabilityTag: "reports_fin:view" },
      { id: "executive_reports", name: "Executive Reports", description: "Portfolio board summaries and KPI digests", route: "/reports", capabilityTag: "reports_exec:view" },
    ],
  },
  DOCUMENTS_DRAWINGS: {
    id: "documents_drawings",
    name: "Documents & Drawings",
    description: "Architectural drawings, GFC revisions, contracts, compliance certificates and handover files.",
    iconName: "FileText",
    primaryRoute: "/documents",
    submodules: [
      { id: "drawings", name: "Architectural & Structural Drawings", description: "GFC drawings, revisions and markups", route: "/documents", capabilityTag: "drawings:view" },
      { id: "contracts", name: "Contracts & Agreements", description: "Client work orders and subcontractor agreements", route: "/documents", capabilityTag: "contracts:view" },
      { id: "compliance", name: "Statutory & Compliance", description: "Building permits, labor licenses and test reports", route: "/documents", capabilityTag: "compliance:view" },
      { id: "revisions", name: "Revisions & Transmittals", description: "Version history and transmittal logs", route: "/documents", capabilityTag: "revisions:view" },
    ],
  },
  ADMINISTRATION: {
    id: "administration",
    name: "Administration",
    description: "Company entity profile, user management, RBAC permission matrix and audit trails.",
    iconName: "Settings",
    primaryRoute: "/settings",
    submodules: [
      { id: "company_profile", name: "Company Profile", description: "Legal entity, GSTIN, PAN and headquarters", route: "/settings", capabilityTag: "admin_company:manage" },
      { id: "users_team", name: "Users & Team", description: "User accounts and workspace assignments", route: "/settings", capabilityTag: "admin_users:manage" },
      { id: "roles_permissions", name: "Roles & Permissions", description: "Granular access control policies", route: "/settings", capabilityTag: "admin_roles:manage" },
      { id: "organization_settings", name: "Organization Settings", description: "Currencies, timezones and fiscal calendars", route: "/settings", capabilityTag: "admin_org:manage" },
      { id: "audit_logs", name: "Audit Logs", description: "Security and compliance audit trails", route: "/settings", capabilityTag: "admin_audit:view" },
    ],
  },
};

export const ALL_MODULE_DOMAINS = Object.values(MASTER_MODULE_CATALOG);

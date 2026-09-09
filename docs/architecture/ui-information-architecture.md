# DEZOBUILD — Authoritative Global UI/UX Information Architecture & Restructure Specification

## 1. Executive Summary & Design Principles

This document specifies the global information architecture and UI/UX restructuring for the **DEZOBUILD** multi-tenant construction operating system across:
1. **Customer / Tenant Application** (`app.dezobuild.com` / `frontend/`)
2. **Platform Owner Governance Portal** (`owner.dezobuild.com` / `owner/`)

### 1.1 Core UX Hierarchy
Every domain in DEZOBUILD strictly follows the progressive disclosure hierarchy:

```
DOMAIN
  ↓
OVERVIEW (High-level pulse, 3–5 key metrics, primary action)
  ↓
WORK QUEUES ("Needs Attention", pending approvals, overdue items, exceptions)
  ↓
RECORDS / LISTS (Search + 1–3 essential filters, table/card toggle, no clutter)
  ↓
DETAIL WORKSPACE (Project 360, PO Detail, GRN Verification, Employee 360, Document Viewer)
  ↓
ACTIONS (One primary action per screen, secondary actions in rows/drawers/menus)
  ↓
REPORTS / HISTORY (Audit trails, historical logs, analytical exports)
```

### 1.2 Non-Negotiable Architectural Rules
1. **Zero Feature Removal**: Every business capability, mock dataset, calculation, and workflow is 100% preserved.
2. **No Flat Giant Tab Strips**: Flat lists of 7–10 competing operational tabs are eliminated in favor of structured secondary navigation and contextual workspaces.
3. **Single Primary Action**: Each screen presents exactly one prominent primary action. Secondary actions are moved to contextual bars, row actions, or detail workspaces.
4. **Strict Dual-Portal Separation**: Platform governance (`owner/`) and customer enterprise operations (`frontend/`) maintain clear boundaries.
5. **Role-Aware Simplicity**: Workspaces adapt to the persona (e.g., `COMPANY_OWNER`, `PROJECT_MANAGER`, `SITE_ENGINEER`, `ACCOUNTANT`, `HR`, `EMPLOYEE`, `VIEWER`).

---

## 2. Customer Application Navigation & Domain Architecture

### 2.1 Primary Sidebar (Domains Only)
The primary sidebar represents business domains only. No individual operational entities (such as WBS, DPR, GRN, Attendance, Fuel, Maintenance, Expenses) are top-level sidebar items.

| # | Sidebar Domain | Route | Target Audience |
|---|---|---|---|
| 1 | **Executive / Role Overview** | `/` | All roles (contextually tailored) |
| 2 | **Projects** | `/projects` | Owner, Admin, PM, Site Engineer, Accountant, Viewer |
| 3 | **Finance & Commercial** | `/finance` | Owner, Admin, Accountant, PM |
| 4 | **Procurement & Store** | `/materials` | Owner, Admin, Store Manager, Site Engineer, PM |
| 5 | **People & HR** | `/people` | Owner, Admin, HR, Site Engineer, PM, Employee |
| 6 | **Plant & Equipment** | `/equipment` | Owner, Admin, PM, Site Engineer |
| 7 | **Issues & Alerts** | `/alerts` | All roles (scoped exceptions) |
| 8 | **Analytics & Reports** | `/reports` | Owner, Admin, PM, Accountant, HR, Store, Viewer |
| 9 | **Documents & Drawings** | `/documents` | All roles (GFC drawings, contracts, NOCs) |
| 10 | **Administration** | `/settings` | Company Owner, Company Admin only |

---

## 3. Detailed Domain Specifications & Workflow Hierarchies

### 3.1 Domain: Projects (`/projects` & `/projects/:projectId` & `/projects/new`)

#### `/projects` — Portfolio Command Center
- **Page Header**: Title "Projects & Construction Portfolio", Subtitle, Primary Action: `+ Create Project`.
- **Key Metrics (4)**: Total Portfolio Budget, Incurred Cost, Active Site Projects, Projects with Critical Risks.
- **Attention / Work Queue**: Projects requiring immediate attention (critical health, overdue milestones, unreviewed DPRs).
- **Secondary Navigation**:
  - `Overview / Portfolio`: Portfolio grid/table, city & health filters, executive progress bars.
  - `Active Projects`: Sites under active physical execution.
  - `Planning`: Portfolio milestone baseline tracking and schedule variance.
  - `Progress`: Portfolio physical progress S-curve and DPR completion metrics.
  - `Commercial`: Portfolio financial exposure, budget utilization, committed POs.
  - `Documents`: Portfolio GFC drawings, contracts, and transmittals.

#### `/projects/:projectId` — Project 360 Command Center
- **Page Header**: Project Name, Code, Client, Location, Health Badge, Primary Action: `Export 360° Report` / `+ Add Activity`.
- **Key Metrics (4)**: Approved Budget, Incurred Cost, Physical Progress, Workforce on Site Today.
- **Attention Banner**: Critical risk banner with root cause and financial variance impact.
- **Domain Subsections**:
  1. `Overview`: Project Summary, Health, Site Team, Weather & Daily Conditions, Key Milestones, Recent Activity.
  2. `Planning`: [Summary | WBS Tree | Activities | Milestones | Schedule Baseline] with `+ Add WBS Activity` dialog.
  3. `Progress`: [Summary | Daily DPR Logs | Weekly Progress | Physical S-Curve | Delay & Variance] with DPR Detail Viewer & Photo Gallery.
  4. `Commercial`: [Summary | Budget Baselines | Incurred Costs | Expense Vouchers | Invoices & Payments | RA Bills | Cost Variance] with `+ Add Expense` dialog.
  5. `Materials`: Site requisitions, indents, current store inventory, GRN deliveries, material issues.
  6. `People`: Labour muster roll, contractor gangs deployed, daily headcount.
  7. `Equipment`: Machinery fleet deployed on site, running hours, diesel logs.
  8. `Issues`: Snags, safety observations, schedule blockers, variance alerts.
  9. `Documents`: GFC Drawings, contracts, compliance certificates, revisions.

---

### 3.2 Domain: Procurement & Store (`/materials`)

#### Operational Lifecycle:
`REQUIRE` → `PROCURE` → `RECEIVE` → `STORE` → `ISSUE / RETURN / TRANSFER` → `REPORT`

- **Page Header**: Title "Procurement & Store Operations", Subtitle, Primary Action: `+ Create Indent` / `+ Create Purchase Order` / `+ Issue Material`.
- **Key Metrics (4)**: Total Warehouse Stock Value, Open Purchase Orders, Pending Indents, Low Stock Warnings.
- **Attention / Work Queue**: Indents awaiting approval, open POs pending GRN receipt, stockout risk warnings.
- **Secondary Navigation**:
  - `Overview`: Supply chain lifecycle metrics, low stock alert table, pending approvals, quick actions.
  - `Procurement`: [Material Requirements | Indents & Requisitions | Purchase Orders | Vendors Directory].
  - `Receiving`: [Pending Receipts | Goods Receipt Notes (GRN) | Receipt History & Quality Inspections].
  - `Store`: [Warehouse Inventory | Material Issues | Material Returns | Stock Transfers | Stock Movements].
  - `Reports`: [Stock Summary | Procurement Ledger | Consumption Trends | Movement Audit].

---

### 3.3 Domain: Finance & Commercial (`/finance`)

- **Page Header**: Title "Finance & Commercial Cost Control", Subtitle, Primary Action: `+ Add Expense Voucher` (Secondary: `Create Payment Voucher`).
- **Key Metrics (4)**: Approved Portfolio Budget, Committed Cost (Open POs), Incurred Actual Cost, Pending Payables.
- **Attention / Work Queue**: Expenses awaiting review, payments overdue/pending approval, budget threshold exceedances.
- **Secondary Navigation**:
  - `Overview`: Current financial position, portfolio budget utilization visualizer, cash burn summary, pending obligations.
  - `Budget & Cost`: Cost code allocations, approved budgets vs commitments vs actuals, variance analysis.
  - `Expenses`: Site petty cash, expense vouchers, receipt attachment audit, category breakdown.
  - `Payments`: Vendor disbursements, payment obligations, pending/overdue invoices, payment methods.
  - `Receivables & Payables`: Client RA bills, subcontractor advances, retention balances, recoveries.
  - `Commercial Documents`: Contracts, rate agreements, tax invoices, bank guarantees.
  - `Reports`: Cash flow forecast, P&L, expense ledgers, tax reports.

---

### 3.4 Domain: People & HR (`/people`)

- **Page Header**: Title "People & Workforce Operations", Subtitle, Primary Action: `+ Add Employee` / `+ Register Gang`.
- **Key Metrics (4)**: Company Staff Headcount, Subcontractor Labour Strength, Today's Biometric Muster, Statutory PF/ESI Compliance.
- **Attention / Work Queue**: Pending leave requests, attendance exceptions, labour shortage alerts.
- **Secondary Navigation**:
  - `Overview`: Workforce summary, active subcontractor gangs, muster trends, compliance score.
  - `Employees`: Staff directory, designations, assigned projects, contact cards.
  - `Attendance`: Biometric muster roll, date picker, present/absent toggle, overtime tracking, muster saving.
  - `Leave`: Leave requests, balances, approval queue.
  - `Labour & Contractors`: Subcontractor gangs, trade specializations, current deployment, daily wage rates.
  - `HR Documents`: Employment contracts, safety guidelines, compliance certificates.
  - `Reports`: Headcount trends, overtime analysis, wage distribution.
- **Role Scoping**: For `EMPLOYEE` role, dedicated personal workspace: [My Tasks | My Attendance | My Documents | Profile].

---

### 3.5 Domain: Plant & Equipment (`/equipment`)

- **Page Header**: Title "Plant & Equipment Fleet", Subtitle, Primary Action: `+ Record Fuel Log` / `+ Add Maintenance Ticket`.
- **Key Metrics (4)**: Total Active Fleet, Running Machinery, Idle Assets, Maintenance & Breakdown.
- **Attention / Work Queue**: Breakdown tickets pending resolution, preventative service due, idle equipment alerts.
- **Secondary Navigation**:
  - `Overview`: Answers: What equipment exists? Where is it? What is idle? What requires maintenance? Fuel spend?
  - `Equipment Registry`: Machinery asset catalog, asset code, type, specs, ownership (owned vs rented).
  - `Assignments`: Site deployment, operator allocation, mobilization status.
  - `Utilization`: Hour meter readings, daily operating hours, uptime %.
  - `Fuel`: Fuel dispensing logs, diesel consumption, unit rates, total spend.
  - `Maintenance`: Breakdown tickets, service history, maintenance costs, technician logs.
  - `Reports`: Machinery productivity, fuel efficiency, maintenance expenses.

---

### 3.6 Domain: Issues & Alerts (`/alerts`)

- **Page Header**: Title "Issues & Alerts Exception Center", Subtitle, Primary Action: `+ Log Issue / Snag`.
- **Key Metrics (4)**: Critical Risks, Attention Items, Open Exceptions, Resolved Issues.
- **Attention / Work Queue**: Unacknowledged critical blockers with root cause and financial/schedule impact.
- **Secondary Navigation**:
  - `Overview`: Risk priority matrix, critical exceptions, root cause distribution, recent resolutions.
  - `All Issues`: Universal searchable exception log with search, project & category filters.
  - `My Issues`: Filtered exceptions assigned to current user / role.
  - `Critical`: High severity cost, schedule, and safety blockers.
  - `Project Issues`: Schedule delays, milestone risks, drawing revisions.
  - `Site Issues`: Material defects, equipment breakdowns, labour shortages.
  - `Resolved`: Archived and rectified issues with resolution notes.
- **Detail Drawer / RCA View**: Root Cause Analysis, Financial & Schedule Impact, Corrective Action, Acknowledge & Resolve workflows.

---

### 3.7 Domain: Documents & Drawings (`/documents`)

- **Page Header**: Title "Documents & Drawings Vault", Subtitle, Primary Action: `+ Upload Document`.
- **Key Metrics (4)**: Total Stored Documents, Architectural & Structural Drawings, Contracts & Agreements, GFC Revisions Approved.
- **Attention / Work Queue**: Documents pending approval/verification or revision check.
- **Secondary Navigation**:
  - `Overview`: Vault summary, category distribution, recent uploads, pending reviews.
  - `All Documents`: Universal searchable repository with search, project filter, grid/table toggle.
  - `Drawings`: Architectural, Structural, MEP GFC drawings with revision badges.
  - `Contracts`: Client agreements, vendor work orders, subcontractor rate contracts.
  - `Commercial`: Tax invoices, billing certificates, bank guarantees.
  - `HR`: Worker IDs, statutory compliance, safety certificates.
  - `Company`: Corporate licenses, GSTIN, PAN, company profile.
  - `Review Queue`: Pending verification and approval.
- **Document Detail View**: Preview dialog with metadata, versions, approval status, related project.

---

### 3.8 Domain: Analytics & Reports (`/reports`)

- **Page Header**: Title "Analytics & Reports Intelligence", Subtitle, Primary Actions: `Export PDF` / `Export XLSX`.
- **Key Metrics (4)**: Standard Reports Catalog, Scheduled Monthly Digests, Generated Reports, Compliance Audit Exports.
- **Attention / Work Queue**: Featured insights and variance alerts.
- **Secondary Navigation**:
  - `Overview`: Executive summary insights, report catalog directory, scheduled digests, quick export links.
  - `Project Reports`: WBS progress, S-curves, milestone slippage.
  - `Financial Reports`: Cash flow forecast, budget vs actuals, expense ledgers.
  - `Procurement Reports`: Material consumption, inventory valuation, stock turnover.
  - `People Reports`: Workforce productivity, biometric muster audit, overtime analysis.
  - `Equipment Reports`: Fleet utilization, fuel consumption, downtime analysis.
  - `Operational Reports`: Daily DPR digests, site logs, safety inspection reports.
- **Interactive Report Viewer**: Project filter, date range selector, data preview, export triggers.

---

### 3.9 Domain: Administration (`/settings`)

- **Page Header**: Title "Administration & Company Settings", Subtitle, Primary Action: `+ Invite User`.
- **Key Metrics (3)**: Active Team Members, Configured Roles, System Audit Logs.
- **Notice**: Customer Company Scope banner distinguishing customer settings from SaaS platform owner.
- **Secondary Navigation**:
  - `Company Profile`: Legal entity, GSTIN, PAN, registered addresses, branding.
  - `Users`: User directory, seat utilization, invitations, account status, role assignment.
  - `Roles & Permissions`: Granular RBAC policy matrix, role definitions, capability badges.
  - `Projects & Sites`: Master project setup, site branches, geo-fencing.
  - `Departments / Master Data`: Cost codes, material units, trade classifications.
  - `Workflow Configuration`: Approval limits, escalation rules, threshold triggers.
  - `Notifications`: Email, SMS, in-app alert rules.
  - `Audit Log`: Security trails, user actions, system modifications.
  - `Company Settings`: Fiscal year, currency, timezone, localized preferences.

---

## 4. Platform Owner Portal Architecture (`owner/`)

### 4.1 Domains and Progressive Disclosure
The owner application (`owner.dezobuild.com`) enforces identical progressive disclosure:

1. **Platform Overview (`/`)**:
   - Executive SaaS pulse (MRR, Total Tenants, Active Subscriptions, Platform Uptime).
   - Attention Queue: Tenants requiring renewal/billing action, unassigned tickets, system latency anomalies.
   - Quick navigation shortcuts.

2. **Companies & Tenants (`/tenants`)**:
   - Secondary Navigation: [Overview | All Tenants | Provisioning | Tenant Health].
   - Primary Action: `+ Provision Tenant`.
   - Tenant Detail Workspace: Modal/drawer for tenant configuration, contact, seat allocation, and plan status.

3. **Subscriptions & Plans (`/subscriptions`)**:
   - Secondary Navigation: [Overview | Plan Tiers | Active Subscriptions | Entitlements].
   - Billing cycle toggle (Monthly / Annual with 2 months free).
   - Add-on micro-packages configuration.

4. **Billing & Invoices (`/billing`)**:
   - Secondary Navigation: [Overview | Settlements | Invoices | Dunning & Retries].
   - Primary Action: `+ Create Invoice`.

5. **Users & Seat Quotas (`/users`)**:
   - Secondary Navigation: [Overview | Seat Allocations | Global Directory | 2FA Compliance].

6. **Feature Entitlements (`/entitlements`)**:
   - Secondary Navigation: [Overview | Feature Matrix | Add-On Bundles | Tenant Overrides].

7. **Platform Analytics (`/analytics`)**:
   - Secondary Navigation: [Overview | Telemetry | Tenant Growth | Storage Trends].

8. **System Health (`/health`)**:
   - Secondary Navigation: [Overview | API Latency | Database Pool | Workers & Queues].

9. **Global Audit Logs (`/audit`)**:
   - Secondary Navigation: [Overview | Security Logs | Impersonation History | Admin Events].

10. **Support & Operations (`/support`)**:
    - Secondary Navigation: [Overview | Ticket Queue | SLA Escalations | Data Requests].
    - Primary Action: `+ Create Support Ticket`.

11. **Platform Settings (`/settings`)**:
    - Secondary Navigation: [Overview | Mailers & SMTP | Webhooks | SaaS Constants].

---

## 5. Comprehensive Feature Preservation Matrix

| Current Route | Current Feature | Current Action | New Domain | New Page | New Subsection | New Detail View | Preserved? |
|---|---|---|---|---|---|---|---|
| `/` | Role Overview | Select period / View assigned | Overview | `/` | Contextual Overview | Quick Action Dialog | **YES** |
| `/projects` | Portfolio Grid/Table | Filter by city/health | Projects | `/projects` | Overview / Portfolio | Project Card / Row | **YES** |
| `/projects` | Active Sites Filter | Filter active sites | Projects | `/projects` | Active Projects | Project Card / Row | **YES** |
| `/projects` | Planning View | Milestone health | Projects | `/projects` | Planning | Milestone Table | **YES** |
| `/projects` | Progress S-Curve | Physical progress | Projects | `/projects` | Progress | Progress Table | **YES** |
| `/projects` | Commercial Summary | Budget vs actual | Projects | `/projects` | Commercial | Financial Exposure | **YES** |
| `/projects` | Drawing Vault | Drawing cards | Projects | `/projects` | Documents | Drawing List | **YES** |
| `/projects` | Create Project | `+ Create Project` button | Projects | `/projects/new` | Wizard (7 Steps) | Create Wizard | **YES** |
| `/projects/:id` | Project Overview | Health & KPIs | Projects | `/projects/:id` | Overview | Overview Tab | **YES** |
| `/projects/:id` | WBS Tree & Activities | Add WBS Activity | Projects | `/projects/:id` | Planning → WBS | Add WBS Dialog | **YES** |
| `/projects/:id` | DPR Daily Logs | View DPR / Photo Gallery | Projects | `/projects/:id` | Progress → DPR | DPR Viewer & Photo Gallery | **YES** |
| `/projects/:id` | Site Expenses | Add Expense Voucher | Projects | `/projects/:id` | Commercial → Expenses | Add Expense Dialog | **YES** |
| `/projects/:id` | Site Payments | View Payments | Projects | `/projects/:id` | Commercial → Payments | Payment Table | **YES** |
| `/projects/:id` | Materials Scoping | View Indents & Stock | Projects | `/projects/:id` | Materials | Material Table | **YES** |
| `/projects/:id` | Labour Gangs | View Site Muster | Projects | `/projects/:id` | People | Gang Table | **YES** |
| `/projects/:id` | Equipment Scoping | View Machinery | Projects | `/projects/:id` | Equipment | Equipment Table | **YES** |
| `/projects/:id` | Smart Alerts | Review Alert RCA | Projects | `/projects/:id` | Issues | Alert Review | **YES** |
| `/projects/:id` | Drawings Vault | Preview Drawing | Projects | `/projects/:id` | Documents | Document Viewer | **YES** |
| `/materials` | Material Inventory | Filter category/warehouse | Procurement | `/materials` | Store → Inventory | Material Row | **YES** |
| `/materials` | Indents Requisition | Create Indent | Procurement | `/materials` | Procurement → Indents | New Indent Dialog | **YES** |
| `/materials` | Purchase Orders | Create PO | Procurement | `/materials` | Procurement → POs | New PO Dialog | **YES** |
| `/materials` | GRN Verification | Create GRN Entry | Procurement | `/materials` | Receiving → GRN | New GRN Dialog | **YES** |
| `/materials` | Material Issues | Issue Stock to WBS | Procurement | `/materials` | Store → Issues | Issue Dialog | **YES** |
| `/materials` | Material Returns | Record Site Return | Procurement | `/materials` | Store → Returns | Returns Table | **YES** |
| `/materials` | Stock Transfers | Inter-warehouse Transfer | Procurement | `/materials` | Store → Transfers | Transfer Table | **YES** |
| `/materials` | Vendors Directory | Rate Supplier | Procurement | `/materials` | Procurement → Vendors | Vendor Card | **YES** |
| `/materials` | Supply Chain Reports | Export Stock/Consumption | Procurement | `/materials` | Reports → Stock/Consumption | Report Tables | **YES** |
| `/finance` | Expense Ledger | Add Expense Voucher | Finance | `/finance` | Expenses | Add Expense Dialog | **YES** |
| `/finance` | Payments Ledger | Create Payment Voucher | Finance | `/finance` | Payments | Add Payment Dialog | **YES** |
| `/finance` | Advances & Recovery | Record Subcontractor Advance | Finance | `/finance` | Receivables & Payables | Add Advance Dialog | **YES** |
| `/finance` | Budget vs Actual | Variance Stacked Bar | Finance | `/finance` | Budget & Cost | Variance Visualizer | **YES** |
| `/finance` | Vendors Directory | View Ledger | Finance | `/finance` | Receivables & Payables | Vendor Table | **YES** |
| `/finance` | Contractors Ledger | View Gang Payments | Finance | `/finance` | Receivables & Payables | Contractor Table | **YES** |
| `/people` | Staff Directory | Add Employee | People | `/people` | Employees | Add Employee Dialog | **YES** |
| `/people` | Biometric Muster Roll | Mark / Save Muster | People | `/people` | Attendance | Muster Roll Table | **YES** |
| `/people` | Leave Management | Apply / Approve Leave | People | `/people` | Leave | Leave Table | **YES** |
| `/people` | Subcontractor Gangs | Register Gang | People | `/people` | Labour & Contractors | Register Gang Dialog | **YES** |
| `/people` | HR Documents | Download Safety Guide | People | `/people` | HR Documents | Document Cards | **YES** |
| `/people` | HR Reports | Headcount Trends | People | `/people` | Reports | HR Analytics | **YES** |
| `/people` | Employee Self-Service | My Punch / My Tasks | People | `/people` | My Attendance / My Tasks | Employee Dashboard | **YES** |
| `/equipment` | Equipment Registry | Filter Status | Equipment | `/equipment` | Equipment Registry | Equipment Table | **YES** |
| `/equipment` | Site Allocation | View Current Site | Equipment | `/equipment` | Assignments | Allocation Table | **YES** |
| `/equipment` | Utilization / Hours | View Hour Meters | Equipment | `/equipment` | Utilization | Hour Meter Table | **YES** |
| `/equipment` | Fuel Dispensing | Record Fuel Log | Equipment | `/equipment` | Fuel | Record Fuel Dialog | **YES** |
| `/equipment` | Maintenance Tickets | Add Maintenance Ticket | Equipment | `/equipment` | Maintenance | Maintenance Dialog | **YES** |
| `/equipment` | Equipment Reports | Fuel & Cost Analytics | Equipment | `/equipment` | Reports | Machinery Reports | **YES** |
| `/alerts` | Severity Filter | All / Critical / Attention | Issues | `/alerts` | Overview / All / Critical | Filter Controls | **YES** |
| `/alerts` | Root Cause Analysis | View Impact / Suggested Action | Issues | `/alerts` | All / Critical / Site | Detail Modal / Drawer | **YES** |
| `/alerts` | Acknowledge Alert | Mark Acknowledged | Issues | `/alerts` | All Issues | Action Trigger | **YES** |
| `/alerts` | Resolve Alert | Enter Resolution Note | Issues | `/alerts` | All Issues | Resolution Dialog | **YES** |
| `/documents` | Category Filter | Drawings / Contracts / NOCs | Documents | `/documents` | Drawings / Contracts / etc. | Category Tabs | **YES** |
| `/documents` | Upload Document | Upload Drawing / File | Documents | `/documents` | Overview / All Documents | Upload Dialog | **YES** |
| `/documents` | Document Viewer | Preview PDF / Markup | Documents | `/documents` | All Subsections | Viewer Dialog | **YES** |
| `/reports` | Standard Reports | Filter by Domain | Reports | `/reports` | Domain Subsections | Report Selector | **YES** |
| `/reports` | Report Preview | Change Project / Date Range | Reports | `/reports` | Report View | Interactive Table | **YES** |
| `/reports` | Export Report | Export PDF / XLSX | Reports | `/reports` | Report View | Export Triggers | **YES** |
| `/settings` | Company Profile | Update Legal / Tax Info | Admin | `/settings` | Company Profile | Profile Form | **YES** |
| `/settings` | Users & Team | Invite User | Admin | `/settings` | Users | Invite Modal | **YES** |
| `/settings` | Roles & Permissions | View Granular RBAC Matrix | Admin | `/settings` | Roles & Permissions | RBAC Matrix Table | **YES** |
| `/settings` | Projects & Sites | Configure Sites | Admin | `/settings` | Projects & Sites | Site Master | **YES** |
| `/settings` | Master Data | Cost Codes & Units | Admin | `/settings` | Master Data | Data Lists | **YES** |
| `/settings` | Workflow Config | Approval Limits | Admin | `/settings` | Workflow Config | Threshold Form | **YES** |
| `/settings` | Notifications | Alert Preferences | Admin | `/settings` | Notifications | Notification Rules | **YES** |
| `/settings` | Audit Logs | Security Trail | Admin | `/settings` | Audit Log | Audit Log Table | **YES** |
| `/settings` | Org Settings | Fiscal / Currency Settings | Admin | `/settings` | Company Settings | Settings Form | **YES** |
| `owner/` | Tenant Provisioning | Provision Tenant | Owner | `owner/tenants` | Provisioning | Provision Dialog | **YES** |
| `owner/` | Subscription Plans | Monthly/Annual Toggle | Owner | `owner/subscriptions` | Plans | Plan Cards | **YES** |
| `owner/` | Billing Settlements | Invoice Management | Owner | `owner/billing` | Invoices | Invoice Table | **YES** |
| `owner/` | Seat Quotas | Quota Tracking | Owner | `owner/users` | Users | Seat Matrix | **YES** |
| `owner/` | Entitlements | Toggle Flags | Owner | `owner/entitlements` | Entitlements | Feature Flag Matrix | **YES** |
| `owner/` | Platform Telemetry | Uptime & Latency | Owner | `owner/health` | Health | Telemetry Charts | **YES** |
| `owner/` | Global Audit | Impersonation Logs | Owner | `owner/audit` | Audit | Global Audit Table | **YES** |
| `owner/` | Support Tickets | Ticket Queue | Owner | `owner/support` | Support | Support Ticket Table | **YES** |
| `owner/` | Platform Settings | SMTP & Webhooks | Owner | `owner/settings` | Settings | Platform Config Form | **YES** |

---

## 6. Verification and Validation Checklist

1. **Route Integrity**: All 12 canonical routes (`/`, `/projects`, `/projects/new`, `/projects/:id`, `/materials`, `/finance`, `/people`, `/equipment`, `/alerts`, `/reports`, `/documents`, `/settings`) operational.
2. **Build Verification**: `npm run build:frontend`, `npm run build:owner`, `npm run build:backend` pass with 0 errors.
3. **Test Verification**: Vitest unit and e2e test suites (`npm test`) pass 100%.
4. **Role Authorizations**: All 9 customer roles (`COMPANY_OWNER`, `COMPANY_ADMIN`, `PROJECT_MANAGER`, `SITE_ENGINEER`, `PROCUREMENT_STORE`, `ACCOUNTANT`, `HR`, `EMPLOYEE`, `VIEWER`) and 1 platform role (`SUPER_ADMIN`) resolve correct permissions and navigation trees.
5. **No Data Loss**: All mock datasets, forms, mutations, calculations, dialogs, and filters remain fully operational.

# DEZOBUILD — Frontend to Backend Integration Map (v1)

```text
================================================================================
Document ID     : ARCH-DEZ-011
Milestone       : BACKEND ARCHITECTURE BASELINE v1
Status          : AUTHORITATIVE BASELINE — FROZEN FOR IMPLEMENTATION
Scope           : 1:1 Mapping of Frozen Frontend Routes & Components to Backend APIs
================================================================================
```

---

## 1. Integration Topology & Zero-Redesign Guarantee

This document maps every frozen page, tab, modal, and action in the **DEZOBUILD** Customer Operations App (`app.dezobuild.com`) and Platform Owner Governance Hub (`owner.dezobuild.com`) directly to its authoritative backend module, primary database entity, REST endpoint, and required security permission.

---

## 2. Customer Operations Portal Mapping (`app.dezobuild.com`)

### 2.1 Route: `/` (Operational Command Center)
* **Frontend Components**: Executive KPI Stat Grid, Project Health Donut, Cash Burn Chart, Quick Action Hub, Live Site Activity Stream, Smart Exception Banner.
* **Backend Module**: Aggregation Service / `alerts` / `projects` / `finance`
* **API Endpoints**:
  * `GET /api/v1/dashboard/summary` (KPI statistics & aggregate progress)
  * `GET /api/v1/alerts?status=open&severity=critical` (High-severity alerts banner)
  * `GET /api/v1/audit/activity-feed?limit=10` (Recent site operations)
* **Required Permission**: `projects:view`
* **Entitlement**: All tiers

---

### 2.2 Route: `/projects` & `/projects/new` (Project Portfolio & Creation Wizard)
* **Frontend Components**: Projects Grid/Table, Health Filter Bar, Project Card Metrics, Creation Wizard Modal (Name, Code, Client, Legal Entity, Branch, Budget, Dates).
* **Backend Module**: `projects` / `tenancy` / `subscriptions`
* **API Endpoints**:
  * `GET /api/v1/projects` (List projects with variance and health)
  * `POST /api/v1/projects` (Create project with capacity validation against Plan tier)
* **Required Permission**: `projects:view` (List), `projects:create` (Create)
* **Entitlement Check**: `TenantSubscription.maxProjects` capacity limit

---

### 2.3 Route: `/projects/$id` (Unified 15-Tab Project Operations Console)

| Tab Index & Name | Frontend Features | Backend Module | Primary Entity | Backend Endpoints & Mutations | Required Permission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tab 01: Overview** | Health score, weather, team members, critical issues count | `projects` | `Project`, `ProjectMember` | `GET /api/v1/projects/:id` | `projects:view` |
| **Tab 02: WBS** | Hierarchical activity tree, planned/actual qty & cost, progress | `projects` | `WbsActivity` | `GET /api/v1/projects/:id/wbs`<br/>`POST /api/v1/projects/:id/wbs`<br/>`PATCH /api/v1/projects/:id/wbs/:activityId` | `projects:wbs:edit` |
| **Tab 03: DPR** | Daily shift progress, manpower muster, equipment runtime, photos | `projects` | `DprRecord` | `GET /api/v1/projects/:id/dpr`<br/>`POST /api/v1/projects/:id/dpr`<br/>`POST /api/v1/projects/:id/dpr/:dprId/approve` | `projects:dpr:create`<br/>`projects:dpr:approve` |
| **Tab 04: Photos** | Site progress photo gallery, timestamps, caption tags | `projects` / `files` | `DprPhoto`, `Attachment` | `GET /api/v1/projects/:id/photos`<br/>`POST /api/v1/attachments/presign-upload` | `projects:view` |
| **Tab 05: Cost Control** | Baseline budget, committed POs, actual expenses, EAC variance | `finance` | `ProjectBudget`, `CostLedger` | `GET /api/v1/projects/:id/cost-ledger` | `finance:view` |
| **Tab 06: BOQ & MB** | BOQ rate items, Digital Measurement Book, dimension math, verification | `commercial` | `BoqItem`, `DigitalMbRecord` | `GET /api/v1/projects/:id/boq`<br/>`POST /api/v1/projects/:id/mb`<br/>`POST /api/v1/projects/:id/mb/:mbId/verify` | `measurements:create`<br/>`measurements:verify` |
| **Tab 07: Lookahead** | 2-week & 4-week lookahead schedules, delay risk flags, blockers | `projects` | `LookaheadItem` | `GET /api/v1/projects/:id/lookahead`<br/>`PATCH /api/v1/projects/:id/lookahead/:id` | `projects:view` |
| **Tab 08: Pour Cards** | Structural concrete pour records, 5-point pre-pour checklist | `quality` | `PourCard` | `GET /api/v1/projects/:id/pour-cards`<br/>`POST /api/v1/projects/:id/pour-cards`<br/>`POST /api/v1/projects/:id/pour-cards/:id/approve` | `quality:pour:create`<br/>`quality:pour:approve` |
| **Tab 09: QA/QC & NCR** | Non-Conformance Reports, severity badges, CAPA plans, closeouts | `quality` | `NcrRecord` | `GET /api/v1/projects/:id/ncrs`<br/>`POST /api/v1/projects/:id/ncrs`<br/>`POST /api/v1/projects/:id/ncrs/:id/close` | `quality:ncr:create`<br/>`quality:ncr:verify` |
| **Tab 10: Safety & EHS** | Daily safety audits, PPE compliance %, near-miss/LTI incident logs | `safety` | `SafetyWalkthrough`, `SafetyIncident` | `GET /api/v1/projects/:id/safety`<br/>`POST /api/v1/safety/walkthroughs`<br/>`POST /api/v1/safety/incidents` | `safety:audit:create`<br/>`safety:incident:create` |
| **Tab 11: Drawings** | GFC drawing register, revision codes, supersede status | `documents` | `DrawingRecord`, `DrawingRevision` | `GET /api/v1/projects/:id/drawings`<br/>`POST /api/v1/drawings/:id/revisions` | `documents:view`<br/>`documents:manage` |
| **Tab 12: RFIs** | Technical RFIs, engineering queries, transmittals, responses | `documents` | `RfiRecord` | `GET /api/v1/projects/:id/rfis`<br/>`POST /api/v1/rfis`<br/>`POST /api/v1/rfis/:id/respond` | `documents:rfi:create`<br/>`documents:rfi:respond` |
| **Tab 13: RA Bills** | Subcontractor running bills, retention % math, tax deductions, payables | `finance` | `ContractorRaBill` | `GET /api/v1/projects/:id/ra-bills`<br/>`POST /api/v1/contractor-ra-bills`<br/>`POST /api/v1/contractor-ra-bills/:id/verify`<br/>`POST /api/v1/contractor-ra-bills/:id/approve` | `finance:bill:create`<br/>`finance:bill:verify`<br/>`finance:bill:approve` |
| **Tab 14: Client Claims**| Client billing claims, cumulative certified amounts, GST calculation | `finance` | `ClientClaim` | `GET /api/v1/projects/:id/client-claims`<br/>`POST /api/v1/client-claims`<br/>`POST /api/v1/client-claims/:id/certify` | `finance:claim:create`<br/>`finance:claim:certify` |
| **Tab 15: Final Bills** | Contract closeouts, final settlements, retention release, no-claim cert | `finance` | `FinalBillSettlement` | `GET /api/v1/projects/:id/final-bills`<br/>`POST /api/v1/final-bills/:id/approve` | `finance:bill:approve` |

---

### 2.4 Route: `/materials` (Procurement, Stores & Stock Ledgers)
* **Frontend Components**: Stock Master Catalogue, Indent Manager, Purchase Orders, 3-Way Match GRN Modal, Material Issue to WBS Dialog, Inter-Site Stock Transfer Modal.
* **Backend Module**: `procurement` / `inventory`
* **API Endpoints**:
  * `GET /api/v1/materials` (Catalogue list)
  * `GET /api/v1/stores/:id/balances` (Bin card stock levels)
  * `POST /api/v1/materials/indents` (Create indent)
  * `POST /api/v1/purchase-orders/:id/issue` (Issue PO)
  * `POST /api/v1/grn/:id/verify` (Atomic 3-way match & stock ledger posting)
  * `POST /api/v1/stores/:id/issues` (Atomic stock issue to WBS)
  * `POST /api/v1/stores/transfers` (Dispatch stock transfer)
  * `POST /api/v1/stores/transfers/:id/receive` (Receive stock transfer)
* **Required Permission**: `materials:view`, `materials:indent:create`, `materials:po:approve`, `materials:grn:verify`, `materials:stock:issue`

---

### 2.5 Route: `/finance` (Cost Control, Petty Cash, RA Bills & Payouts)
* **Frontend Components**: Cash Burn Curve, Petty Cash Vouchers, Subcontractor RA Bills, Mobilization Advances, Payment Disbursement Vouchers.
* **Backend Module**: `finance`
* **API Endpoints**:
  * `GET /api/v1/expenses` (Petty cash claims)
  * `POST /api/v1/expenses/:id/approve` (Approve expense)
  * `GET /api/v1/contractor-ra-bills` (RA bill list)
  * `POST /api/v1/payments/disburse` (Idempotent payment disbursement)
  * `POST /api/v1/advances` (Issue advance)
* **Required Permission**: `finance:view`, `finance:expense:approve`, `finance:bill:approve`, `finance:payment:disburse`

---

### 2.6 Route: `/people` (Staff Directory, Labour Gangs & Daily Muster)
* **Frontend Components**: Employee Directory, Labour Contractor Rosters, Biometric Turnstile Attendance Logs, Overtime Wage Calculator.
* **Backend Module**: `people`
* **API Endpoints**:
  * `GET /api/v1/employees` (Staff list)
  * `GET /api/v1/attendance` (Daily muster)
  * `POST /api/v1/attendance` (Record site attendance & calculate wage impact)
* **Required Permission**: `people:view`, `people:manage`, `people:attendance:create`

---

### 2.7 Route: `/equipment` (Heavy Fleet & Fuel Telematics)
* **Frontend Components**: Machinery Asset Register, Operating Status Badges, Fuel Dispensing Logs, Hour Meter Readings, Maintenance Tickets.
* **Backend Module**: `equipment`
* **API Endpoints**:
  * `GET /api/v1/equipment` (Machinery list)
  * `POST /api/v1/equipment/:id/fuel` (Log fuel dispensing & hour meter)
  * `POST /api/v1/equipment/:id/maintenance` (Create/resolve service ticket)
* **Required Permission**: `equipment:view`, `equipment:fuel:log`, `equipment:maintenance:create`

---

### 2.8 Route: `/alerts` (Smart Exception Engine & Root Cause Workflows)
* **Frontend Components**: Anomaly Alert Cards, Root Cause Analysis, Suggested Action Buttons, Acknowledge/Resolve Dialogs, Custom Alert Rules Manager.
* **Backend Module**: `alerts`
* **API Endpoints**:
  * `GET /api/v1/alerts` (List active anomaly alerts)
  * `POST /api/v1/alerts/:id/acknowledge` (Acknowledge alert)
  * `POST /api/v1/alerts/:id/resolve` (Resolve alert with remediation log)
  * `GET /api/v1/alerts/rules` & `POST /api/v1/alerts/rules` (Configure rules)
* **Required Permission**: `alerts:view`, `alerts:manage`

---

### 2.9 Route: `/documents` (GFC Drawings, RFIs & Statutory Compliance)
* **Frontend Components**: GFC Drawing Register, Revision Version Timeline, Drawing Viewer Dialog, Technical RFI Query Manager, Statutory NOC Repository.
* **Backend Module**: `documents`
* **API Endpoints**:
  * `GET /api/v1/drawings` & `POST /api/v1/drawings/:id/revisions` (Drawing versioning)
  * `GET /api/v1/rfis` & `POST /api/v1/rfis/:id/respond` (RFI resolution)
  * `GET /api/v1/attachments/:id/download` (Pre-signed S3 download)
* **Required Permission**: `documents:view`, `documents:manage`, `documents:rfi:create`

---

### 2.10 Route: `/reports` (Executive Reports & Asynchronous Exports)
* **Frontend Components**: Report Catalog, Cadence Configuration, Format Selector (PDF/XLSX), Report Execution History, Download Action.
* **Backend Module**: `reports`
* **API Endpoints**:
  * `GET /api/v1/reports/configs` (Report catalog)
  * `POST /api/v1/reports/executions` (Queue asynchronous report generation)
  * `GET /api/v1/reports/executions/:id` (Poll status & receive download URL)
* **Required Permission**: `reports:view`, `reports:generate`

---

### 2.11 Route: `/settings` (Company Masters, Subscription & RBAC Matrix)
* **Frontend Components**: Corporate Profile, GSTIN/PAN Masters, Branch Registry, Subscription Tier Usage Cards, Granular RBAC Role Permission Matrix, Approval Rules Builder.
* **Backend Module**: `tenancy` / `subscriptions` / `identity` / `approvals`
* **API Endpoints**:
  * `GET /api/v1/tenants/settings` & `PATCH /api/v1/tenants/settings` (Enterprise profile)
  * `GET /api/v1/tenants/subscription` (Capacity limits & usage)
  * `GET /api/v1/roles` & `PATCH /api/v1/roles/:id/permissions` (RBAC matrix)
  * `GET /api/v1/approvals/rules` & `POST /api/v1/approvals/rules` (Approval engine)
* **Required Permission**: `settings:view`, `settings:manage`, `settings:rbac:manage`

---

## 3. Platform Owner Governance Hub Mapping (`owner.dezobuild.com`)

| Route | Platform Feature | Backend Module | Primary Endpoint | Required Role |
| :--- | :--- | :--- | :--- | :--- |
| `/` (Overview) | Platform ARR, total active tenants, health telemetry | `platform` | `GET /api/v1/owner/overview` | `SUPER_ADMIN` |
| `/tenants` | Enterprise customer tenant directory, provisioning, suspension | `platform` | `GET /api/v1/owner/tenants`<br/>`POST /api/v1/owner/tenants`<br/>`POST /api/v1/owner/tenants/:id/suspend` | `SUPER_ADMIN` |
| `/subscriptions` | SaaS subscription plans, renewal calendars, billing history | `platform` | `GET /api/v1/owner/subscriptions` | `SUPER_ADMIN` |
| `/entitlements` | Plan feature matrix, custom enterprise capacity overrides | `platform` | `PATCH /api/v1/owner/entitlements/:tenantId` | `SUPER_ADMIN` |
| `/health` | Server CPU/Memory, database latency, outbox queue backlogs | `platform` | `GET /api/v1/owner/health` | `SUPER_ADMIN` |
| `/audit` | Platform security logs, support session audit records | `platform` | `GET /api/v1/owner/audit` | `SUPER_ADMIN` |

# DEZOBUILD — REST API Contract & Endpoint Catalog (v1)

```text
================================================================================
Document ID     : ARCH-DEZ-004
Milestone       : BACKEND ARCHITECTURE BASELINE v1
Status          : AUTHORITATIVE BASELINE — FROZEN FOR IMPLEMENTATION
Scope           : REST API Standards, Endpoint Specifications, DTOs & Error Formats
================================================================================
```

---

## 1. REST API Design Standards & Conventions

### 1.1 URL Structure & Versioning
All backend API routes follow the canonical prefix `/api/v1/`.
* Collections: `/api/v1/{resource}` (e.g., `/api/v1/projects`)
* Individual Entities: `/api/v1/{resource}/:id` (e.g., `/api/v1/projects/550e8400-e29b-41d4-a716-446655440000`)
* Sub-Resources: `/api/v1/{resource}/:id/{sub-resource}` (e.g., `/api/v1/projects/:id/wbs`, `/api/v1/projects/:id/ra-bills`)
* Explicit Workflow Commands: `POST /api/v1/{resource}/:id/{action}` (e.g., `POST /api/v1/contractor-ra-bills/:id/verify`, `POST /api/v1/expenses/:id/approve`)

### 1.2 Standard HTTP Headers

| Header Name | Required | Description / Example |
| :--- | :--- | :--- |
| `Authorization` | Yes (Protected) | `Bearer eyJhbGciOiJIUzI1NiIsIn...` (Access Token) |
| `X-Tenant-ID` | Optional (Implicit) | Tenant UUID. Validated against user's active tenant session context. |
| `Idempotency-Key` | Mandatory (Mutations) | UUID v4 protecting against duplicate submissions and network retries. |
| `X-Correlation-ID` | System Injected | Distributed tracing correlation ID across requests and outbox events. |
| `Content-Type` | Yes | `application/json` |

---

## 2. Standard Response & Error Envelope

### 2.1 Success Envelopes

#### Single Resource Response (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": {
    "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "projectCode": "PRJ-BLR-001",
    "name": "Dezoryn Heights Tower A",
    "status": "active",
    "budget": 45000000.00,
    "createdAt": "2026-03-01T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-03-09T12:00:00.000Z",
    "correlationId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
  }
}
```

#### Paginated List Response (`PaginatedResponse<T>`)
```json
{
  "success": true,
  "data": [
    { "id": "uuid-1", "name": "Cement OPC 53", "currentStock": 450.0 }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 25,
      "totalItems": 142,
      "totalPages": 6,
      "hasNext": true,
      "hasPrev": false
    },
    "timestamp": "2026-03-09T12:00:00.000Z",
    "correlationId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
  }
}
```

### 2.2 Standard Error Response (RFC 7807 Problem Details)
```json
{
  "success": false,
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "title": "Active Project Limit Reached",
    "status": 409,
    "detail": "Your Starter Tier subscription allows a maximum of 2 active projects. Upgrade to Professional Tier to create additional projects.",
    "instance": "/api/v1/projects",
    "invalidParams": [
      {
        "name": "status",
        "reason": "Active project limit (2/2) currently reached"
      }
    ],
    "timestamp": "2026-03-09T12:00:00.000Z",
    "correlationId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
  }
}
```

---

## 3. Comprehensive Endpoint Catalog Across 17 Domains

### 3.1 Domain 01: Identity, Access & Auth

| Route | Method | Permission | Summary & State Transition |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | Public | Authenticates credentials, creates active session, issues HttpOnly refresh cookie & access token. |
| `/api/v1/auth/refresh` | `POST` | Public (Cookie) | Rotates refresh token, issues new access token (~15m). |
| `/api/v1/auth/logout` | `POST` | Authenticated | Revokes current session ID in database. Clears refresh cookie. |
| `/api/v1/auth/me` | `GET` | Authenticated | Returns current user profile, tenant bindings, active role, and permission namespaces. |
| `/api/v1/auth/password/reset-request` | `POST` | Public | Generates single-use password reset token; queues outbox email event. |
| `/api/v1/auth/password/reset-confirm` | `POST` | Public | Validates token, updates bcrypt hash, increments `sessionVersion` (revokes all active sessions). |

---

### 3.2 Domain 02 & 03: Tenancy, Subscriptions & Entitlements

| Route | Method | Permission | Summary & State Transition |
| :--- | :--- | :--- | :--- |
| `/api/v1/tenants/settings` | `GET` | `settings:view` | Returns tenant enterprise metadata, currency, timezone, and fiscal calendar. |
| `/api/v1/tenants/settings` | `PATCH` | `settings:manage` | Updates enterprise profile, GSTIN, PAN, and address masters. |
| `/api/v1/tenants/subscription` | `GET` | `settings:view` | Returns active plan details, limits, and current capacity utilization (projects, seats, storage). |
| `/api/v1/tenants/companies` | `GET` | `settings:view` | Lists legal entity companies registered under the tenant. |
| `/api/v1/tenants/companies` | `POST` | `settings:manage` | Registers a new legal company (PAN, CIN, GSTIN, registered office). |
| `/api/v1/tenants/branches` | `GET` | `settings:view` | Lists regional operational branches and state GSTIN registrations. |
| `/api/v1/tenants/departments` | `GET` | `settings:view` | Lists tenant-scoped organizational departments. |
| `/api/v1/tenants/departments` | `POST` | `settings:manage` | Creates a new tenant department. |

---

### 3.3 Domain 04 & 05: Projects, WBS & Daily Progress (DPR)

| Route | Method | Permission | Scope | Summary & State Transition |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/projects` | `GET` | `projects:view` | Tenant / Member | Lists projects filtered by status, city, health with summary metrics. |
| `/api/v1/projects` | `POST` | `projects:create` | Tenant | Creates project; validates plan capacity limit (Starter $\le 2$, Pro $\le 10$). |
| `/api/v1/projects/:id` | `GET` | `projects:view` | Project Scope | Returns project detail, financial variance, health status, team directory. |
| `/api/v1/projects/:id` | `PATCH` | `projects:manage` | Project Scope | Updates project metadata, description, manager assignment. |
| `/api/v1/projects/:id/archive` | `POST` | `projects:manage` | Project Scope | Transitions `status = archived`. Locks all child modules against new writes. |
| `/api/v1/projects/:id/wbs` | `GET` | `projects:view` | Project Scope | Returns full hierarchical WBS tree with planned/actual cost & progress. |
| `/api/v1/projects/:id/wbs` | `POST` | `projects:wbs:edit`| Project Scope | Adds a WBS activity or sub-package under `parentId`. |
| `/api/v1/projects/:id/wbs/:activityId` | `PATCH` | `projects:wbs:edit`| Project Scope | Updates planned/actual quantities, dates, status, or gang assignment. |
| `/api/v1/projects/:id/dpr` | `GET` | `projects:view` | Project Scope | Returns DPR list filtered by date range and shift. |
| `/api/v1/projects/:id/dpr` | `POST` | `projects:dpr:create` | Project Scope | Creates DPR draft (`status = draft`) with manpower, equipment, and photos. |
| `/api/v1/projects/:id/dpr/:dprId/submit` | `POST` | `projects:dpr:submit` | Project Scope | Transitions `draft -> submitted`. Emits approval notification. |
| `/api/v1/projects/:id/dpr/:dprId/approve` | `POST` | `projects:dpr:approve`| Project Scope | Transitions `submitted -> approved`. Automatically updates WBS executed quantities. |
| `/api/v1/projects/:id/dpr/:dprId/reject` | `POST` | `projects:dpr:approve`| Project Scope | Transitions `submitted -> rejected` with mandatory rejection remarks. |
| `/api/v1/projects/:id/lookahead` | `GET` | `projects:view` | Project Scope | Returns 2-week and 4-week lookahead schedule with readiness blockers. |

---

### 3.4 Domain 07: BOQ & Digital Measurement Book (MB)

| Route | Method | Permission | Scope | Summary & State Transition |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/projects/:id/boq` | `GET` | `projects:view` | Project Scope | Returns Bill of Quantities item master, contract rates, executed quantities. |
| `/api/v1/projects/:id/boq` | `POST` | `commercial:manage` | Project Scope | Creates BOQ item line with rate analysis and WBS activity mapping. |
| `/api/v1/projects/:id/mb` | `GET` | `projects:view` | Project Scope | Lists Digital Measurement Book records with verification status. |
| `/api/v1/projects/:id/mb` | `POST` | `measurements:create`| Project Scope | Creates MB record ($L \times B \times D$, Area, Count) in `pending` status. |
| `/api/v1/projects/:id/mb/:mbId/verify` | `POST` | `measurements:verify`| Project Scope | Signs and transitions MB record: `pending -> verified`. Updates cumulative BOQ. |
| `/api/v1/projects/:id/mb/:mbId/reject` | `POST` | `measurements:verify`| Project Scope | Transitions `pending -> rejected` with measurement discrepancy note. |

---

### 3.5 Domain 08 & 09: Materials Procurement & Stores Inventory

| Route | Method | Permission | Scope | Summary & State Transition |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/materials` | `GET` | `materials:view` | Tenant | Lists catalogue materials, current aggregated stock, unit rates, health. |
| `/api/v1/materials` | `POST` | `materials:manage`| Tenant | Creates new material catalogue entry (category, unit, reorder level). |
| `/api/v1/stores` | `GET` | `materials:view` | Tenant / Project | Lists physical warehouse stores and site storage yards. |
| `/api/v1/stores/:storeId/balances` | `GET` | `materials:view` | Store Scope | Returns real-time bin-card balances for all materials in store. |
| `/api/v1/stores/:storeId/ledger` | `GET` | `materials:view` | Store Scope | Returns chronological immutable physical stock movements. |
| `/api/v1/materials/indents` | `GET` | `materials:view` | Project / Tenant | Lists material procurement indents. |
| `/api/v1/materials/indents` | `POST` | `materials:indent:create`| Project Scope | Creates indent in `draft` status. |
| `/api/v1/materials/indents/:id/submit` | `POST` | `materials:indent:submit`| Project Scope | Transitions `draft -> submitted`. |
| `/api/v1/materials/indents/:id/approve` | `POST` | `materials:indent:approve`| Project Scope | Transitions `submitted -> approved`. Authorizes PO generation. |
| `/api/v1/purchase-orders` | `GET` | `materials:view` | Tenant / Project | Lists purchase orders with delivery and financial status. |
| `/api/v1/purchase-orders` | `POST` | `materials:po:create` | Project Scope | Creates PO in `draft` status linked to approved indent and vendor. |
| `/api/v1/purchase-orders/:id/issue` | `POST` | `materials:po:approve` | Project Scope | Transitions `draft -> issued`. Emits vendor transmittal outbox event. |
| `/api/v1/grn` | `GET` | `materials:view` | Project / Store | Lists Goods Receipt Notes and 3-way match verification status. |
| `/api/v1/grn` | `POST` | `materials:grn:create` | Store Scope | Records GRN (`draft`) with challan, invoice ref, accepted & rejected quantities. |
| `/api/v1/grn/:id/verify` | `POST` | `materials:grn:verify` | Store Scope | **Atomic Transaction**: Transitions `draft -> verified`, updates `StockBalance`, writes `StockLedger` (+ receipt), updates PO `receivedQty`. |
| `/api/v1/stores/:id/issues` | `POST` | `materials:stock:issue` | Store Scope | **Atomic Transaction**: Verifies stock availability ($Current \ge Issue$), decrements `StockBalance`, appends `StockLedger` (- issue) against WBS activity. |
| `/api/v1/stores/transfers` | `POST` | `materials:stock:transfer`| Tenant / Store | Dispatches stock transfer (`in_transit`). Decrements source store stock balance. |
| `/api/v1/stores/transfers/:id/receive` | `POST` | `materials:stock:receive` | Destination Store | Confirms arrival (`received`). Increments destination store stock balance. |

---

### 3.6 Domain 10: Finance, Expenses, RA Billing & Payouts

| Route | Method | Permission | Scope | Summary & State Transition |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/expenses` | `GET` | `finance:view` | Project / Tenant | Lists petty cash expense records filtered by category, date, and status. |
| `/api/v1/expenses` | `POST` | `finance:expense:create`| Project Scope | Creates expense voucher in `draft` status. |
| `/api/v1/expenses/:id/submit` | `POST` | `finance:expense:submit`| Project Scope | Transitions `draft -> pending_approval`. Routes to approval engine. |
| `/api/v1/expenses/:id/approve` | `POST` | `finance:expense:approve`| Project Scope | Transitions `pending_approval -> approved`. |
| `/api/v1/contractor-ra-bills` | `GET` | `finance:view` | Project / Tenant | Lists subcontractor RA bills with retention and tax deductions. |
| `/api/v1/contractor-ra-bills` | `POST` | `finance:bill:create` | Project Scope | Creates RA bill in `draft` status linked to verified Measurement Book refs. |
| `/api/v1/contractor-ra-bills/:id/submit` | `POST` | `finance:bill:submit` | Project Scope | Transitions `draft -> submitted`. |
| `/api/v1/contractor-ra-bills/:id/verify` | `POST` | `finance:bill:verify` | Project Scope | Transitions `submitted -> verified` (Engineer quantity sign-off). |
| `/api/v1/contractor-ra-bills/:id/approve` | `POST` | `finance:bill:approve` | Project Scope | Transitions `verified -> approved -> payable`. |
| `/api/v1/client-claims` | `GET` | `finance:view` | Project Scope | Lists client billing claims, GST calculations, certified amounts. |
| `/api/v1/client-claims` | `POST` | `finance:claim:create`| Project Scope | Creates client claim in `draft` status. |
| `/api/v1/client-claims/:id/certify` | `POST` | `finance:claim:certify`| Project Scope | Transitions `submitted -> certified -> receivable`. |
| `/api/v1/payments/disburse` | `POST` | `finance:payment:disburse`| Tenant / Company | **Idempotent Mutation**: Disburses payment voucher (`pending -> paid`), updates payable balance. |
| `/api/v1/advances` | `POST` | `finance:advance:create`| Project Scope | Creates mobilization / supplier advance in `active` status. |

---

### 3.7 Domain 11 & 12: People, Attendance, Equipment & Fleet

| Route | Method | Permission | Scope | Summary & State Transition |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/employees` | `GET` | `people:view` | Tenant | Lists employee master directory, department, assigned site, status. |
| `/api/v1/employees` | `POST` | `people:manage` | Tenant | Registers new employee record (optional binding to system User). |
| `/api/v1/attendance` | `GET` | `people:view` | Project Scope | Returns daily muster logs, workforce counts, overtime hours. |
| `/api/v1/attendance` | `POST` | `people:attendance:create`| Project Scope | Records daily attendance roster with calculated wage impact. |
| `/api/v1/equipment` | `GET` | `equipment:view` | Tenant | Lists heavy machinery assets, operating status, fuel efficiency, next service. |
| `/api/v1/equipment` | `POST` | `equipment:manage` | Tenant | Registers new machinery asset (Owned / Rented, hour meter baseline). |
| `/api/v1/equipment/:id/fuel` | `POST` | `equipment:fuel:log` | Project Scope | Records fuel dispensing log (liters, rate, hour meter reading). |
| `/api/v1/equipment/:id/maintenance` | `POST` | `equipment:maintenance:create`| Project Scope | Creates maintenance ticket (`open -> in_progress -> completed`). |

---

### 3.8 Domain 13, 14 & 15: Quality, Safety & Documents

| Route | Method | Permission | Scope | Summary & State Transition |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/pour-cards` | `GET` | `quality:view` | Project Scope | Lists structural concrete pour cards and pre-pour inspection checklists. |
| `/api/v1/pour-cards` | `POST` | `quality:pour:create` | Project Scope | Creates pour card (`draft`) with grade of concrete and planned quantity. |
| `/api/v1/pour-cards/:id/approve` | `POST` | `quality:pour:approve`| Project Scope | Verifies 5-point checklist (shuttering, rebar, cover, MEP, cleaning) $\rightarrow$ `approved`. |
| `/api/v1/ncrs` | `GET` | `quality:view` | Project Scope | Lists Non-Conformance Reports by severity (`minor`, `major`, `critical`). |
| `/api/v1/ncrs` | `POST` | `quality:ncr:create` | Project Scope | Creates NCR in `open` status with assigned party and due date. |
| `/api/v1/ncrs/:id/close` | `POST` | `quality:ncr:verify` | Project Scope | Verifies CAPA plan and transitions `action_required -> closed`. |
| `/api/v1/safety/walkthroughs` | `POST` | `safety:audit:create` | Project Scope | Records safety walkthrough audit (PPE %, housekeeping score 1-5). |
| `/api/v1/safety/incidents` | `POST` | `safety:incident:create`| Project Scope | Logs safety incident (`near_miss`, `first_aid`, `lost_time`). Emits urgent alerts. |
| `/api/v1/drawings` | `GET` | `documents:view` | Project Scope | Lists GFC drawings with revision history and status (`GFC`, `superseded`). |
| `/api/v1/drawings/:id/revisions` | `POST` | `documents:manage` | Project Scope | Uploads new revision; marks previous revisions `isSuperseded = true`. |
| `/api/v1/rfis` | `GET` | `documents:view` | Project Scope | Lists technical RFIs by discipline and priority. |
| `/api/v1/rfis` | `POST` | `documents:rfi:create`| Project Scope | Raises technical RFI (`open`). |
| `/api/v1/rfis/:id/respond` | `POST` | `documents:rfi:respond`| Project Scope | Records engineering response and transitions `under_review -> answered`. |

---

### 3.9 Domain 16 & 17: Approvals, Alerts & Reports

| Route | Method | Permission | Scope | Summary & State Transition |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/approvals/rules` | `GET` | `settings:view` | Tenant | Lists configurable approval thresholds by module (PO, Expense, RA Bill). |
| `/api/v1/approvals/rules` | `POST` | `settings:manage` | Tenant | Configures stage-wise approval policy with segregation of duties rules. |
| `/api/v1/approvals/pending` | `GET` | `approvals:view` | User Scope | Lists pending approval tasks assigned to the current user's role. |
| `/api/v1/approvals/:id/decide` | `POST` | `approvals:decide` | User Scope | Records immutable decision (`APPROVED` / `REJECTED`) for assigned stage. |
| `/api/v1/alerts` | `GET` | `alerts:view` | Tenant / Project | Lists smart exception alerts (critical, attention) with impact amounts. |
| `/api/v1/alerts/:id/acknowledge` | `POST` | `alerts:manage` | Project Scope | Transitions alert `open -> acknowledged`. |
| `/api/v1/alerts/:id/resolve` | `POST` | `alerts:manage` | Project Scope | Transitions alert `acknowledged -> resolved` with remediation note. |
| `/api/v1/reports/executions` | `POST` | `reports:generate` | Tenant / Project | Queues asynchronous report generation (`QUEUED`). Returns execution ID. |
| `/api/v1/reports/executions/:id` | `GET` | `reports:view` | Execution Scope | Returns report processing status (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) and pre-signed download URL. |

---

## 4. Platform Owner Governance API Catalog (`owner.dezobuild.com`)

| Route | Method | Role Required | Summary & Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/owner/overview` | `GET` | `SUPER_ADMIN` | Returns platform-wide KPI metrics (total tenants, active MRR, health score). |
| `/api/v1/owner/tenants` | `GET` | `SUPER_ADMIN` | Lists all enterprise customer tenants, status, plan tier, project counts. |
| `/api/v1/owner/tenants` | `POST` | `SUPER_ADMIN` | Provisions a new enterprise customer tenant, root admin user, and initial plan. |
| `/api/v1/owner/tenants/:id/suspend` | `POST` | `SUPER_ADMIN` | Suspends delinquent tenant account (`status = SUSPENDED`). Revokes write access. |
| `/api/v1/owner/subscriptions` | `GET` | `SUPER_ADMIN` | Lists all active SaaS subscriptions, renewal schedules, and ARR. |
| `/api/v1/owner/entitlements/:tenantId` | `PATCH` | `SUPER_ADMIN` | Grants custom enterprise capacity overrides (e.g. custom project limits). |
| `/api/v1/owner/health` | `GET` | `SUPER_ADMIN` | Returns infrastructure health telemetry (database latency, queue backlogs). |
| `/api/v1/owner/audit` | `GET` | `SUPER_ADMIN` | Returns global platform governance audit logs and support access records. |

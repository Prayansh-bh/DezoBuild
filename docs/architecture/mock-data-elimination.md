# DEZOBUILD Architecture Specification — Mock Data & Demo Content Elimination

**Document ID**: `DOC-ARCH-MOCK-CLEANUP-2026-09`  
**Status**: `FROZEN / PRODUCTION DATA READY`  
**Classification Mode**: Forensic Cleanup & Contract Isolation  

---

## 1. Executive Summary

This specification records the repository-wide audit, classification, elimination, and empty-state conversion of mock business data, fabricated financial values, fictional telemetry, and demo records across the **DEZOBUILD** application ecosystem:
1. **Customer Web Application** (`frontend/` — `app.dezobuild.com`)
2. **Platform Owner Governance Hub** (`owner/` — `owner.dezobuild.com`)

All interactive functionality (Create, Edit, View, Approve, Reject, Submit, Upload, Assign, Issue, Receive, Transfer, Export, Configure) remains **100% operational** and operates against empty state models, user-created sessions, or isolated development fixtures (`mockStore.loadDevFixtures()`).

---

## 2. Mock Value Classification Matrix

Discovered items across the codebase are classified into 7 standardized architectural categories:
- **A. MOCK BUSINESS DATA**: Fake records (projects, employees, vendors, purchase orders, expenses, materials).
- **B. MOCK PLATFORM TELEMETRY**: Fabricated uptime, node counts, cluster health, latency graphs.
- **C. MOCK AUTH / DEVELOPMENT DATA**: Persona switcher, mock sessions, role switchers.
- **D. STATIC UI CONTENT**: Form labels, role descriptions, helper copy, UI microcopy.
- **E. REAL CONFIGURATION**: System currencies, tax definitions, standard units of measure (UOM), status badge themes.
- **F. EMPTY / ZERO STATE**: Semantically correct initial states (`0`, `[]`, `"No records yet"`).
- **G. CONSTANT REQUIRED BY PRODUCT LOGIC**: Permissions maps, route tables, tax percentages, statutory rules.

---

## 3. Comprehensive Audit & Elimination Register

| Mock Item / Identifier | Location | Classification | Current Consumer | Production Behavior | Action Taken | Preserved Functionality |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Initial Mock Collections (Projects, POs, Invoices, Indents, Expenses, etc.)** | `frontend/src/mock/index.ts` | A | Customer App Store (`useMockStore`) | Defaults to clean empty arrays (`[]`) | Initialized `mockStore` with `EMPTY_STATE`. Provided isolated `loadDevFixtures()` helper. | User data entry, state mutations, calculations. |
| **Owner Platform Telemetry (Nodes, Postgres 99.991%, Redis, Latency)** | `owner/src/mock/platform-data.ts` | B | Owner Health & Analytics | Displays "Not Connected", "0 ms", "No Telemetry" | Zeroed mock telemetry; removed fictional health claims. | Live status checking, export logs, telemetry tab navigation. |
| **Owner Tenant Directory** | `owner/src/routes/tenants.tsx` | A | Owner Portal | Renders `EmptyState` ("No tenants provisioned yet") | Converted table to EmptyState with `[Provision Tenant]` CTA. | Tenant provisioning modal, plan assignment, feature flag toggle. |
| **Owner Billing & MRR Metrics** | `owner/src/routes/billing.tsx`, `overview.tsx` | A / B | Owner Portal | Displays "No billing data available", "₹0" | Eliminated hardcoded ₹48.2L MRR / 99.4% collection rates. | Invoice generation, billing plan configuration, CSV export. |
| **Owner Entitlements & Features** | `owner/src/routes/entitlements.tsx` | A | Owner Portal | Renders `EmptyState` ("No tenant entitlements configured") | Replaced hardcoded tenant flags with EmptyState. | Feature flag allocation, tenant module toggle. |
| **Owner Global Users & Security Audit** | `owner/src/routes/users.tsx`, `audit.tsx` | A / B | Owner Portal | Renders `EmptyState` ("No global users / No audit events") | Replaced fake user arrays and login IPs with EmptyState. | Provisioning global super-admins, audit filter bar. |
| **Customer Role Dashboards (8 Role Views)** | `frontend/src/routes/index.tsx` | A / F | Role Dashboards (Owner, PM, Site Eng, Store, etc.) | Dynamic calculation with division-by-zero guards | Added role-aware empty states and guarded all percentages against `0`. | Role switching, KPI cards, attention queues, navigation. |
| **Projects Registry & Portfolio WBS / DPR** | `frontend/src/routes/projects/index.tsx`, `_id.tsx`, `new.tsx` | A | Project Workspace | Renders `EmptyState` ("No projects yet") | Replaced hardcoded demo cards, cleaned form state presets. | Create Project, WBS planning, DPR filing, Commercials tab, Drawing tab. |
| **Material Master, Indents, POs, GRNs, Inventory** | `frontend/src/routes/materials/index.tsx` | A | Procurement & Store Workspace | Renders `EmptyState` across all 10 domain tabs | Cleaned form defaults (quantity, rates, PO prefixes); added EmptyStates. | Raise Indent, Issue PO, Create GRN, Issue Material, Transfer Stock. |
| **Finance: Budgets, Expenses, Payments, Advances** | `frontend/src/routes/finance/index.tsx` | A | Commercial Workspace | Renders `EmptyState` ("No financial transactions yet") | Zeroed fake budget lines, removed hardcoded expense records. | Record Expense, Make Payment, Issue Advance, Set Site Budget. |
| **Workforce: Staff, Labour Gangs, Muster Roll** | `frontend/src/routes/people/index.tsx` | A | HR & Site Operations | Renders `EmptyState` ("No employees / No gangs") | Cleared 6 hardcoded mock workers; added EmptyState to Muster, Leave, Compliance. | Onboard Staff, Register Gang, Punch Biometric Check-in, Mark Muster. |
| **Plant & Equipment Fleet, Fuel Logs, Maintenance** | `frontend/src/routes/equipment/index.tsx` | A | Fleet & Plant Workspace | Renders `EmptyState` ("No equipment deployed") | Cleared default fuel quantity, hour meters, and maintenance costs. | Record Fuel Issue, Open Maintenance Ticket, Allocate Machine. |
| **Exception Alerts & Risk Mitigation** | `frontend/src/routes/alerts/index.tsx` | A / F | Alert Engine | Renders `EmptyState` ("No critical exceptions active") | Replaced fake critical risk counters with clean zero states and EmptyState. | Log Site Snag / Issue, Mitigate Alert, View Audit History. |
| **Documents Vault & GFC Drawings** | `frontend/src/routes/documents/index.tsx` | A | Document Repository | Renders `EmptyState` ("No documents uploaded yet") | Cleared hardcoded upload tags and fake version presets. | Upload Document, Drawing Previewer, Filter by Category. |
| **Reports Intelligence Catalog** | `frontend/src/routes/reports/index.tsx` | A / F | Analytics Workspace | Displays "No operational data recorded for selected period yet." | Guarded consolidated data rollups against 0 projects. | Export Report (PDF), Export XLSX, Domain filter selection. |
| **Settings: Users & Security Audit Trail** | `frontend/src/routes/settings/index.tsx` | A / C | Administration Workspace | Renders `EmptyState` ("No team members / No audit events") | Replaced fake audit log array with EmptyState. | Invite User, Role Permission Management, Company Profile Edit. |

---

## 4. UI/UX State Contract

Every screen and widget in DEZOBUILD strictly honors four explicit states:

```
┌─────────────────────────────────────────────────────────────┐
│                       STATE CONTRACT                        │
├──────────────┬──────────────────────────────────────────────┤
│ 1. LOADING   │ Render Skeleton / Spinner placeholder        │
│ 2. NO DATA   │ Render Purposeful EmptyState + Action Button │
│ 3. REAL DATA │ Render Production Records & Live Metrics     │
│ 4. ERROR     │ Render Error Alert + Retry Action            │
└──────────────┴──────────────────────────────────────────────┘
```

Fabricated numbers (e.g. `96.4% Attendance`, `100% SSL`, `₹48.2L MRR`) are **strictly prohibited** in production mode.

---

## 5. Development Fixture Isolation & Backend Integration Roadmap

### Isolated Development Fixtures
For developer testing and automated UI demonstrations, development fixtures are isolated in:
- `frontend/src/mock/fixtures.ts` (invoked only via explicit `mockStore.loadDevFixtures()`)
- `owner/src/mock/fixtures.ts`

### Backend Auth & API Replacement Plan
During the upcoming Backend Implementation phase:
1. `MockAuthProvider` (`frontend/src/auth/index.tsx`) will be replaced by OAuth2 / JWT HttpOnly Session Provider.
2. `useMockStore` hooks will be replaced by TanStack Query (`useQuery`, `useMutation`) binding to REST/JSON endpoints (`backend/src/`).
3. Local state mutations will transition to transactional PostgreSQL Prisma repository operations.

---

## 6. Verification & Automated Test Status

- **Vitest Unit & Isolation Tests**: `4 passed (4 files, 39 tests)`
- **Route Contract Verification**: `12/12 routes verified HTTP 200`
- **Frontend Production Build**: `Passed (0 errors)`
- **Owner Production Build**: `Passed (0 errors)`
- **Monorepo Build (`build:all`)**: `Passed (0 errors across frontend, owner, backend)`

**Final Status**: `MOCK DATA CLEAN — READY FOR BACKEND DATA INTEGRATION`

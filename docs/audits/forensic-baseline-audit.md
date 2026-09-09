# DEZOBUILD — Forensic Baseline Audit & Repository Inventory

## 1. Audit Metadata

- **Date**: September 2026
- **Architecture**: Single Direct-Access Construction Operating System
- **State Management**: Reactive in-memory singleton store (`useSyncExternalStore`)
- **Routing**: TanStack Router / TanStack Start file-based routing
- **Styling**: Tailwind CSS v4 with OKLCH theme variables

---

## 2. Inventory of Existing Routes & Contracts

| Route Path      | Module Name                | Primary Entities Managed                                | Status   |
| :-------------- | :------------------------- | :------------------------------------------------------ | :------- |
| `/`             | Operational Command Center | KPI Stats, Variance Chart, Activity Feed, Smart Alerts  | Verified |
| `/projects`     | Project Portfolio          | Project Cards/Table, Cost Burn, Timeline, Risk Level    | Verified |
| `/projects/new` | Create Project Workflow    | 4-Step Stepper: Basic Info, Scope, Financials, Schedule | Verified |
| `/projects/:id` | Detailed Project Workspace | Overview, WBS Gantt, DPR Register, Cost Ledger, Photos  | Verified |
| `/materials`    | Inventory & Procurement    | Master Stock, Indents, POs, GRN 3-Way Match, Issues     | Verified |
| `/finance`      | Financial Governance       | Expenses, Cash Flow, Payments, Advances, Ledgers        | Verified |
| `/people`       | Workforce & Muster         | Employee Directory, Subcontractor Gangs, Muster         | Verified |
| `/equipment`    | Plant & Machinery          | Asset Telematics, Fuel Logs, Preventive Maintenance     | Verified |
| `/alerts`       | Smart Exception Engine     | Severity Filters, Overrun Alerts, Acknowledgment        | Verified |
| `/reports`      | Analytics & Exports        | Cost Burn, DPR Summary, Scheduled Reports               | Verified |
| `/documents`    | GFC Drawings & Compliance  | Drawing Register, Safety Audits, NOC Approvals          | Verified |
| `/settings`     | System Configuration       | Corporate Profile, GSTIN, Role Permissions Matrix       | Verified |

---

## 3. UI Primitive Catalog (46 Primitives)

- Radix / Shadcn primitives: `accordion`, `alert-dialog`, `alert`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input-otp`, `input`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toggle-group`, `toggle`, `tooltip`.

---

## 4. Shared Domain Components (8 Components)

- `data-table.tsx`
- `document-viewer.tsx`
- `empty-state.tsx`
- `filter-bar.tsx`
- `page-header.tsx`
- `photo-gallery.tsx`
- `stat-grid.tsx`
- `status-badge.tsx`

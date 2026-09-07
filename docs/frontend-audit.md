# DEZOBUILD Frontend & Architecture Audit

**Date:** September 7, 2026  
**Project:** DEZOBUILD Construction Management SaaS  
**Framework:** React 19 + TanStack Start (SSR/Vite) + TanStack Router + Tailwind CSS v4 + Radix UI / shadcn/ui  

---

## 1. Current Architecture Overview

- **Core Stack:** 
  - **Framework:** Vite 8.1.5 + TanStack Start (`@tanstack/react-start` 1.168.32) + `@tanstack/react-router` 1.170.18
  - **UI Library & Components:** React 19, Tailwind CSS v4 (`@tailwindcss/vite`), Radix UI primitives, Lucide React icons, Recharts, Sonner.
  - **Data Layer:** `@tanstack/react-query` v5 configured in `src/router.tsx` and `src/routes/__root.tsx`.
  - **Server/SSR:** Nitro server runner integrated via `@lovable.dev/vite-tanstack-config` with custom SSR error handling in `src/server.ts` and `src/start.ts`.
  - **Design Tokens:** Defined in `src/styles.css` using OKLCH color space for high gamut clarity (Brand Safety Amber/Orange, Charcoal Sidebar, Muted backgrounds, Semantic status styles for `critical`, `attention`, `healthy`).
- **Baseline Verification:**
  - `npm run build`: Succeeded with Nitro preset `cloudflare-module` and client/SSR chunk outputs.
  - `npx tsc --noEmit`: Identified isolated route-typing error in `src/components/app-shell.tsx:241` (`Type '"/alerts"' is not assignable to type '"/" | "." | ".."`) caused by missing route definitions in `src/routes/` awaiting Phase 1-10 route file generation.

---

## 2. Existing Routes & Navigation

| Route | Status | Description |
|---|---|---|
| `/` | Completed Prototype | Owner Dashboard with sample metrics, risk alert cards, financial overview, and site pulse summary. (Currently inlines layout). |
| `/projects` | Missing | Referenced in navigation and sidebar, currently not implemented. |
| `/projects/$id` | Missing | Critical Project 360° detail view with WBS, Progress, DPR, Materials, Finance, Labour, Equipment. |
| `/projects/new` | Missing | Multi-step progressive project creation workflow. |
| `/materials` | Missing | Material Master, Indents, POs, GRN, Inventory, Issues, Returns, Stock Transfers, Consumption. |
| `/finance` | Missing | Expenses, Payments, Advances, Vendors, Contractors, Budget vs Actual variance. |
| `/people` | Missing | Employees, Labour contracts, Mobile-first Attendance marking, Allocations, Advances. |
| `/equipment` | Missing | Fleet overview (Running, Idle, Breakdown, Maintenance), Logbook, Fuel tracking. |
| `/alerts` | Missing | Actionable smart alert centre with financial/operational impact and drill-downs. |
| `/reports` | Missing | Unified reporting suite (Progress, Cost, Material, Labour, Equipment, Financial, DPR) with export preview. |
| `/documents` | Missing | Document manager (Drawings, Contracts, Invoices, Compliance, Site Photos) with project filtering & preview. |
| `/settings` | Missing | Company profile, Users, Roles & Permissions matrix, Subscription usage, Preferences. |

---

## 3. Reusable Components & UI System

### Existing Reusable Components:
- **`src/components/app-shell.tsx`**: Complete responsive layout shell with desktop sidebar, mobile drawer, mobile bottom bar, header with workspace breadcrumb, search bar, notification button, and quick-add launcher.
- **`src/components/ui/*`**: 46 pre-built Radix UI + Tailwind component wrappers (Accordion, Alert, Badge, Button, Calendar, Card, Dialog, Drawer, Dropdown, Form, Input, Progress, Select, Sheet, Table, Tabs, etc.).

### Components Needed for Construction SaaS UX:
- **PageHeader & MetricCard**: Standardized page headers with action slots, breadcrumbs, period selectors, and KPI tiles.
- **Construction Status System**: Visual badges & indicators for Project Health (`Critical`, `Attention`, `Healthy`), Work Order & Workflow states (`Draft`, `Pending Approval`, `Approved`, `Rejected`, `Active`, `Completed`).
- **Connected Quick Add Modals**: Fast 2-step modals for Site Engineers & Managers (Expense, Material Receipt/GRN, Material Issue, Progress Update, Attendance, DPR).
- **Interactive Data Table**: Filterable, searchable, sortable, paginated tables with empty and loading states.
- **WBS / Gantt / Milestone Tree**: Hierarchical work breakdown structure for construction activities (Planned vs Actual Qty, Cost, Dates).
- **Mobile Field Cards**: Big-target, touch-friendly summary cards for site engineers in low-connectivity conditions.

---

## 4. Existing Mock Data (`src/lib/dezo-data.ts`)

- Contains basic flat arrays for 4 projects, 6 material items, 4 payments, 5 people, 4 equipment items, 7 alerts, 5 reports, 5 documents.
- **Inconsistency / Gap**: Data is currently static and partially disconnected. For instance, the financial totals on the dashboard do not dynamically derive from or tie into the individual project budgets, expenses, and payments.
- **Required Solution**: Create a dedicated `src/mock/` data service that holds a connected, single source of truth for Dezo Infra Pvt. Ltd. (8 active projects with detailed WBS, material movements, labour attendance, expenses, payments, equipment logs, alerts, and documents).

---

## 5. Identified Risks, Inconsistencies & Fixes

1. **Routing Typecheck**:
   - `src/components/app-shell.tsx` line 241 hardcoded `<Link to="/alerts">`, which causes `npx tsc` to fail until route files are registered in `src/routes/` and TanStack Router auto-generates `routeTree.gen.ts`.
2. **Dashboard Layout Duplication**:
   - `src/routes/index.tsx` duplicate-implemented its own AppShell copy with local state instead of using `<AppShell>`.
   - **Fix**: Standardize `src/routes/index.tsx` on `<AppShell crumb="Owner dashboard">` while preserving the exact high-quality visual layout.
3. **Construction Relationship Integrity**:
   - All modules must show connected data (e.g. Project Orion Heights -> Activity Foundation Concrete -> Material OPC 53 Cement -> Vendor Shreeji Ready Mix -> Payment Overdue -> Critical Alert).

---

## 6. Implementation Sequence

Following the master specification:
1. **Design System & Mock Architecture**: Centralize connected mock store (`src/mock/*`), standard shared components (`PageHeader`, `DataTable`, `StatusBadge`, `QuickAddModal`).
2. **Projects Module**: `/projects`, `/projects/$id`, `/projects/new` (with WBS, activities, progress, timeline).
3. **Daily Progress / DPR Module**: Interactive mobile-friendly DPR workflow with photos, manpower, equipment, materials.
4. **Materials Module**: `/materials` (Master, Indents, POs, GRN, Inventory, Issue, Return, Transfer, Consumption).
5. **Finance Module**: `/finance` (Expenses, Payments, Advances, Vendors, Contractors, Budget vs Actual).
6. **People & Labour Module**: `/people` (Employees, Labour contractors, Mobile Attendance sheet, Allocations).
7. **Equipment Module**: `/equipment` (Fleet master, Running/Idle/Breakdown tracking, Fuel & Maintenance log).
8. **Smart Alerts Workspace**: `/alerts` (Impact analysis, drill-downs, Acknowledge/Resolve actions).
9. **Reports Workspace**: `/reports` (Multi-report viewer with filtering and PDF/XLSX export mock).
10. **Documents Workspace**: `/documents` (Categories, drawings, contracts, upload and preview dialogs).
11. **Settings Workspace**: `/settings` (Company, Users, Roles matrix, Subscriptions, Preferences).
12. **Global Polish, Typecheck, Accessibility & Report Generation**.

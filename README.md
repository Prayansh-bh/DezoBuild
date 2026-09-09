# DEZOBUILD — Construction Operating System

## Monorepo Topology

```text
Dezobuild/
├── frontend/      # Customer / Tenant Operations App (TanStack Start + React 19 + Tailwind v4)
├── owner/         # Platform Owner Governance Control Hub (Vite + React 19 + Tailwind v4)
├── backend/       # Backend service layer & domain contracts (TypeScript + Prisma Schema)
├── package.json   # Root workspace orchestration
└── README.md
```

> **Single Portal Design Principle**:
> DEZOBUILD operates as a single, direct-access construction operations command center. There is no multi-portal fragmentation (no separate owner/admin/employee portals) and no authentication gate blocking immediate operational access.

---

## Operational Modules & Route Contracts

DEZOBUILD integrates all 10 core construction workflows under a unified app shell:

1. **Operational Command Center** (`/`): Executive KPI cards, project variance metrics, quick actions, real-time activity feed, and smart exception alerts.
2. **Projects Portfolio** (`/projects`, `/projects/new`, `/projects/$id`): Project register, WBS work breakdown structure, daily DPR submissions, site progress gallery, and cost ledger.
3. **Inventory & Materials** (`/materials`): Stock master catalogue, site procurement indents, purchase orders, 3-way match GRN verification, and store issues.
4. **Finance & Commercial** (`/finance`): Cost control, petty cash expense approvals, contractor payouts, vendor advances, and milestone retention ledgers.
5. **Workforce & Muster** (`/people`): Staff directory, trade subcontractor rosters, and daily biometric/muster logs.
6. **Fleet & Equipment** (`/equipment`): Heavy machinery inventory, telematics, runtime tracking, fuel consumption logs, and preventive maintenance.
7. **Smart Exception Alerts** (`/alerts`): Automatic anomaly detection across schedule slip, budget overrun, and safety violations with resolution workflows.
8. **Reports & Analytics** (`/reports`): Executive summaries, DPR archives, cash burn curves, and export generators.
9. **Documents & Compliance** (`/documents`): GFC drawing register, structural calculations, borehole test reports, and statutory NOCs.
10. **System Settings** (`/settings`): Corporate profile, GSTIN/CIN masters, subscription tier usage, and granular RBAC permission matrix.

---

## Development & Build Commands

### Monorepo Root (Default Workflow)

```bash
# Start development server (runs frontend on port 3000)
npm run dev

# Run full typecheck & build
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

### Frontend Workspace

```bash
cd frontend
npm run dev
npm run build
```

### Backend Workspace

```bash
cd backend
npm run build
```

# DEZOBUILD — Backend Architecture & Service Layer

## Overview

This directory contains the production backend architecture, domain modules, and service layer contracts for **DEZOBUILD** Construction Operating System.

> **Important Architectural Note**:
> The frontend application currently operates with a high-fidelity local state store (`frontend/src/mock/` / `frontend/src/stores/`) supporting the complete single direct-access construction portal.
> The backend module contracts in this directory define the domain boundaries, data transfer schemas (DTOs), and service interfaces for eventual microservices or monolith persistence integration without disrupting the live frontend client.

---

## Domain Modules

The backend organizes domain logic strictly across the 10 Construction OS verticals:

1. **Projects**: WBS, milestones, site telemetry, project masters.
2. **Materials**: Procurement indents, PO lifecycle, 3-way match GRN, issues, stock transfers, inventory ledgers.
3. **Finance**: Budgets, progressive contractor billing, milestone payouts, petty expenses, advances.
4. **People**: Workforce rosters, subcontractor gangs, biometric attendance logs, wage calculation.
5. **Equipment**: Asset registry, telematics, runtime logs, fuel consumption, preventive maintenance schedules.
6. **Alerts**: Smart exception engine, cost overrun warnings, delayed milestones, stockout alerts.
7. **Reports**: Operational analytics, project variance, cash burn rates, export services.
8. **Documents**: GFC drawings, safety audits, geotechnical reports, statutory compliance artifacts.
9. **Settings**: Enterprise configuration, GSTIN/PAN masters, RBAC permission profiles.

---

## Directory Layout

```text
backend/
├── src/
│   ├── config/          # Environment and application configuration
│   ├── common/          # Common guards, filters, interceptors, and response wrappers
│   ├── database/        # Database schema definitions and migration contracts
│   ├── modules/         # Domain modules corresponding to Construction OS domains
│   │   ├── projects/
│   │   ├── materials/
│   │   ├── finance/
│   │   ├── people/
│   │   ├── equipment/
│   │   ├── alerts/
│   │   ├── reports/
│   │   ├── documents/
│   │   └── settings/
│   └── main.ts          # Server bootstrap entry point
├── package.json
└── tsconfig.json
```

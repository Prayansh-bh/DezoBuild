# DEZOBUILD — Authoritative Role Navigation Matrix

## 1. Scope & Matrix Overview

This document specifies the authoritative primary navigation items projected for all **10 canonical roles** across the DEZOBUILD platform:
- **1 Platform Role**: `SUPER_ADMIN` (on `owner.dezobuild.com`).
- **9 Customer Roles**: `COMPANY_OWNER`, `COMPANY_ADMIN`, `PROJECT_MANAGER`, `SITE_ENGINEER`, `PROCUREMENT_STORE`, `ACCOUNTANT`, `HR`, `EMPLOYEE`, `VIEWER` (on `app.dezobuild.com`).

---

## 2. Platform Owner Navigation (`owner.dezobuild.com`)

| # | Navigation Item | Route | Purpose |
| :--- | :--- | :--- | :--- |
| 1 | **Platform Overview** | `/` | Executive SaaS pulse, MRR, tenant counts, system health |
| 2 | **Companies & Tenants** | `/tenants` | Tenant directory, provisioning, suspension, seat utilization |
| 3 | **Subscriptions & Plans**| `/subscriptions`| SaaS subscription tiers, pricing engines, add-ons |
| 4 | **Billing & Invoices** | `/billing` | Platform payment settlements, revenue collection, dunning |
| 5 | **Users & Seats** | `/users` | Global seat allocations, license limits, security 2FA compliance |
| 6 | **Feature Entitlements**| `/entitlements` | Modular feature flags per tenant (AI, BIM, ERP sync) |
| 7 | **Platform Analytics** | `/analytics` | System-wide usage trends, storage growth, request volumes |
| 8 | **System Health** | `/health` | API latency, database pool capacity, background workers |
| 9 | **Audit Logs** | `/audit` | Platform security logs, admin actions, impersonation logs |
| 10 | **Support & Operations**| `/support` | Tenant support tickets, data export requests, SLAs |
| 11 | **Platform Settings** | `/settings` | Global SMTP, webhook integrations, system constants |

---

## 3. Customer Portal Navigation Projections (`app.dezobuild.com`)

### 3.1 `COMPANY_OWNER` (10 items)
1. **Executive Overview** (`/`) — High-level portfolio KPIs, financial health, blocker alerts
2. **Projects** (`/projects`) — Complete project portfolio 360°
3. **Procurement & Store** (`/materials`) — Supply chain, requisitions, POs, inventory
4. **Finance & Commercial** (`/finance`) — Commercial books, payables, receivables, cash flow
5. **People & HR** (`/people`) — Staff directory, contractor gangs, muster, payroll
6. **Plant & Equipment** (`/equipment`) — Heavy machinery fleet, maintenance, fuel
7. **Issues & Alerts** (`/alerts`) — Risk matrix, critical blockers, SLA escalations
8. **Analytics & Reports** (`/reports`) — Executive portfolio analytics, P&L, digests
9. **Documents & Drawings** (`/documents`) — GFC vault, legal contracts, statutory NOCs
10. **Administration** (`/settings`) — Company legal entity, user management, branch setup

### 3.2 `COMPANY_ADMIN` (10 items)
1. **Executive Overview** (`/`) — Organization administration & governance dashboard
2. **Projects** (`/projects`) — Project portfolio oversight
3. **Procurement & Store** (`/materials`) — Material catalogs, store master data
4. **Finance & Commercial** (`/finance`) — Commercial baseline & vendor onboarding
5. **People & HR** (`/people`) — Workforce directory & attendance policies
6. **Plant & Equipment** (`/equipment`) — Asset register & machinery compliance
7. **Issues & Alerts** (`/alerts`) — Organizational risks & audit alerts
8. **Analytics & Reports** (`/reports`) — Operational reports & audit exports
9. **Documents & Drawings** (`/documents`) — Corporate document vault & categories
10. **Administration** (`/settings`) — User directory, role assignment, system settings

### 3.3 `PROJECT_MANAGER` (9 items)
1. **Project Overview** (`/`) — Project operations command center, schedule milestone health
2. **Projects** (`/projects`) — WBS scheduling, Gantt, DPR review/approval, drawings
3. **Procurement & Store** (`/materials`) — Material indent approvals, PO tracking
4. **Finance & Commercial** (`/finance`) — Project budget baselines, incurred costs, variance
5. **People & HR** (`/people`) — Site labour allocation, contractor gang deployment
6. **Plant & Equipment** (`/equipment`) — Machinery mobilization, equipment logs
7. **Issues & Alerts** (`/alerts`) — Schedule delays, material shortages, safety incidents
8. **Analytics & Reports** (`/reports`) — S-curve progress, cost variance, DPR digests
9. **Documents & Drawings** (`/documents`) — Architectural, structural, MEP drawings

### 3.4 `SITE_ENGINEER` (7 items)
1. **Site Overview** (`/`) — Field execution command center, today's targets, weather
2. **Projects** (`/projects`) — Daily progress logs (DPR), WBS physical progress tracking
3. **Procurement & Store** (`/materials`) — Site requisitions, GRN gate receipt inspections
4. **People & HR** (`/people`) — Daily site labour muster, contractor worker counts
5. **Plant & Equipment** (`/equipment`) — Machinery running hours, diesel logs, breakdown alerts
6. **Issues & Alerts** (`/alerts`) — Site defect logs, safety hazards, execution blockers
7. **Documents & Drawings** (`/documents`) — Current GFC working drawings & site transmittals

### 3.5 `PROCUREMENT_STORE` (6 items)
1. **Store Overview** (`/`) — Supply chain command center, pending POs, low stock alerts
2. **Projects** (`/projects`) — Project-level material requirement schedules
3. **Procurement & Store** (`/materials`) — Indents, RFQs, POs, GRN verification, store inventory
4. **Issues & Alerts** (`/alerts`) — Stockout warnings, transit delay alerts
5. **Analytics & Reports** (`/reports`) — Material consumption, stock turnover, vendor ratings
6. **Documents & Drawings** (`/documents`) — Vendor contracts, PO documents, warranty cards

### 3.6 `ACCOUNTANT` (7 items)
1. **Finance Overview** (`/`) — Financial command center, cash flow, overdue payables
2. **Finance & Commercial** (`/finance`) — Expense vouchers, vendor bills, client RA bills, advances
3. **Projects** (`/projects`) — Project cost baselines, committed costs, billings
4. **Procurement & Store** (`/materials`) — PO committed values, 3-way invoice matching
5. **Issues & Alerts** (`/alerts`) — Overdue payments, unbilled milestones, budget overruns
6. **Analytics & Reports** (`/reports`) — Cash flow forecast, P&L, balance sheets, tax reports
7. **Documents & Drawings** (`/documents`) — Tax invoices, bank statements, client certificates

### 3.7 `HR` (6 items)
1. **HR Overview** (`/`) — Workforce command center, headcount, daily attendance %
2. **People & HR** (`/people`) — Staff directory, biometric muster, contractor gangs, payroll
3. **Projects** (`/projects`) — Site manpower deployment schedules
4. **Issues & Alerts** (`/alerts`) — Labour shortages, compliance breaches, expiring contracts
5. **Analytics & Reports** (`/reports`) — Headcount trends, overtime analysis, wage distribution
6. **Documents & Drawings** (`/documents`) — Staff contracts, ID verifications, labour licenses

### 3.8 `EMPLOYEE` (4 items)
1. **My Workspace** (`/`) — Personal self-service dashboard, my assigned tasks, clock-in card
2. **My Tasks** (`/projects`) — My scheduled work assignments & status updates
3. **My Attendance** (`/people`) — My monthly punch history, shift logs, leave balance
4. **My Documents** (`/documents`) — My employment contracts, payslips, safety handbooks

### 3.9 `VIEWER` (4 items)
1. **Read-Only Overview** (`/`) — Portfolio executive summary (read-only)
2. **Projects** (`/projects`) — Read-only project health, WBS, and milestones
3. **Analytics & Reports** (`/reports`) — Read-only analytics & executive digests
4. **Documents & Drawings** (`/documents`) — Read-only drawing vault & document viewer

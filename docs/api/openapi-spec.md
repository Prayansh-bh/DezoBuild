# DEZOBUILD — REST API & Endpoint Contracts

## Overview

This document outlines the API route contracts corresponding to the 10 operational modules of the **DEZOBUILD** Construction Operating System.

---

## 1. Projects API

- `GET /api/v1/projects` — Retrieve list of all projects with financial and milestone summaries.
- `POST /api/v1/projects` — Create a new project.
- `GET /api/v1/projects/:id` — Retrieve detailed project view including WBS hierarchy, DPR logs, and cost burn.
- `PATCH /api/v1/projects/:id` — Update project metadata, budget, or timelines.
- `GET /api/v1/projects/:id/wbs` — Retrieve WBS activity work breakdown hierarchy.
- `POST /api/v1/projects/:id/wbs` — Add WBS task activity.
- `GET /api/v1/projects/:id/dpr` — Retrieve DPR historical logs for the project.
- `POST /api/v1/projects/:id/dpr` — Submit daily progress report (DPR).

---

## 2. Materials & Procurement API

- `GET /api/v1/materials` — Retrieve master stock inventory with stock levels and reorder alerts.
- `GET /api/v1/materials/indents` — Retrieve site procurement indents.
- `POST /api/v1/materials/indents` — Create site material requisition indent.
- `GET /api/v1/materials/purchase-orders` — Retrieve purchase orders and lifecycle status.
- `POST /api/v1/materials/purchase-orders` — Issue purchase order to vendor.
- `GET /api/v1/materials/grn` — Retrieve Goods Received Notes (GRN).
- `POST /api/v1/materials/grn` — Record 3-way match gate GRN entry.
- `POST /api/v1/materials/issues` — Issue material quantities to specific WBS activity.
- `POST /api/v1/materials/transfers` — Initiate inter-site material stock transfer.

---

## 3. Finance & Commercial API

- `GET /api/v1/finance/expenses` — Retrieve project expense logs.
- `POST /api/v1/finance/expenses` — Record site petty cash or invoice expense.
- `GET /api/v1/finance/payments` — Retrieve payment vouchers and disbursements.
- `POST /api/v1/finance/payments` — Create payment voucher disbursement.
- `GET /api/v1/finance/advances` — Retrieve contractor and vendor advances.
- `GET /api/v1/finance/contractors` — Retrieve contractor accounts and retention balances.
- `GET /api/v1/finance/vendors` — Retrieve vendor accounts and payment schedules.

---

## 4. People & Workforce API

- `GET /api/v1/people/employees` — Retrieve full staff employee directory.
- `POST /api/v1/people/employees` — Add employee record.
- `GET /api/v1/people/contractors` — Retrieve labour contractor gangs.
- `GET /api/v1/people/attendance` — Retrieve daily muster attendance logs.
- `POST /api/v1/people/attendance` — Log site biometric / manual attendance.

---

## 5. Equipment & Fleet API

- `GET /api/v1/equipment` — Retrieve heavy plant and machinery asset inventory.
- `POST /api/v1/equipment/fuel` — Log daily fuel issue and run hours.
- `POST /api/v1/equipment/maintenance` — Record preventive/breakdown maintenance ticket.

---

## 6. Smart Alerts API

- `GET /api/v1/alerts` — Retrieve active and historical exception alerts.
- `PATCH /api/v1/alerts/:id/acknowledge` — Acknowledge alert by site team.
- `PATCH /api/v1/alerts/:id/resolve` — Mark alert as resolved with verification notes.

---

## 7. Reports API

- `GET /api/v1/reports` — List available scheduled and executive reports.
- `POST /api/v1/reports/generate` — Generate on-demand variance / progress report.

---

## 8. Documents API

- `GET /api/v1/documents` — Search and filter GFC drawings, contracts, and NOCs.
- `POST /api/v1/documents/upload` — Upload new document version with tagging.

---

## 9. Settings API

- `GET /api/v1/settings/company` — Retrieve company corporate profile, GSTIN, and subscription quotas.
- `PATCH /api/v1/settings/company` — Update organization settings.
- `GET /api/v1/settings/permissions` — Retrieve RBAC permission matrix.

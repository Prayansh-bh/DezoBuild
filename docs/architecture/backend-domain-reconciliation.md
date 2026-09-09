# DEZOBUILD — Frontend to Backend Domain Reconciliation

**Phase**: Backend Architecture Definition  
**Mode**: Forensic Reconciliation & Contract Freezing  
**Status**: Authoritative Blueprint (Pre-Implementation Gate)  

---

## 1. Forensic Feature Reconciliation Table

Every visual component, actionable workflow, and data view in the frozen DEZOBUILD frontend is mapped directly to its target backend entity, API route, database table, scope requirements, and security permissions.

```text
LEGEND:
• Tenant Scope: Required company isolation boundary (company_id)
• Project Scope: Required project isolation boundary (project_id)
• Site Scope: Required physical site isolation boundary (site_id)
• Preserved?: Strict confirmation that 100% of frontend capability is retained
```

| Frontend Domain | Frontend Feature | Frontend Action | Target Backend Entity | Backend REST API | Database Concept | Tenant Scope | Project Scope | Site Scope | Required Permission | Workflow State Machine | Preserved? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Executive** | Role Command Center | View active portfolio & work queue | `Project`, `Dpr`, `SmartAlert` | `GET /api/v1/dashboard/summary` | Multi-table aggregated SQL query | YES | Role-Scoped | Optional | `dashboard:view` | None (Read) | **YES** |
| **Executive** | Role Command Center | Switch active role persona | `UserRole`, `Role` | `POST /api/v1/auth/switch-role` | Session role update & token exchange | YES | None | None | None (Self) | Active Session | **YES** |
| **Projects** | Portfolio Overview | View project list & KPI cards | `Project` | `GET /api/v1/projects` | `projects` table (filtered by tenant/user) | YES | Filtered | Optional | `projects:view` | Project lifecycle | **YES** |
| **Projects** | Create Project Wizard | 7-step project creation wizard | `Project`, `ProjectSite`, `ProjectMilestone` | `POST /api/v1/projects` | `projects` + `project_sites` + `milestones` | YES | None | None | `projects:create` | `DRAFT` → `ACTIVE` | **YES** |
| **Projects** | Project 360 Workspace | View project overview & health | `Project`, `ProjectSite` | `GET /api/v1/projects/:id` | `projects` table record with health metrics | YES | YES | Optional | `projects:view` | Project lifecycle | **YES** |
| **Projects** | WBS & Activities | View WBS hierarchical tree | `WbsActivity`, `ActivityDependency` | `GET /api/v1/projects/:id/wbs` | Self-referencing recursive CTE on `wbs_activities` | YES | YES | Optional | `projects:wbs:view` | Activity state | **YES** |
| **Projects** | WBS & Activities | Add new WBS activity package | `WbsActivity` | `POST /api/v1/projects/:id/wbs` | Insert row into `wbs_activities` | YES | YES | Optional | `projects:wbs:manage` | `PLANNED` | **YES** |
| **Projects** | Daily DPR Logs | View DPR history & photos | `Dpr`, `DprItem` | `GET /api/v1/projects/:id/dprs` | `daily_progress_reports` + `dpr_items` | YES | YES | YES | `projects:dpr:view` | DPR review flow | **YES** |
| **Projects** | Daily DPR Logs | Submit daily site progress report | `Dpr`, `DprItem` | `POST /api/v1/projects/:id/dprs` | Transactional insert into DPR + items | YES | YES | YES | `projects:dpr:create` | `DRAFT` → `SUBMITTED` | **YES** |
| **Projects** | Daily DPR Logs | Approve / Reject site DPR | `Dpr` | `POST /api/v1/projects/:id/dprs/:dprId/review` | State mutation on `daily_progress_reports` | YES | YES | Optional | `projects:dpr:approve` | `SUBMITTED` → `APPROVED` | **YES** |
| **Materials** | Material Requirements | View BOQ-driven requisitions | `MaterialRequirement` | `GET /api/v1/material-requirements` | `material_requirements` table | YES | Optional | Optional | `materials:view` | Requirement flow | **YES** |
| **Materials** | Indents & Requisitions | Submit site material indent | `Indent`, `IndentItem` | `POST /api/v1/indents` | Transactional insert into `indents` + items | YES | YES | YES | `materials:indents:create` | `DRAFT` → `SUBMITTED` | **YES** |
| **Materials** | Indents & Requisitions | Approve / Reject material indent | `Indent` | `POST /api/v1/indents/:id/review` | Status update on `indents` table | YES | Optional | Optional | `materials:indents:approve` | `SUBMITTED` → `APPROVED` | **YES** |
| **Materials** | Purchase Orders (PO) | Issue purchase order to vendor | `PurchaseOrder`, `PurchaseOrderItem` | `POST /api/v1/purchase-orders` | Insert into `purchase_orders` + line items | YES | YES | Optional | `materials:purchase_orders:create` | `DRAFT` → `SUBMITTED` | **YES** |
| **Materials** | Purchase Orders (PO) | Approve / Sign off purchase order | `PurchaseOrder` | `POST /api/v1/purchase-orders/:id/approve` | Status update on `purchase_orders` | YES | Optional | Optional | `materials:purchase_orders:approve` | `SUBMITTED` → `APPROVED` | **YES** |
| **Materials** | Goods Receipt Note (GRN) | Record physical gate receipt | `Grn`, `GrnItem` | `POST /api/v1/grns` | Insert into `goods_receipt_notes` + items | YES | YES | YES | `materials:grn:create` | `DRAFT` → `SUBMITTED` | **YES** |
| **Materials** | Goods Receipt Note (GRN) | Verify quality & accept into stock | `Grn`, `StockLedger`, `Inventory` | `POST /api/v1/grns/:id/verify` | Tx: Update GRN + write stock ledger + incr cache | YES | YES | YES | `materials:grn:approve` | `SUBMITTED` → `APPROVED` | **YES** |
| **Materials** | Store Inventory | View warehouse stock balances | `Inventory`, `StockLedger` | `GET /api/v1/inventory` | Read from `inventory_balances` table | YES | Optional | Optional | `materials:inventory:view` | Real-time balance | **YES** |
| **Materials** | Material Issue | Release material to site activity | `MaterialIssue`, `StockLedger`, `Inventory` | `POST /api/v1/materials/issues` | Tx: Insert issue + write stock ledger + decr cache | YES | YES | YES | `materials:issue:create` | Instant ledger debit | **YES** |
| **Materials** | Material Return | Return unused stock to warehouse | `MaterialReturn`, `StockLedger`, `Inventory` | `POST /api/v1/materials/returns` | Tx: Insert return + write stock ledger + incr cache | YES | YES | YES | `materials:return:create` | Instant ledger credit | **YES** |
| **Materials** | Stock Transfer | Inter-site store transfer | `StockTransfer`, `StockLedger` | `POST /api/v1/materials/transfers` | Tx: Outward debit + in-transit record + inward credit | YES | Dual Site | Dual Site | `materials:transfer:create` | Transfer workflow | **YES** |
| **Materials** | Vendor Directory | View / Register vendors | `Vendor` | `GET / POST /api/v1/vendors` | Read/write `vendors` table | YES | None | None | `materials:vendors:manage` | Active / Inactive | **YES** |
| **Finance** | Commercial Overview | Portfolio budget vs actual cost | `Project`, `Expense`, `PurchaseOrder` | `GET /api/v1/finance/overview` | Aggregated view of committed & incurred costs | YES | Optional | Optional | `finance:view` | Real-time summary | **YES** |
| **Finance** | Budget Baselines | Configure cost code budget lines | `BudgetLine` | `POST /api/v1/projects/:id/budget-lines` | Insert into `budget_lines` table | YES | YES | Optional | `finance:manage` | Budget baseline | **YES** |
| **Finance** | Expense Vouchers | Submit site operational expense | `Expense`, `FinancialLedgerEntry` | `POST /api/v1/expenses` | Insert into `expenses` table | YES | YES | YES | `finance:manage` | `DRAFT` → `SUBMITTED` | **YES** |
| **Finance** | Expense Vouchers | Approve & disburse expense voucher | `Expense`, `FinancialLedgerEntry` | `POST /api/v1/expenses/:id/approve` | Tx: Mark `APPROVED` + post financial ledger entry | YES | Optional | Optional | `finance:approve` | `SUBMITTED` → `APPROVED` | **YES** |
| **Finance** | Payment Vouchers | Create vendor payment schedule | `Payment`, `PaymentAllocation` | `POST /api/v1/payments` | Insert into `payments` + allocations | YES | Optional | Optional | `finance:manage` | `PENDING_APPROVAL` | **YES** |
| **Finance** | Payment Vouchers | Disburse & post payment UTR | `Payment`, `Payable`, `FinancialLedgerEntry` | `POST /api/v1/payments/:id/post` | Tx: Mark `POSTED` + update payable + ledger entry | YES | Optional | Optional | `finance:pay` | `APPROVED` → `POSTED` | **YES** |
| **Finance** | Subcontractor Advances | Issue advance voucher | `Advance` | `POST /api/v1/advances` | Insert into `advances` table | YES | YES | Optional | `finance:manage` | `ISSUED` | **YES** |
| **Finance** | Advance Recoveries | Deduct advance from RA bill | `AdvanceSettlement`, `Payable` | `POST /api/v1/advances/:id/settlements` | Tx: Insert settlement + deduct payable balance | YES | YES | Optional | `finance:manage` | Cumulative deduction | **YES** |
| **People** | Employee Directory | View staff & designations | `Employee` | `GET /api/v1/employees` | `employees` table | YES | Optional | Optional | `people:view` | Active / Terminated | **YES** |
| **People** | Employee Directory | Onboard new staff employee | `Employee`, `User` | `POST /api/v1/employees` | Insert into `employees` + optional `users` | YES | Optional | Optional | `people:manage` | Active staff | **YES** |
| **People** | Biometric Attendance | Record daily staff attendance | `AttendanceRecord` | `POST /api/v1/attendance` | Bulk upsert into `attendance_records` | YES | Optional | Optional | `attendance:manage` | Present / Absent | **YES** |
| **People** | Leave Management | Apply for leave & approve | `LeaveRequest` | `POST /api/v1/leave/requests` | `leave_requests` table | YES | None | None | `leave:manage` | `SUBMITTED` → `APPROVED` | **YES** |
| **People** | Labour Contractors | Register subcontractor gang | `LabourContractor`, `LabourGang` | `POST /api/v1/labour/gangs` | Insert into `labour_gangs` table | YES | YES | YES | `people:manage` | Active gang | **YES** |
| **People** | Labour Muster Roll | Record daily gang headcount | `MusterRecord` | `POST /api/v1/labour/muster` | Insert into `muster_records` table | YES | YES | YES | `attendance:manage` | Headcount muster | **YES** |
| **Equipment** | Fleet Registry | View machinery assets | `EquipmentAsset` | `GET /api/v1/equipment` | `equipment_assets` table | YES | Optional | Optional | `equipment:view` | Active / Idle / Repair | **YES** |
| **Equipment** | Fleet Registry | Register machinery asset | `EquipmentAsset` | `POST /api/v1/equipment` | Insert into `equipment_assets` table | YES | Optional | Optional | `equipment:manage` | Operational asset | **YES** |
| **Equipment** | Fuel Logs | Record diesel dispensing log | `FuelLog` | `POST /api/v1/equipment/fuel` | Insert into `fuel_logs` table | YES | YES | YES | `equipment:manage` | Dispensing log | **YES** |
| **Equipment** | Maintenance Tickets | Open breakdown maintenance ticket | `MaintenanceTicket` | `POST /api/v1/equipment/maintenance` | Insert into `maintenance_tickets` table | YES | YES | YES | `equipment:manage` | `OPEN` → `COMPLETED` | **YES** |
| **Issues** | Snag & Defect Tracker | View open exceptions & blockers | `Issue` | `GET /api/v1/issues` | `issues` table (filtered by project/severity) | YES | Optional | Optional | `issues:view` | Open / Resolved | **YES** |
| **Issues** | Snag & Defect Tracker | Log site snag / safety hazard | `Issue` | `POST /api/v1/issues` | Insert into `issues` table | YES | YES | YES | `issues:create` | `OPEN` → `ASSIGNED` | **YES** |
| **Issues** | Snag & Defect Tracker | Acknowledge & resolve issue | `Issue` | `POST /api/v1/issues/:id/resolve` | Update status to `RESOLVED` with root cause notes | YES | YES | Optional | `issues:resolve` | `ASSIGNED` → `RESOLVED` | **YES** |
| **Documents** | Document Vault | View GFC drawings & contracts | `Document`, `DocumentVersion` | `GET /api/v1/documents` | `documents` + latest `document_versions` | YES | Optional | Optional | `documents:view` | Versioned vault | **YES** |
| **Documents** | Document Vault | Upload document / GFC revision | `Document`, `DocumentVersion` | `POST /api/v1/documents` | Insert into `documents` + `document_versions` | YES | Optional | Optional | `documents:create` | `UPLOADED` | **YES** |
| **Reports** | Analytics & Reports | Generate & export PDF/XLSX | `ReportDefinition`, `ReportExecution` | `POST /api/v1/reports/export` | Insert execution row + async worker generate | YES | Optional | Optional | `reports:export` | Generated export | **YES** |
| **Administration** | Company Profile | Update company identity & GSTIN | `Tenant` | `PUT /api/v1/settings/company` | Update `tenants` table | YES | None | None | `admin:settings` | Persisted settings | **YES** |
| **Administration** | Users & Roles | Invite user & assign RBAC role | `Invitation`, `UserRole` | `POST /api/v1/settings/invitations` | Insert into `invitations` table | YES | None | None | `admin:users` | Pending invitation | **YES** |
| **Administration** | RBAC Policy Matrix | View permissions by role | `RolePermission`, `Permission` | `GET /api/v1/settings/roles-matrix` | Join `roles` + `role_permissions` | YES | None | None | `admin:roles` | Policy view | **YES** |
| **Administration** | Security Audit Trail | View immutable system audit log | `AuditLog` | `GET /api/v1/settings/audit-logs` | Read `audit_logs` table (ordered by timestamp DESC) | YES | None | None | `admin:audit` | Append-only trail | **YES** |
| **Platform** | Tenant Provisioning | Provision new tenant organization | `Tenant`, `Subscription`, `User` | `POST /platform/tenants` | Tx: Insert tenant + subscription + initial owner user | None | None | None | `platform:tenants:manage` | `PROVISIONING` → `ACTIVE` | **YES** |
| **Platform** | Plan Management | Configure plan tiers & pricing | `Plan` | `PUT /platform/plans/:id` | Update `plans` table | None | None | None | `platform:plans:manage` | Active SaaS plan | **YES** |
| **Platform** | Support & Troubleshooting | Open tenant support ticket | `SupportTicket` | `POST /platform/support/tickets` | Insert into `support_tickets` | None | None | None | `platform:support:manage` | Support lifecycle | **YES** |
| **Platform** | Root Platform Settings | Toggle maintenance mode & MFA | `PlatformSetting` | `PUT /platform/settings` | Upsert `platform_settings` table | None | None | None | `platform:settings:manage` | Global flags | **YES** |

---

## 2. Reconciliation Confirmation

Every single capability, filter, modal form, data table, workflow action, and calculation present in the frozen DEZOBUILD frontend has an authoritative, direct, and non-orphaned representation in the backend architecture.

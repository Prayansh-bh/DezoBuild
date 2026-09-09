# DEZOBUILD — Authoritative Data Scope & Isolation Matrix

**Phase**: Backend Architecture Definition  
**Mode**: Data Architecture & Scope Boundary Specification  
**Status**: Authoritative Blueprint (Pre-Implementation Gate)  

---

## 1. Authoritative Entity Data Scope Classification

Every entity in the DEZOBUILD system belongs to exactly **one primary scope level**:
1. **PLATFORM**: Global SaaS infrastructure, subscription definitions, platform operator sessions.
2. **TENANT**: Organization-wide assets, shared catalogs, corporate settings, master charts of accounts.
3. **PROJECT**: Project-level commercial baselines, WBS trees, milestone targets, contracts.
4. **SITE**: Physical execution records, daily DPR logs, store bin inventory, gate receipts, muster rolls.
5. **USER / SELF**: Personal session tokens, notification preferences, personal leave applications.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SCOPE INHERITANCE RULE:                                                                         │
│ A Site-scoped entity (e.g. DPR) inherits Project and Tenant context:                           │
│   site_id (Specific) → project_id (Parent) → company_id (Root Boundary)                         │
│ Every customer query enforces the root company_id boundary first, then narrows by scope.        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Data Scope Matrix

| Entity Name | Primary Scope | `company_id` Required? | `project_id` Required? | `site_id` Required? | `user_id` Required? | `created_by` Tracked? | `updated_by` Tracked? | Can `SUPER_ADMIN` Access? | Can Customer Users Access? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`PlatformUser`** | PLATFORM | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **`Tenant`** | PLATFORM / TENANT | ❌ *(Is PK)* | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ *(Own Tenant)* |
| **`Plan`** | PLATFORM | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ *(Read-only)* |
| **`Subscription`** | PLATFORM / TENANT | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ *(Own Subscription)* |
| **`PlatformInvoice`** | PLATFORM / TENANT | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ *(Own Invoices)* |
| **`SupportTicket`** | PLATFORM / TENANT | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ *(Own Tickets)* |
| **`PlatformSetting`** | PLATFORM | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **`PlatformAuditLog`**| PLATFORM | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **`User`** | TENANT | ✅ | ❌ | ❌ | ❌ *(Is PK)* | ✅ | ✅ | ❌ *(Audit Only)* | ✅ |
| **`UserSession`** | USER / SELF | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ *(Own Session)* |
| **`Role`** | TENANT | ✅ *(Nullable for System)*| ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **`Permission`** | PLATFORM / SYSTEM | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ *(Read-only)* |
| **`ProjectAssignment`**| TENANT | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **`SiteAssignment`** | TENANT | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **`Invitation`** | TENANT | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **`Project`** | PROJECT | ✅ | ❌ *(Is PK)* | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`ProjectSite`** | SITE | ✅ | ✅ | ❌ *(Is PK)* | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`ProjectMilestone`** | PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`WbsActivity`** | PROJECT | ✅ | ✅ | Optional | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`ActivityDependency`**| PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`Dpr`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`DprItem`** | SITE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ *(Scoped)* |
| **`Material`** | TENANT | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **`MaterialRequirement`**| PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`Indent`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`IndentItem`** | SITE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ *(Scoped)* |
| **`PurchaseOrder`** | PROJECT | ✅ | ✅ | Optional | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`PurchaseOrderItem`** | PROJECT | ✅ | ✅ | Optional | ❌ | ❌ | ❌ | ❌ | ✅ *(Scoped)* |
| **`Vendor`** | TENANT | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **`Grn`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`GrnItem`** | SITE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ *(Scoped)* |
| **`InventoryLocation`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`Inventory`** | SITE | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ *(Scoped)* |
| **`StockLedger`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`MaterialIssue`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`MaterialReturn`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`StockTransfer`** | SITE | ✅ | Dual Project | Dual Site | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`BudgetLine`** | PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`Expense`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`Payment`** | TENANT / PROJECT | ✅ | Optional | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **`PaymentAllocation`** | PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **`Advance`** | PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`AdvanceSettlement`** | PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`Receivable`** | PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`Payable`** | PROJECT | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`FinancialLedgerEntry`**| TENANT / PROJECT | ✅ | Optional | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **`Employee`** | TENANT | ✅ | Optional | Optional | ❌ | ✅ | ✅ | ❌ | ✅ |
| **`AttendanceRecord`** | SITE | ✅ | Optional | Optional | ✅ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`LeaveRequest`** | USER / SELF | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ *(Self / HR)* |
| **`LabourContractor`** | TENANT | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **`LabourGang`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`MusterRecord`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`EquipmentAsset`** | TENANT | ✅ | Optional | Optional | ❌ | ✅ | ✅ | ❌ | ✅ |
| **`EquipmentUtilization`**| SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`FuelLog`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`MaintenanceTicket`** | SITE | ✅ | Optional | Optional | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`Issue`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`IssueComment`** | SITE | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`SmartAlert`** | PROJECT / SITE | ✅ | Optional | Optional | ❌ | ❌ *(System)* | ✅ | ❌ | ✅ *(Scoped)* |
| **`Document`** | PROJECT / TENANT | ✅ | Optional | Optional | ❌ | ✅ | ✅ | ❌ | ✅ *(Scoped)* |
| **`DocumentVersion`** | PROJECT / TENANT | ✅ | Optional | Optional | ❌ | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| **`ReportExecution`** | USER / TENANT | ✅ | Optional | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ *(Self / Admin)*|
| **`Notification`** | USER / SELF | ✅ | ❌ | ❌ | ✅ | ❌ *(System)* | ✅ | ❌ | ✅ *(Own)* |
| **`AuditLog`** | TENANT | ✅ | Optional | Optional | ❌ | ✅ | ❌ | ❌ | ✅ *(Admin)* |
| **`OutboxEvent`** | SYSTEM | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`IdempotencyKey`** | TENANT | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## 3. Database Composite Indexing Strategy

All high-throughput relational tables in PostgreSQL must employ **tenant-prefixed composite indexes**. This guarantees index-only scans and eliminates cross-tenant table scan risks.

### Conceptual Composite Index Specifications:
1. **Projects**: `CREATE INDEX idx_projects_tenant_status ON projects (company_id, status, target_completion);`
2. **WBS Activities**: `CREATE INDEX idx_wbs_tenant_proj_parent ON wbs_activities (company_id, project_id, parent_id, status);`
3. **DPRs**: `CREATE INDEX idx_dpr_tenant_proj_date ON daily_progress_reports (company_id, project_id, site_id, report_date DESC);`
4. **Indents**: `CREATE INDEX idx_indents_tenant_proj_status ON indents (company_id, project_id, status, created_at DESC);`
5. **Purchase Orders**: `CREATE INDEX idx_po_tenant_proj_vendor ON purchase_orders (company_id, project_id, vendor_id, status);`
6. **GRNs**: `CREATE INDEX idx_grn_tenant_po ON goods_receipt_notes (company_id, po_id, status);`
7. **Inventory Balances**: `CREATE UNIQUE INDEX uq_inv_tenant_site_mat ON inventory_balances (company_id, site_id, location_id, material_id);`
8. **Stock Ledger**: `CREATE INDEX idx_stock_ledger_site_mat ON stock_ledger_entries (company_id, site_id, material_id, created_at DESC);`
9. **Expenses**: `CREATE INDEX idx_expenses_tenant_proj_status ON expenses (company_id, project_id, status, created_at DESC);`
10. **Payments**: `CREATE INDEX idx_payments_tenant_vendor ON payments (company_id, vendor_id, status, due_date);`
11. **Attendance**: `CREATE INDEX idx_attendance_tenant_emp_date ON attendance_records (company_id, employee_id, muster_date);`
12. **Muster Records**: `CREATE INDEX idx_muster_tenant_gang_date ON muster_records (company_id, gang_id, muster_date);`
13. **Audit Logs**: `CREATE INDEX idx_audit_tenant_entity ON audit_logs (company_id, entity_type, entity_id, created_at DESC);`

---

## 4. Soft Delete vs Archival vs Hard Delete Strategy

| Entity Class | Deletion Strategy | Justification |
| :--- | :--- | :--- |
| **Financial Ledgers, Expenses, Payments** | **NEVER DELETE** | Statutory compliance, tax audit, and accounting reconciliation require immutable records. Reversals occur through offsetting debit/credit entries. |
| **Stock Ledger, GRNs, Issues** | **NEVER DELETE** | Physical material inventory accounting requires complete historical trace. |
| **Audit Logs, Security Events** | **NEVER DELETE** | Non-repudiation and forensic audit requirements prohibit record destruction. |
| **Projects, WBS Activities** | **ARCHIVAL STATE** | `status = 'ARCHIVED'`. Preserves all linked financial, procurement, and progress history. |
| **Vendors, Materials, Equipment** | **DEACTIVATION STATE** | `is_active = FALSE`. Prevents new transactions while maintaining integrity of past POs and logs. |
| **Employees, User Accounts** | **DEACTIVATION STATE** | `status = 'TERMINATED'` or `'INACTIVE'`. Preserves historical attendance, signoffs, and audit IDs. |
| **Documents, Drawings** | **ARCHIVAL STATE** | `is_archived = TRUE`. Superseded revisions remain permanently downloadable in version history. |
| **Draft Indents, Draft Issues, Draft Notes**| **HARD DELETE ALLOWED** | Unsubmitted, unapproved drafts with no downstream dependencies may be permanently purged. |
| **User Sessions, Expired Invitations** | **HARD PURGE (CRON)** | Background cleanup jobs purge expired tokens and unclaimed invites after 30 days. |

---

## 5. Data Retention Blueprint

1. **Active Operational Records** (Projects, POs, Invoices, DPRs): Retained permanently for active tenant workspace duration + 7 years statutory tax retention post-termination.
2. **Security Audit Logs**: Retained in primary database for 365 days; archived to immutable cold object storage for 7 years.
3. **Ephemeral Telemetry & Server Logs**: Retained in monitoring pipeline for 30 days, aggregated metrics retained for 12 months.
4. **Tenant Offboarding / Deletion**: Upon contract termination and 90-day grace period, tenant database partitions and encrypted backups are irreversibly sanitized.

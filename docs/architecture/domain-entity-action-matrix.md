# DEZOBUILD — Authoritative Domain / Entity / Action Matrix

## 1. Architectural Scope & Boundary Declaration

This document defines the **authoritative capability matrix, entity permissions, and workflow actions** for the **DEZOBUILD Customer Application (`app.dezobuild.com`)**.

### Multi-Tenant Platform Decoupling
- **Platform Owner Layer (`owner.dezobuild.com`)**: Reserved exclusively for the SaaS Platform Owner (`SUPER_ADMIN`). Handles global tenant provisioning, subscription licensing, platform telemetry, and system-wide infrastructure.
- **Customer Application Layer (`app.dezobuild.com`)**: Operates across exactly **9 canonical customer roles** within a single tenant boundary.

---

## 2. Canonical Customer Roles

| Role Key | Title | Primary Operational Mission |
| :--- | :--- | :--- |
| **`COMPANY_OWNER`** | Company Owner / Executive | Strategic direction, portfolio health, capital allocations, executive approvals. |
| **`COMPANY_ADMIN`** | Company Administrator | Organizational governance, user management, branch configuration, master data. |
| **`PROJECT_MANAGER`** | Senior Project Manager | Project lifecycle, WBS baseline, schedule critical path, indent approvals, site health. |
| **`SITE_ENGINEER`** | Site Operations Engineer | Field execution, daily progress reports (DPR), site attendance, GRN inspection, safety. |
| **`PROCUREMENT_STORE`** | Procurement & Store Lead | Supply chain, purchase orders, vendor rate contracts, warehouse inventory, stock transfers. |
| **`ACCOUNTANT`** | Senior Project Accountant | Commercial books, client RA bills, vendor payables, petty cash, contractor advances. |
| **`HR`** | HR & Workforce Manager | Staff directory, biometric attendance, labour contractor muster, payroll runs, onboarding. |
| **`EMPLOYEE`** | Project Engineer / Employee | Self-service workspace, personal task list, attendance clock-in, leave requests, payslips. |
| **`VIEWER`** | Auditor / Stakeholder | Read-only auditing of project status, reports, and drawings with zero mutate actions. |

---

## 3. High-Level Entity Action Summary Matrix

| Entity | `COMPANY_OWNER` | `COMPANY_ADMIN` | `PROJECT_MANAGER` | `SITE_ENGINEER` | `PROCUREMENT_STORE` | `ACCOUNTANT` | `HR` | `EMPLOYEE` | `VIEWER` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Project Master** | Full Admin | Full Admin | Scoped (View/Edit) | Scoped (View) | Full (View) | Full (View) | Scoped (View) | Scoped (View) | View Only |
| **2. WBS Activity** | Full Admin | Full Admin | Full (Create/Edit) | Scoped (Progress) | View Only | View Only | No Access | Scoped (Tasks) | View Only |
| **3. DPR Daily Log** | Full Admin | Full Admin | Approve/Reject | Create/Submit | View Only | View Only | View Only | View (Site) | View Only |
| **4. Material Indent** | Approve/Reject | Approve/Reject | Approve/Reject | Create/Submit | Review/Fulfill | View Only | No Access | No Access | View Only |
| **5. Purchase Order** | Approve (>₹5L) | Approve | Review/Track | No Access | Full (Create/Issue) | Approve/Verify | No Access | No Access | View Only |
| **6. Goods Receipt (GRN)** | View/Audit | View/Audit | Scoped (View) | Inspect/Verify | Full (Create/Receive) | Verify Invoices | No Access | No Access | View Only |
| **7. Material Master** | Full Admin | Full Admin | View Only | View Only | Full (Create/Edit) | View Rates | No Access | No Access | View Only |
| **8. Stock Transfer** | View/Audit | View/Audit | Scoped (View) | Acknowledge | Full (Create/Issue) | View Valuation | No Access | No Access | View Only |
| **9. Material Issue** | View/Audit | View/Audit | Scoped (View) | Request/Receive | Full (Issue/Log) | View Cost | No Access | No Access | View Only |
| **10. Client Invoice (RA)** | Full (Approve) | Full (Approve) | Scoped (Draft) | View Only | No Access | Full (Create/Issue) | No Access | No Access | View Only |
| **11. Vendor Bill** | Approve (>₹1L) | Approve | Verify Delivery | View Only | Verify GRN Match | Full (Create/Pay) | No Access | No Access | View Only |
| **12. Expense Voucher** | Approve High | Approve | Create/Approve | Create (Petty) | Create (Store) | Full (Audit/Pay) | Create (HR) | View (Own) | View Only |
| **13. Contractor Advance** | Full (Approve) | Full (Approve) | Recommend | No Access | No Access | Full (Create/Recover) | No Access | No Access | View Only |
| **14. Employee Profile** | Full Admin | Full Admin | Scoped (Team) | No Access | No Access | View (Salary) | Full (Manage) | Self Only | View Only |
| **15. Site Attendance** | View/Audit | View/Audit | Scoped (Approve) | Daily Log Entry | No Access | View (Payroll) | Full (Reconcile) | Self Punch | View Only |
| **16. Contractor Gang** | View/Audit | View/Audit | Scoped (Allocate) | Daily Deployment | No Access | Rate Baseline | Full (Contract) | No Access | View Only |
| **17. Payroll Run** | Approve/Release | Approve | No Access | No Access | No Access | Disburse | Full (Process) | View (Own) | No Access |
| **18. Equipment Asset** | Full Admin | Full Admin | Scoped (Request) | Scoped (Log) | No Access | View Valuation | No Access | No Access | View Only |
| **19. Maintenance Log** | View/Audit | View/Audit | Scoped (View) | Log Breakdown | No Access | View Invoices | No Access | No Access | View Only |
| **20. Fuel Log** | View/Audit | View/Audit | Scoped (View) | Log Fuel In/Out | No Access | Audit Vouchers | No Access | No Access | View Only |
| **21. Issue Alert** | Resolve/Dismiss | Resolve/Dismiss | Resolve (Project) | Log Site Issue | Resolve (Supply) | Resolve (Finance) | Resolve (Labour) | No Access | View Only |
| **22. Document / Drawing** | Full Admin | Full Admin | Upload/Approve | View/Download | View PO Docs | View Contracts | View HR Docs | View Assigned | View Only |
| **23. Report Digest** | All Reports | All Reports | Project Analytics | Site Logs | Procurement Logs | Financial P&L/Tax | Workforce Stats | No Access | View Only |
| **24. Company Settings** | Full Admin | Full Admin | No Access | No Access | No Access | No Access | No Access | No Access | View Only |
| **25. User Account** | Full Admin | Full Admin | No Access | No Access | No Access | No Access | Onboard Employees | Self Profile | View Only |
| **26. Role Permissions** | Full Admin | Full Admin | No Access | No Access | No Access | No Access | No Access | No Access | View Only |

---

## 4. Granular Entity & Workflow Specifications

### Domain 1: Project Engineering & Field Operations

#### 1.1 Project Master (`Project`)
- **`COMPANY_OWNER`**: `view:all`, `create`, `edit`, `approve:budget`, `archive`, `export:pdf/csv`, `administer`.
- **`COMPANY_ADMIN`**: `view:all`, `create`, `edit`, `archive`, `administer`.
- **`PROJECT_MANAGER`**: `view:assigned`, `edit:operational`, `export:360_report`.
- **`SITE_ENGINEER`**: `view:assigned` (read-only baseline).
- **`PROCUREMENT_STORE`**: `view:all` (for material dispatch scoping).
- **`ACCOUNTANT`**: `view:all` (for cost ledger mapping).
- **`HR`**: `view:assigned` (for manpower deployment).
- **`EMPLOYEE`**: `view:assigned` (read-only project context).
- **`VIEWER`**: `view:all` (read-only).

#### 1.2 Work Breakdown Structure (`WbsActivity`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `create`, `edit`, `delete`, `export`.
- **`PROJECT_MANAGER`**: `view:assigned`, `create`, `edit`, `re-baseline`, `assign:gang`, `export`.
- **`SITE_ENGINEER`**: `view:assigned`, `update:progress_qty`, `update:progress_pct`.
- **`EMPLOYEE`**: `view:assigned_tasks`, `update:task_status`.
- **`VIEWER`**: `view:all` (read-only).

#### 1.3 Daily Progress Report (`DprRecord`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `approve`, `reject`, `export`.
- **`PROJECT_MANAGER`**: `view:assigned`, `approve`, `reject`, `export`.
- **`SITE_ENGINEER`**: `view:assigned`, `create`, `edit:draft`, `submit`, `upload:photos`.
- **`EMPLOYEE`**: `view:assigned_site` (read-only feed).
- **`VIEWER`**: `view:all` (read-only).

---

### Domain 2: Procurement & Store Management

#### 2.1 Material Indent (`Indent`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `approve`, `reject`.
- **`PROJECT_MANAGER`**: `view:assigned`, `create`, `approve:site_indents`, `reject`.
- **`SITE_ENGINEER`**: `view:assigned`, `create:site_indent`, `edit:draft`, `submit`.
- **`PROCUREMENT_STORE`**: `view:all`, `review`, `convert:to_rfq_or_po`, `reject`.
- **`VIEWER`**: `view:all` (read-only).

#### 2.2 Purchase Order (`PurchaseOrder`)
- **`COMPANY_OWNER`**: `view:all`, `approve:>500000`, `reject`, `export`.
- **`COMPANY_ADMIN`**: `view:all`, `approve:all`, `reject`, `export`.
- **`PROJECT_MANAGER`**: `view:assigned`, `review:specs`, `track`.
- **`PROCUREMENT_STORE`**: `view:all`, `create`, `edit:draft`, `issue:to_vendor`, `export`.
- **`ACCOUNTANT`**: `view:all`, `verify:payment_terms`, `match:with_grn_invoice`.
- **`VIEWER`**: `view:all` (read-only).

#### 2.3 Goods Receipt Note (`GoodsReceiptNote` / `GRN`)
- **`PROCUREMENT_STORE`**: `view:all`, `create`, `edit`, `verify:gate_entry`, `accept:qty`, `reject:defects`.
- **`SITE_ENGINEER`**: `view:assigned`, `inspect:field_delivery`, `verify:quality`, `flag:discrepancies`.
- **`ACCOUNTANT`**: `view:all`, `match:3_way_with_po_invoice`, `approve:for_billing`.
- **`PROJECT_MANAGER` & `COMPANY_OWNER`**: `view:all`, `audit`.
- **`VIEWER`**: `view:all` (read-only).

#### 2.4 Material Master & Store Inventory (`MaterialItem`, `StockTransfer`, `MaterialIssue`)
- **`PROCUREMENT_STORE`**: `view:all`, `create:material`, `edit:safety_stock`, `create:transfer`, `issue:to_gang`.
- **`SITE_ENGINEER`**: `view:site_stock`, `request:transfer`, `receive:issued_items`.
- **`ACCOUNTANT`**: `view:all`, `export:stock_valuation_ledger`.
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `administer`.
- **`VIEWER`**: `view:all` (read-only).

---

### Domain 3: Finance & Commercial Management

#### 3.1 Client RA Invoices (`ClientInvoice`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `approve:final`, `issue:to_client`, `export`.
- **`ACCOUNTANT`**: `view:all`, `create:draft_ra_bill`, `edit`, `calculate:deductions_retention`, `export`.
- **`PROJECT_MANAGER`**: `view:assigned`, `certify:physical_milestones`.
- **`VIEWER`**: `view:all` (read-only).

#### 3.2 Vendor Payables & Bills (`VendorBill`)
- **`COMPANY_OWNER`**: `view:all`, `approve:>100000`, `authorize:payment_release`.
- **`ACCOUNTANT`**: `view:all`, `create:vendor_voucher`, `3_way_match`, `schedule:payment`, `export`.
- **`PROCUREMENT_STORE`**: `view:all`, `verify:grn_rate_match`.
- **`PROJECT_MANAGER`**: `view:assigned`, `verify:site_deliverables`.
- **`VIEWER`**: `view:all` (read-only).

#### 3.3 Petty Cash & Expense Register (`ExpenseRecord`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `approve:high_value`, `audit`.
- **`ACCOUNTANT`**: `view:all`, `create:voucher`, `reimburse`, `audit:receipts`, `export`.
- **`PROJECT_MANAGER`**: `view:assigned`, `create:project_expense`, `approve:site_petty_cash`.
- **`SITE_ENGINEER`**: `view:assigned`, `create:petty_cash_voucher`, `upload:receipt`.
- **`HR`**: `view:all`, `create:staff_welfare_expense`.
- **`EMPLOYEE`**: `view:own_claims`, `create:reimbursement_claim`.
- **`VIEWER`**: `view:all` (read-only).

#### 3.4 Subcontractor Advances & Running Bill Recovery (`SubcontractorAdvance`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `approve`, `reject`.
- **`ACCOUNTANT`**: `view:all`, `create:advance`, `configure:recovery_terms`, `auto_deduct_running_bill`.
- **`PROJECT_MANAGER`**: `view:assigned`, `recommend:advance`.
- **`VIEWER`**: `view:all` (read-only).

---

### Domain 4: People, Labour & Workforce Management

#### 4.1 Staff Directory & Employee Profiles (`Employee`)
- **`HR`**: `view:all`, `create`, `edit`, `assign:role`, `manage:leaves_salary`, `export`.
- **`COMPANY_ADMIN` & `COMPANY_OWNER`**: `view:all`, `create`, `edit`, `administer`.
- **`PROJECT_MANAGER`**: `view:assigned_site_team`.
- **`EMPLOYEE`**: `view:self_profile`, `update:emergency_contacts`.
- **`VIEWER`**: `view:all` (read-only).

#### 4.2 Daily Attendance & Muster (`AttendanceRecord`)
- **`HR`**: `view:all`, `sync:biometric`, `reconcile:muster`, `approve:overtime`, `export`.
- **`SITE_ENGINEER`**: `view:assigned_site`, `log:daily_site_muster`, `record:gang_headcount`.
- **`PROJECT_MANAGER`**: `view:assigned_site`, `approve:daily_muster`.
- **`EMPLOYEE`**: `view:self_attendance`, `clock_in`, `clock_out`.
- **`VIEWER`**: `view:all` (read-only).

#### 4.3 Labour Contractors & Gang Deployments (`ContractorGang`)
- **`HR`**: `view:all`, `onboard:contractor`, `record:wage_rates`, `audit:statutory_compliance`.
- **`SITE_ENGINEER`**: `view:assigned_site`, `log:daily_deployment`, `verify:skilled_unskilled_count`.
- **`PROJECT_MANAGER`**: `view:assigned_site`, `allocate:gangs_to_activities`.
- **`ACCOUNTANT`**: `view:all`, `verify:contractor_bills_against_muster`.
- **`COMPANY_OWNER`**: `view:all`, `approve:rate_agreements`.
- **`VIEWER`**: `view:all` (read-only).

#### 4.4 Monthly Payroll Runs (`PayrollRun`)
- **`HR`**: `view:all`, `initiate:payroll_run`, `calculate:deductions`, `generate:payslips`.
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `approve:salary_release`.
- **`ACCOUNTANT`**: `view:all`, `execute:bank_disbursements`, `file:statutory_pf_esic`.
- **`EMPLOYEE`**: `view:own_payslips`, `download:pdf`.
- **`VIEWER`**: `no_access`.

---

### Domain 5: Plant & Heavy Equipment Management

#### 5.1 Asset Fleet (`EquipmentAsset`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `create:asset`, `edit`, `depreciate`, `archive`.
- **`PROJECT_MANAGER`**: `view:assigned_site`, `request:mobilization`, `allocate:to_wbs`.
- **`SITE_ENGINEER`**: `view:assigned_site`, `log:running_hours`.
- **`ACCOUNTANT`**: `view:all`, `track:asset_valuation_and_hire_charges`.
- **`VIEWER`**: `view:all` (read-only).

#### 5.2 Maintenance, Servicing & Breakdown Logs (`MaintenanceLog`)
- **`SITE_ENGINEER`**: `view:assigned_site`, `log:breakdown_alert`, `record:incident`.
- **`PROJECT_MANAGER`**: `view:assigned_site`, `approve:service_request`, `track:downtime`.
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `audit:fleet_health`.
- **`VIEWER`**: `view:all` (read-only).

#### 5.3 Fuel Issuance & Meter Logs (`FuelLog`)
- **`SITE_ENGINEER`**: `view:assigned_site`, `log:diesel_issuance`, `record:hour_meter`.
- **`PROJECT_MANAGER`**: `view:assigned_site`, `analyze:fuel_efficiency_vs_running_hours`.
- **`ACCOUNTANT`**: `view:all`, `reconcile:fuel_bills_with_pump_logs`.
- **`VIEWER`**: `view:all` (read-only).

---

### Domain 6: Issues, Risks & Smart Alerts (`IssueAlert`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `acknowledge`, `resolve`, `dismiss`, `escalate`.
- **`PROJECT_MANAGER`**: `view:assigned_site`, `acknowledge`, `resolve:schedule_cost_risks`.
- **`SITE_ENGINEER`**: `view:assigned_site`, `create:site_defect_or_safety_issue`, `resolve:field_blockers`.
- **`PROCUREMENT_STORE`**: `view:supply_alerts`, `resolve:stockout_warnings`.
- **`ACCOUNTANT`**: `view:finance_alerts`, `resolve:overdue_bills`.
- **`HR`**: `view:workforce_alerts`, `resolve:shortages`.
- **`VIEWER`**: `view:all` (read-only).

---

### Domain 7: Documents, Drawings & GFC Vault (`DocumentItem`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `upload`, `edit`, `delete`, `manage_categories`.
- **`PROJECT_MANAGER`**: `view:assigned_site`, `upload:gfc_drawings`, `approve:transmittals`.
- **`SITE_ENGINEER`**: `view:assigned_site`, `download:drawings`, `upload:as_built_photos`.
- **`PROCUREMENT_STORE`**: `view:vendor_contracts_and_pos`, `upload:warranty_certificates`.
- **`ACCOUNTANT`**: `view:tax_invoices_and_audits`.
- **`HR`**: `view:employee_contracts_and_id_proofs`.
- **`EMPLOYEE`**: `view:assigned_job_drawings_and_safety_manuals`.
- **`VIEWER`**: `view:all` (read-only download).

---

### Domain 8: Analytics & Reporting (`ReportDigest`)
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: `view:all`, `generate:custom`, `export:pdf_excel_csv`.
- **`PROJECT_MANAGER`**: `view:project_analytics`, `generate:schedule_cost_s_curve`, `export`.
- **`ACCOUNTANT`**: `view:finance_reports`, `generate:pnl_cash_flow_tax`, `export`.
- **`PROCUREMENT_STORE`**: `view:inventory_reports`, `generate:stock_turnover_consumption`, `export`.
- **`HR`**: `view:people_reports`, `generate:headcount_wage_distribution`, `export`.
- **`SITE_ENGINEER`**: `view:site_logs`, `generate:dpr_summary`, `export`.
- **`VIEWER`**: `view:permitted_reports`, `export`.
- **`EMPLOYEE`**: `no_access`.

---

### Domain 9: Company Administration & Governance
- **`COMPANY_OWNER` & `COMPANY_ADMIN`**: Full administrative authority over:
  - Company Legal Entity Profile & Tax Numbers (GSTIN, PAN).
  - Branch Offices & Regional Warehouses.
  - User Directory & Authentication Invitations.
  - Role Assignment & Custom Capability Overrides.
  - System Audit Trail & Compliance Logs.
- **All other customer roles**: Strictly blocked from Administration routes and settings tabs.

---

## 5. Implementation Directives for Backend Services & Prisma Models

When implementing the future backend API services and Prisma repositories:
1. **Tenant Isolation**: Every query must include `where: { tenantId }`.
2. **Project Scoping**: For `PROJECT_MANAGER`, `SITE_ENGINEER`, and `EMPLOYEE`, queries must automatically filter by assigned project IDs in `ProjectAssignment`.
3. **Action Authorization Guard**: Use declarative route guards matching the capability tags defined in this matrix (e.g. `@RequirePermission("materials.po:create")`).
4. **Audit Logging**: Every create, edit, approve, reject, issue, and delete action must append an entry to `AuditLogRecord` with `{ tenantId, userId, role, entityName, entityId, action, timestamp, ipAddress }`.

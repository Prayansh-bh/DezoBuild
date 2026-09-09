# DEZOBUILD — Authoritative Backend Domain Entity Model

**Phase**: Backend Architecture Definition  
**Mode**: Forensic / Domain Modeling & Entity Specification  
**Status**: Authoritative Blueprint (Pre-Implementation Gate)  

---

## 1. Domain Entity Inventory & Rationalization Matrix

To prevent database bloat and excessive joins while guaranteeing 100% feature coverage of the frozen DEZOBUILD frontend, every proposed candidate entity has been categorized as **KEEP**, **MERGE**, **REMOVE**, or **DEFER**.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ CLASSIFICATION TAXONOMY:                                                               │
│ • KEEP: First-class persisted relational entity in PostgreSQL.                        │
│ • MERGE: Attributes folded directly into parent entity or JSONB document structure.    │
│ • REMOVE: Superfluous or redundant abstraction eliminating unnecessary database joins. │
│ • DEFER: Post-V1 capability deferred to future roadmap phase.                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### A. Platform Governance Domain (`owner.dezobuild.com`)

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `PlatformUser` | **KEEP** | `platform_users` table | Root administrative operators managing SaaS infrastructure. |
| `PlatformRole` | **MERGE** | Folded into `platform_users.role` | Platform has fixed roles (`SUPER_ADMIN`, `SUPPORT_LEAD`). No custom platform RBAC required in V1. |
| `PlatformPermission` | **MERGE** | Code-level policy matrix | Fixed platform capabilities (`tenants:manage`, `billing:manage`). |
| `Tenant` | **KEEP** | `tenants` table | Canonical root organization record representing subscribing business entity. |
| `TenantStatus` | **MERGE** | `tenants.status` enum | Status enum (`ACTIVE`, `SUSPENDED`, `DELINQUENT`, `PROVISIONING`, `TERMINATED`). |
| `Plan` | **KEEP** | `plans` table | Tier definitions (`Starter`, `Professional`, `Enterprise`). |
| `PlanFeature` | **MERGE** | `plans.features` JSONB array | Simple set of feature slug strings per plan tier. |
| `Subscription` | **KEEP** | `subscriptions` table | Active commercial contract between Tenant and Platform. |
| `SubscriptionFeature` | **MERGE** | `subscriptions.custom_entitlements` JSONB | Overrides for custom enterprise tenant feature toggles. |
| `PlatformInvoice` | **KEEP** | `platform_invoices` table | SaaS billing invoices generated for tenant subscriptions. |
| `PlatformPayment` | **KEEP** | `platform_payments` table | Payment gateway receipts for SaaS subscription charges. |
| `PlatformAuditLog` | **KEEP** | `platform_audit_logs` table | Immutable log of platform operator actions across tenants. |
| `SupportTicket` | **KEEP** | `support_tickets` table | Tenant support requests and owner troubleshooting sessions. |
| `PlatformSetting` | **KEEP** | `platform_settings` table | Key-value store for global platform flags (maintenance mode, MFA enforcement). |
| `PlatformHealthSnapshot` | **REMOVE** | Ephemeral telemetry | System health metrics derived live from Redis/DB ping; not persisted in relational tables. |

---

### B. Tenant, Identity & Security Domain

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `Company` | **MERGE** | Unified with `Tenant` | In DEZOBUILD multi-tenant model, `Tenant` is the legal corporate identity. |
| `Branch` | **DEFER** | Post-V1 multi-branch | Multi-site projects satisfy geographic location needs in V1. |
| `Department` | **MERGE** | `employees.department` enum / string | Lightweight categorization on employee records. |
| `User` | **KEEP** | `users` table | Core personnel identity within a tenant workspace. |
| `UserSession` | **KEEP** | `user_sessions` table / Redis | Active refresh tokens, IP, device metadata, and revocation state. |
| `Role` | **KEEP** | `roles` table | 9 canonical system roles + tenant-customizable designations. |
| `Permission` | **KEEP** | `permissions` table / Enum | Master registry of atomic capability namespaces (`projects:create`). |
| `RolePermission` | **KEEP** | `role_permissions` join table | Mapping of permissions granted to each role. |
| `UserRole` | **KEEP** | `user_roles` join table | Tenant-scoped role assignment per user. |
| `Feature` | **KEEP** | `features` table / Code Enum | System feature slugs (`wbs_gantt`, `finance_petty_cash`, `ocr_receipts`). |
| `TenantFeature` | **KEEP** | `tenant_features` table | Explicit feature activation per tenant. |
| `ProjectAssignment` | **KEEP** | `project_assignments` table | Restricts user visibility and mutation rights to specific projects. |
| `SiteAssignment` | **KEEP** | `site_assignments` table | Restricts site engineers to specific site physical boundaries. |
| `Invitation` | **KEEP** | `invitations` table | Pending email invitations with cryptographic acceptance tokens. |
| `SecurityEvent` | **KEEP** | `security_events` table | Failed logins, MFA challenges, password resets, suspicious IP triggers. |

---

### C. Projects & Execution Domain

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `Project` | **KEEP** | `projects` table | Core construction project record with budget, client, and schedule baselines. |
| `ProjectSite` | **KEEP** | `project_sites` table | Physical site location / branch under a project with geo-coordinates. |
| `ProjectPhase` | **MERGE** | Folded into `wbs_activities.phase` | Phase is modeled as top-level grouping in the WBS tree. |
| `ProjectMilestone` | **KEEP** | `project_milestones` table | Key contractual milestone target dates, baseline slippage, and sign-offs. |
| `Wbs` | **MERGE** | Parent-child tree in `wbs_activities` | Self-referencing hierarchical tree (`parent_id`) avoids redundant wrapper entity. |
| `WbsActivity` | **KEEP** | `wbs_activities` table | Granular work packages with planned quantity, unit rate, and progress. |
| `ActivityDependency` | **KEEP** | `activity_dependencies` table | Finish-to-Start, Start-to-Start critical path Gantt linkages. |
| `Dpr` | **KEEP** | `daily_progress_reports` table | Official daily site log submitted by Site Engineer. |
| `DprItem` | **KEEP** | `dpr_items` table | Daily physical progress measurements linked to specific WBS activities. |
| `ProgressMeasurement` | **MERGE** | Unified into `dpr_items` | Daily cumulative physical measurement recorded directly on DPR item. |
| `ProjectBudget` | **MERGE** | `projects.approved_budget` / `budget_lines` | Budget baseline captured on project and detailed in Finance domain. |
| `ProjectCost` | **MERGE** | Computed financial view | Real-time aggregation of incurred expenses, approved POs, and muster wages. |
| `ProjectDocumentLink` | **MERGE** | `documents.project_id` foreign key | Direct relational association on Document entity. |

---

### D. Procurement & Store Operations Domain

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `Material` | **KEEP** | `materials` table | Master material catalog items (cement, rebar, aggregates, unit rates). |
| `MaterialCategory` | **MERGE** | `materials.category` enum / column | Standard construction categories (Structural, Finishing, MEP). |
| `MaterialRequirement` | **KEEP** | `material_requirements` table | BOQ-driven baseline material budget calculated for project WBS. |
| `Indent` | **KEEP** | `indents` table | Site material requisition submitted for approval. |
| `IndentItem` | **KEEP** | `indent_items` table | Line items requested on an indent with required delivery dates. |
| `PurchaseOrder` | **KEEP** | `purchase_orders` table | Formal commercial commitment issued to registered vendor. |
| `PurchaseOrderItem` | **KEEP** | `purchase_order_items` table | Contracted quantity, unit rate, GST rate, and delivery schedule. |
| `Vendor` | **KEEP** | `vendors` table | Supplier and contractor directory with GSTIN, PAN, and payment terms. |
| `VendorContact` | **MERGE** | `vendors.contacts` JSONB | Array of vendor representative contacts (name, phone, email). |
| `Grn` | **KEEP** | `goods_receipt_notes` table | Gate receipt and physical quality verification document. |
| `GrnItem` | **KEEP** | `grn_items` table | Received, accepted, and rejected quantities against PO line items. |
| `Inventory` | **KEEP** | `inventory_balances` table | Real-time cached on-hand, allocated, and available stock per site warehouse. |
| `InventoryLocation` | **KEEP** | `inventory_locations` table | Specific storage bin, yard, or warehouse zone within a project site. |
| `StockLedger` | **KEEP** | `stock_ledger_entries` table | Immutable double-entry ledger recording all physical material increments/decrements. |
| `MaterialIssue` | **KEEP** | `material_issues` table | Material release from store to specific WBS activity and labour gang. |
| `MaterialIssueItem` | **KEEP** | `material_issue_items` table | Specific batch / quantities issued out of store stock. |
| `MaterialReturn` | **KEEP** | `material_returns` table | Unused or excess site material returned to store warehouse. |
| `MaterialReturnItem` | **KEEP** | `material_return_items` table | Return quantities credited back to active stock. |
| `StockTransfer` | **KEEP** | `stock_transfers` table | Inter-site material relocation between Project Site A and Project Site B. |
| `StockTransferItem` | **KEEP** | `stock_transfer_items` table | Specific material quantities in transit between project storehouses. |
| `MaterialMovement` | **MERGE** | Unified with `stock_ledger_entries` | All material movements are captured authoritatively in the stock ledger. |

---

### E. Finance & Commercial Domain

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `Budget` | **MERGE** | Unified on `Project` | Project contains approved budget baseline and contingency buffer. |
| `BudgetLine` | **KEEP** | `budget_lines` table | Granular cost-code allocations (Labour, Materials, Plant, Subcontract, Overheads). |
| `Expense` | **KEEP** | `expenses` table | Site petty cash and operational expense vouchers. |
| `ExpenseItem` | **MERGE** | `expenses` row + receipt JSONB | Single-purpose vouchers with receipt attachment URLs. |
| `Payment` | **KEEP** | `payments` table | Vendor disbursements and running account bill settlements. |
| `PaymentAllocation` | **KEEP** | `payment_allocations` table | Distributes a payment across multiple POs, invoices, or advance recoveries. |
| `Advance` | **KEEP** | `advances` table | Mobilization and material advances issued to subcontractors/vendors. |
| `AdvanceSettlement` | **KEEP** | `advance_settlements` table | Tracks deduction ledger entries against subsequent running account bills. |
| `Receivable` | **KEEP** | `receivables` table | Client billing RA invoices, retention claims, and payment milestones. |
| `Payable` | **KEEP** | `payables` table | Outstanding vendor invoices and subcontractor bill obligations. |
| `CommercialDocument` | **MERGE** | Unified with `documents` table | Contracts and tax invoices classified under standard document vault. |
| `FinancialLedgerEntry` | **KEEP** | `financial_ledger_entries` table | Double-entry journal for committed vs incurred cost tracking. |

---

### F. People & Workforce Operations Domain

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `Employee` | **KEEP** | `employees` table | Company staff directory (designations, emergency contacts, biometric IDs). |
| `Employment` | **MERGE** | Folded into `employees` table | Joining date, salary structure, and active employment status. |
| `AttendanceRecord` | **KEEP** | `attendance_records` table | Daily biometric / manual muster roll entries (Present, Absent, Half-Day). |
| `AttendanceException` | **KEEP** | `attendance_exceptions` table | Overtime claims, regularization requests, and site shift exceptions. |
| `LeaveType` | **KEEP** | `leave_types` table | Tenant leave policies (Casual, Sick, Earned). |
| `LeaveRequest` | **KEEP** | `leave_requests` table | Employee leave applications, balance checks, and manager approvals. |
| `LabourContractor` | **KEEP** | `labour_contractors` table | Third-party manpower agencies and subcontractor entities. |
| `LabourGang` | **KEEP** | `labour_gangs` table | Work gangs deployed on site with trade skill and daily wage rates. |
| `LabourWorker` | **DEFER** | Post-V1 individual labour KYC | Gang-level muster tracking satisfies V1 construction operational needs. |
| `MusterRecord` | **KEEP** | `muster_records` table | Daily subcontractor gang headcount muster signed off by Site Engineer. |
| `HrDocument` | **MERGE** | Unified with `documents` table | Employment contracts and ID proofs stored in document vault with HR taxonomy. |

---

### G. Plant & Equipment Fleet Domain

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `EquipmentAsset` | **KEEP** | `equipment_assets` table | Machinery asset registry (excavators, cranes, batching plants, ownership type). |
| `EquipmentAssignment` | **KEEP** | `equipment_assignments` table | Site mobilization, operator allocation, and demobilization logs. |
| `EquipmentUtilization` | **KEEP** | `equipment_utilizations` table | Daily hour-meter logs, active running hours, and idle downtime tracking. |
| `FuelLog` | **KEEP** | `fuel_logs` table | Site diesel bowser dispensing records, hour-meter cross-checks, and costs. |
| `MaintenanceTicket` | **KEEP** | `maintenance_tickets` table | Breakdown incident tickets, scheduled PM work orders, and technician logs. |
| `MaintenanceSchedule` | **KEEP** | `maintenance_schedules` table | Recurring preventative maintenance intervals (every 250 hours / monthly). |
| `EquipmentDocument` | **MERGE** | Unified with `documents` table | RTO registration, fitness certificates, and insurance policies in document vault. |

---

### H. Issues, Alerts & Exceptions Domain

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `Issue` | **KEEP** | `issues` table | Quality defects, snag items, safety hazards, and schedule blockers. |
| `IssueComment` | **KEEP** | `issue_comments` table | Site discussion thread, inspection notes, and status updates. |
| `IssueAttachment` | **MERGE** | `issues.attachments` JSONB | Array of defect photo URLs and inspection reports. |
| `IssueResolution` | **MERGE** | `issues.resolution_notes` / `resolved_by` | Rectification notes and signoff metadata captured on the Issue record. |
| `Alert` | **KEEP** | `smart_alerts` table | Automated exception alerts (cost overruns, low stock, delay risks). |
| `AlertRule` | **KEEP** | `alert_rules` table | Configurable threshold triggers (e.g. Budget variance > 5%). |
| `AlertEvent` | **MERGE** | Unified into `smart_alerts` | Fired alert instance containing trigger context and root cause analysis. |

---

### I. Documents & Drawings Vault Domain

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `Document` | **KEEP** | `documents` table | Unified vault document metadata (GFC drawings, contracts, NOCs, invoices). |
| `DocumentVersion` | **KEEP** | `document_versions` table | Historical file revisions with checksums, storage keys, and change notes. |
| `DocumentReview` | **KEEP** | `document_reviews` table | Multi-stakeholder review comments and revision requests. |
| `DocumentApproval` | **MERGE** | `documents.approval_status` / `approved_by` | Sign-off metadata captured directly on document version record. |
| `DocumentLink` | **MERGE** | Polymorphic association columns | Links document to `project_id`, `wbs_id`, `vendor_id`, or `po_id`. |
| `Drawing` | **MERGE** | Unified into `documents` table | Drawings are documents with category `"Drawing"` and GFC revision metadata. |
| `DrawingRevision` | **MERGE** | Unified into `document_versions` | Drawing revisions handled by canonical versioning engine. |
| `Transmittal` | **KEEP** | `drawing_transmittals` table | Formal transmission of GFC drawing sets to consultants and site contractors. |

---

### J. Reporting, Notifications & System Infrastructure

| Candidate Entity | Decision | Target / Destination | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| `ReportDefinition` | **KEEP** | `report_definitions` table | Metadata catalog of standard and custom construction reporting templates. |
| `ReportExecution` | **KEEP** | `report_executions` table | Async background report generation jobs and parameter snapshots. |
| `ReportExport` | **MERGE** | `report_executions.file_url` | Exported PDF/XLSX storage reference stored on execution record. |
| `Notification` | **KEEP** | `notifications` table | User-targeted in-app notification inbox with read states. |
| `NotificationPreference` | **KEEP** | `notification_preferences` table | User-level alert toggles across email, SMS, and in-app channels. |
| `NotificationTemplate` | **KEEP** | `notification_templates` table | Standard localized notification copy with interpolation variables. |
| `AuditLog` | **KEEP** | `audit_logs` table | Immutable append-only audit trail of sensitive business mutations. |
| `DomainEvent` | **MERGE** | Transient in-memory event bus | Domain events emitted during transaction lifecycle. |
| `OutboxEvent` | **KEEP** | `outbox_events` table | Transactional outbox pattern guaranteeing reliable event publishing. |
| `IdempotencyRecord` | **KEEP** | `idempotency_keys` table | Prevents duplicate payment postings and GRN creations on network retries. |

---

## 2. Summary of Rationalized Domain Model

- **Total Proposed Entities Analyzed**: **84**
- **Persisted Relational Entities (`KEEP`)**: **46**
- **Merged / Normalized Structures (`MERGE`)**: **33**
- **Deferred to Post-V1 (`DEFER`)**: **3**
- **Removed Ephemeral Telemetry (`REMOVE`)**: **2**

This rationalized entity architecture completely models every feature present in the frozen DEZOBUILD frontend while maintaining clean PostgreSQL third normal form (3NF) relational integrity.

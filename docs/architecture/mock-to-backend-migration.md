    # DEZOBUILD — Mock Store to PostgreSQL Backend Migration Blueprint

    **Phase**: Backend Architecture Definition  
    **Mode**: Forensic Data Migration & Schema Mapping  
    **Status**: Authoritative Blueprint (Pre-Implementation Gate)  

    ---

    ## 1. Forensic Mock Store Migration Matrix

    The current frontend relies on an in-memory client-side reactive store (`useMockStore` / `mockStore`). This matrix details the exact transformation required to migrate each in-memory entity to its production PostgreSQL schema, Prisma model, and REST API endpoint.

    ```text
    COMPLEXITY RATINGS:
    • LOW: Direct 1-to-1 table attribute mapping.
    • MEDIUM: Denormalization split into parent-child tables (e.g. Indent → Indent + IndentItems).
    • HIGH: Multi-table relational split, double-entry ledger calculation, or transaction locks.
    ```

    | Mock Store Entity | Target Backend Entity | Backend REST API | Database Concept | Tenant Scope | Migration Complexity | Required Transformations & Invariant Enforcements |
    | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
    | **`Project`** | `Project`, `ProjectSite` | `GET/POST /api/v1/projects` | `projects` table | YES | **MEDIUM** | Split embedded `team` array into `project_assignments` join records. Replace computed `actualCost`, `progress` with dynamic ledger aggregates. |
    | **`WbsActivity`** | `WbsActivity` | `GET/POST /api/v1/projects/:id/wbs` | `wbs_activities` table | YES | **LOW** | Preserve `parentId` recursive tree. Replace string dates with standard SQL `DATE` types. Enforce `CHECK (planned_qty >= 0)`. |
    | **`DprRecord`** | `Dpr`, `DprItem` | `GET/POST /api/v1/projects/:id/dprs` | `daily_progress_reports` + `dpr_items` | YES | **HIGH** | Normalize embedded arrays (`manpower`, `equipment`, `progressItems`, `photos`) into discrete relational tables with foreign keys. |
    | **`MaterialItem`** | `Material` | `GET/POST /api/v1/materials` | `materials` table | YES | **LOW** | Direct column mapping (`name`, `category`, `unit`, `unitRate`). Move `currentStock` from raw column to dynamic `inventory_balances` table. |
    | **`MaterialRequirement`**| `MaterialRequirement` | `GET /api/v1/material-requirements` | `material_requirements` | YES | **LOW** | Map project-specific BOQ material allocation. |
    | **`Indent`** | `Indent`, `IndentItem` | `GET/POST /api/v1/indents` | `indents` + `indent_items` | YES | **MEDIUM** | Split single material fields into multi-item child table `indent_items` allowing multi-line requisitions. |
    | **`PurchaseOrder`** | `PurchaseOrder`, `PurchaseOrderItem` | `GET/POST /api/v1/purchase-orders` | `purchase_orders` + line items | YES | **HIGH** | Normalize line items. Enforce unique composite key `(company_id, code)`. Connect to budget commitment ledger trigger. |
    | **`GoodsReceiptNote`** | `Grn`, `GrnItem` | `GET/POST /api/v1/grns` | `goods_receipt_notes` + items | YES | **HIGH** | Separate gate record from inspection line items. Implement atomic stock ledger debit trigger on status promotion to `APPROVED`. |
    | **`MaterialIssueRecord`**| `MaterialIssue`, `StockLedger` | `POST /api/v1/materials/issues` | `material_issues` + `stock_ledger_entries` | YES | **HIGH** | Replace simple in-memory count subtraction with atomic transaction: insert issue record + write stock ledger debit entry. |
    | **`StockTransferRecord`**| `StockTransfer` | `POST /api/v1/materials/transfers` | `stock_transfers` | YES | **HIGH** | Implement dual-site state machine: outward stock debit on dispatch + in-transit flag + inward credit on gate verification. |
    | **`ExpenseRecord`** | `Expense` | `GET/POST /api/v1/expenses` | `expenses` table | YES | **MEDIUM** | Map receipt attachment URL. Replace simple status flag with formal state machine (`SUBMITTED` → `APPROVED` → `PAID`). |
    | **`PaymentRecord`** | `Payment`, `PaymentAllocation` | `GET/POST /api/v1/payments` | `payments` + allocations | YES | **HIGH** | Normalize payment allocations across multiple POs/invoices. Enforce mandatory `Idempotency-Key` header on all postings. |
    | **`AdvanceRecord`** | `Advance`, `AdvanceSettlement` | `GET/POST /api/v1/advances` | `advances` + `advance_settlements` | YES | **MEDIUM** | Connect advance recovery percentage trigger to deduction engine on subsequent running account bill approvals. |
    | **`Employee`** | `Employee` | `GET/POST /api/v1/employees` | `employees` table | YES | **LOW** | Store phone, designation, emergency contacts. Optional link to `users.id` for staff who require system login accounts. |
    | **`AttendanceEntry`** | `AttendanceRecord` | `POST /api/v1/attendance` | `attendance_records` | YES | **MEDIUM** | Convert UI toggle matrix into daily bulk upsert `INSERT ... ON CONFLICT (company_id, employee_id, muster_date) DO UPDATE`. |
    | **`LabourContractor`** | `LabourContractor` | `GET/POST /api/v1/labour/contractors` | `labour_contractors` | YES | **LOW** | Supplier KYC data (trade, agency registration, compliance certificates). |
    | **`LabourGang`** | `LabourGang` | `GET/POST /api/v1/labour/gangs` | `labour_gangs` | YES | **LOW** | Map gang strength, skill trade, assigned contractor agency, and daily wage benchmarks. |
    | **`MusterRecord`** | `MusterRecord` | `POST /api/v1/labour/muster` | `muster_records` | YES | **MEDIUM** | Record daily contractor gang headcount muster signed off by site engineer. |
    | **`EquipmentAsset`** | `EquipmentAsset` | `GET/POST /api/v1/equipment` | `equipment_assets` | YES | **LOW** | Machinery asset code, ownership model (owned vs rented), hourly rate benchmarks, active site deployment. |
    | **`FuelLog`** | `FuelLog` | `POST /api/v1/equipment/fuel` | `fuel_logs` | YES | **LOW** | Record diesel dispensing liters, unit rate, hour-meter reading, and bowser dispenser signature. |
    | **`MaintenanceRecord`** | `MaintenanceTicket` | `POST /api/v1/equipment/maintenance` | `maintenance_tickets` | YES | **MEDIUM** | Map breakdown tickets, downtime hours, technician notes, and estimated vs actual repair expenditure. |
    | **`SmartAlert`** | `SmartAlert` | `GET /api/v1/alerts` | `smart_alerts` | YES | **MEDIUM** | Replace hardcoded mock risk list with automated asynchronous alert engine driven by database threshold triggers. |
    | **`DocumentItem`** | `Document`, `DocumentVersion` | `GET/POST /api/v1/documents` | `documents` + `document_versions` | YES | **HIGH** | Replace flat string URLs with versioned document engine: metadata in PostgreSQL, binary blobs in private cloud object storage. |
    | **`CompanySettings`** | `Tenant` | `GET/PUT /api/v1/settings/company` | `tenants` table | YES | **LOW** | Map legal entity name, GSTIN, PAN, CIN, official email, phone, registered office address. |
    | **`RolePermissionMapping`**| `Role`, `Permission`, `RolePermission` | `GET /api/v1/settings/roles-matrix` | `roles` + `role_permissions` | YES | **MEDIUM** | Replace frontend hardcoded boolean map with dynamic relational RBAC policy evaluation. |

    ---

    ## 2. Anti-Patterns in Mock Store (DO NOT Copy Directly to Production)

    1. **Denormalized Embedded Progress Arrays**: In the mock store, `DprRecord` embeds `manpower`, `equipment`, and `progressItems` in a single JSON object. In production, these must be normalized into discrete relational child tables to allow cross-project analytics and SQL aggregation.
    2. **Direct Arithmetic Mutations**: In the mock store, inventory issues execute `material.currentStock -= qty`. In production, this is strictly forbidden; stock mutations must occur exclusively via immutable `stock_ledger_entries`.
    3. **Hardcoded User Persona Switching**: In the mock store, changing the role switcher simply swaps local state without server token exchange. In production, role switching requires calling `POST /api/v1/auth/switch-role` with cryptographic session re-issuance.
    4. **Client-Generated IDs**: In the mock store, IDs are generated via `Math.random()` or client prefixes. In production, all entity primary keys are generated server-side using cryptographically secure UUIDv7 or prefixed KSUIDs (e.g. `prj_...`, `po_...`).

# DEZOBUILD — Architecture Decisions (ADRs) & Open Questions (v1)

```text
================================================================================
Document ID     : ARCH-DEZ-012
Milestone       : BACKEND ARCHITECTURE BASELINE v1
Status          : AUTHORITATIVE BASELINE — FROZEN FOR IMPLEMENTATION
Scope           : Architectural Decision Records, Open Questions & Roadmap
================================================================================
```

---

## 1. Architectural Decision Records (ADRs)

### ADR-001: Tenancy Hierarchy & Multi-Tenant Column-Level Isolation
* **Context**: Construction enterprises often have multiple legal entities (companies with distinct PAN/CIN), regional branches with state GSTINs, and geographically dispersed project sites.
* **Decision**: Adopt a single unified SaaS tenancy root (`tenant_id` on all tenant-scoped database tables). Model `Company` (legal entity), `Branch` (regional/state hub), `Project` (commercial contract), and `Site` (physical store/location) as strongly typed hierarchical entities under the tenant.
* **Alternatives Considered**: Database-per-tenant, Schema-per-tenant. Rejected due to high migration overhead, connection pooling saturation, and cross-project analytics complexity.
* **Consequences**: Every SQL query must pass through a strict tenant filter. Row-level security (RLS) or Prisma client extensions will enforce this at runtime.

---

### ADR-002: Server-Authoritative RBAC & Decoupled JWT Claims
* **Context**: Fast-paced construction sites have frequent role reassignments, user offboardings, and project transfer orders. Relying on static JWT claims can lead to authorization bypasses until token expiration.
* **Decision**: Treat JWT claims strictly as ephemeral routing hints. The backend validates real-time user status, session version, role assignments, permissions, and project scopes on every protected mutation.
* **Alternatives Considered**: Heavy JWT with all embedded permissions. Rejected due to stale permissions, token size bloat, and inability to immediately revoke access upon role change.
* **Consequences**: Fast session lookup required (PostgreSQL indexed query or Redis cache in V2). Guarantees zero authorization lag upon user termination.

---

### ADR-003: Subscription Entitlements & Capacity Limits
* **Context**: DEZOBUILD offers Starter, Professional, and Enterprise plans with strict capacity constraints (e.g. Starter = 2 active projects).
* **Decision**: Decouple the global `PlatformPlan` catalog from `TenantSubscription`. Enforce active project limits and feature flags strictly on backend API mutations (`409 Conflict` on capacity breach, `403 Forbidden` on feature lack).
* **Alternatives Considered**: Client-side UI route guards only. Rejected as frontend hiding is not security.
* **Consequences**: Guarantees SaaS monetization integrity regardless of client implementation.

---

### ADR-004: Dual-Entry Physical Stock Ledger vs Financial Accounting
* **Context**: Construction materials must be tracked with physical precision at warehouse bins and site storage yards without waiting for commercial invoice reconciliations.
* **Decision**: Implement an immutable, dual-entry physical `StockLedger` ($+ / -$ quantities at physical store locations). Decouple physical inventory from financial general ledger accounting postings.
* **Alternatives Considered**: Direct single-value quantity updates without audit ledgers, or coupling physical GRN directly to general ledger journal entries. Rejected due to stock tampering vulnerability and vendor billing delays.
* **Consequences**: Physical stock balances (`StockBalance`) can be rebuilt and verified at any point in time by replaying `StockLedger` transactions.

---

### ADR-005: Multi-Stage Financial Workflow Separation
* **Context**: Construction commercial lifecycles involve multiple verification gates: Indents, POs, GRNs, Invoices, RA Bills, Deductions, and Disbursements.
* **Decision**: Enforce strict separation: $\text{GRN} \neq \text{Invoice} \neq \text{Payable} \neq \text{Payment}$ and $\text{Approved} \neq \text{Paid}$.
* **Alternatives Considered**: Auto-generating payment vouchers upon GRN verification. Rejected due to severe commercial risk and lack of 3-way invoice matching.
* **Consequences**: Payout disbursement requires an explicit, audited `POST /api/v1/payments/disburse` mutation with idempotency protection.

---

### ADR-006: Policy-Driven Approval Engine & Segregation of Duties
* **Context**: High-value construction procurement and payouts present fraud risks if creators can approve their own submissions.
* **Decision**: Implement a dynamic, multi-stage approval engine (`ApprovalRule`, `ApprovalStage`, `ApprovalRequest`) with mandatory Segregation of Duties (`Creator != Approver`). Thresholds are configurable policies, not hardcoded constants.
* **Alternatives Considered**: Hardcoded role checks in controllers. Rejected due to lack of enterprise flexibility across small vs large builders.
* **Consequences**: Clean separation of approval logic from core entity controllers.

---

### ADR-007: Transactional Outbox Pattern for Async Messaging
* **Context**: Operations such as PO issuance, DPR approval, or emergency safety logging require downstream notifications, webhooks, and alert evaluations.
* **Decision**: Persist an `OutboxEvent` within the same ACID database transaction as the aggregate state change. A background Outbox Relay worker polls using `SELECT ... FOR UPDATE SKIP LOCKED` and dispatches events with exponential backoff retries.
* **Alternatives Considered**: In-process synchronous webhook calls, or publishing to message broker without database commit. Rejected due to dual-write failures and lost messages on network dropouts.
* **Consequences**: Guaranteed at-least-once delivery for all critical external communications.

---

### ADR-008: Object Storage Pre-Signed Metadata Architecture
* **Context**: Large drawings and high-resolution site photos would saturate application server CPU and RAM if streamed through Node.js endpoints.
* **Decision**: Use S3-compatible object storage with direct pre-signed `PUT` (upload, 10m exp) and pre-signed `GET` (download, 5m exp) URLs. The database stores strictly strongly-typed metadata, checksums, and tenant-scoped keys.
* **Alternatives Considered**: Multipart file uploads to backend disk/memory. Rejected due to memory exhaustion and vertical scaling bottlenecks.
* **Consequences**: Application server remains lightweight, stateless, and horizontally scalable.

---

### ADR-009: Explicit Workflow Mutation API Endpoints
* **Context**: Transitioning complex states (e.g. certifying an RA bill, approving a pour card, verifying a GRN) involves distinct validation and side effects.
* **Decision**: Prefer explicit command endpoints (e.g. `POST /api/v1/contractor-ra-bills/:id/verify`, `POST /api/v1/pour-cards/:id/approve`) over generic `PATCH /resource { status: "approved" }`.
* **Alternatives Considered**: Generic PATCH endpoints with status payloads. Rejected due to ambiguous authorization checks and muddy audit trails.
* **Consequences**: Clean, self-documenting REST APIs with explicit permission bindings.

---

### ADR-010: First-Class StockTransferItem Child Line Items
* **Context**: Inter-site material transfers frequently involve multiple items (e.g., 50 bags cement + 2 tons steel rebar in a single truck dispatch).
* **Decision**: Model `StockTransferItem` as a first-class child relational entity of `StockTransfer` rather than an unindexed JSON blob.
* **Alternatives Considered**: Storing items in a JSON array column. Rejected due to lack of foreign key referential integrity with `materials` and inability to run SQL stock ledger audits.
* **Consequences**: Full referential integrity and granular line-item tracking during transit.

---

### ADR-011: Asynchronous ReportExecution Architecture
* **Context**: Multi-year project variance summaries, cash burn curves, and multi-shift DPR archives generate large PDF/XLSX bundles that exceed synchronous HTTP request timeouts.
* **Decision**: Model `ReportExecution` as a first-class entity. Clients request generation (`POST /api/v1/reports/executions`), receive an execution UUID, poll status (`QUEUED -> PROCESSING -> COMPLETED`), and download the result via pre-signed S3 URL.
* **Alternatives Considered**: Synchronous HTTP stream generation. Rejected due to gateway 30s timeouts and thread blocking.
* **Consequences**: Responsive UI with progress indicators and durable report history.

---

### ADR-012: Tenant-Scoped Department Master Entity
* **Context**: Different construction enterprises organize internal divisions differently (e.g. Civil, Structural, MEP, P&M, Safety, Quality, Billing, Liasoning).
* **Decision**: Create a configurable, tenant-scoped `Department` entity linked to `Employee` records.
* **Alternatives Considered**: Hardcoded enum. Rejected due to enterprise customization requirements.
* **Consequences**: Tenants can customize department hierarchies to match their corporate structure.

---

### ADR-013: Optional 1:0..1 Relationship for User <-> Employee
* **Context**: Many on-site employees or subcontractor supervisors are tracked for biometric attendance and wage muster without requiring SaaS login credentials. Conversely, external auditors or client representatives require login access without being HR employees.
* **Decision**: Establish an optional $1:0..1$ foreign key relationship (`User.employeeId -> Employee.id?`).
* **Alternatives Considered**: Mandatory 1:1 coupling. Rejected because forcing a user account for every site labourer or creating dummy employee profiles for corporate auditors violates domain reality.
* **Consequences**: Maximum operational flexibility across HR and IAM domains.

---

### ADR-014: Tenant Provisioning Platform Security Boundary
* **Context**: In multi-tenant SaaS, tenant workspace provisioning is a platform-governance privilege (`owner.dezobuild.com` / `SUPER_ADMIN`), not a capability of regular customer users within an existing tenant.
* **Decision**: Strictly protect `POST /api/v1/tenants` with a platform provisioning gate. Ordinary customer users with a valid tenant context are rejected with `403 Forbidden`. Only platform administrative contexts (`SUPER_ADMIN`, platform bootstrapping) can provision new root tenants via HTTP.
* **Alternatives Considered**: Permitting any authenticated customer to create arbitrary tenants. Rejected as an architectural defect and security vulnerability.
* **Consequences**: Guarantees strict boundary separation between platform governance and tenant customer workspaces.

---

### ADR-015: Foreign Key Deletion and Hierarchy Archive Policy
* **Context**: Construction enterprises manage mission-critical audit trails (commercial contracts, tax records, project progress, ledger logs).
* **Decision**: Primary business structural anchors (`User`, `Company`, `Branch`) use `onDelete: RESTRICT` against `Tenant`. `Company` uses `onDelete: RESTRICT` against `Branch`. Lookup taxonomies (`Department`) cascade if a tenant is decommissioned, but root hard-deletion is blocked while business anchors exist. Tenant decommission is executed via soft-delete (`deletedAt`, `status: "SUSPENDED"`).
* **Alternatives Considered**: Cascading deletions across all entities. Rejected due to catastrophic accidental data loss risk.
* **Consequences**: Consistent, safe hierarchy preservation with zero risk of accidental tenant data destruction.

---

### ADR-016: Read-Only Inventory Availability & Allocation Intelligence Layer
* **Context**: Inventory intelligence (real-time availability, cross-store positions, project supply visibility, in-transit transfers, pending POs, central warehouse allocations, shortage detection) requires multi-dimensional synthesis across distinct operational entities without mutating ledger state.
* **Decision**: Implement Phase 07.10 as a strictly **read-only decision-support intelligence layer**.
  - No new database tables, no migrations, no caching (Redis/materialized views), and zero background schedulers.
  - Authoritative balance source remains `StoreStockBalance` (`quantityOnHand`, `reservedQuantity`).
  - No `StockMovement` creation and zero mutations to any ledger, reservation, transfer, or procurement entity.
  - Strict mathematical separation between physical site stock and central warehouse project allocations.
  - Clear separation between unfulfilled open demand and incoming supply pipelines (transfers + POs) to eliminate double-counting.
* **Alternatives Considered**: Materialized projection tables, Redis caches, or write-time aggregation triggers. Rejected due to cache invalidation complexity, concurrency drift risks, and unnecessary write overhead.
* **Consequences**: Deterministic, real-time auditable availability intelligence with zero risk of stock drift or ledger mutation.

---

### ADR-017: BOQ Contract Hierarchy, Digital Measurement Book (MB) Lifecycle & Pessimistic Locking
* **Context**: Construction commercial scope is defined in Bill of Quantities (BOQ), while physical work executed on site is certified through Digital Measurement Books (MB). Ensuring auditability, race-free cumulative certified quantities, segregation of duties (SoD), and non-destructive corrections without mutating historical records is paramount.
* **Decision**: Implement Phase 07 as an ACID-compliant commercial measurement engine:
  - **Data Models**: `BoqItem`, `DigitalMbRecord`, `MeasurementDimension`, and `DigitalMbSequence`.
  - **Decimal Arithmetic**: All monetary amounts (`totalAmount = quantity * unitRate`) and dimensional calculations (Volume, Area, Length, Count, Direct Quantity) are computed strictly with `Prisma.Decimal` and `ROUND_HALF_UP` to 2 decimal places. JS floating point is strictly forbidden.
  - **Pessimistic Locking Cumulative Cache**: Measurement approval executes inside an ACID transaction with `SELECT ... FOR UPDATE` on `BoqItem`. `BoqItem.executedQuantity` is updated atomically from `previousCumulativeQuantity + currentQuantity`.
  - **Segregation of Duties (SoD)**: The creator of an MB cannot verify or approve their own measurement (`createdById !== verifiedById`, `createdById !== approvedById`, `submittedById !== approvedById`).
  - **Controlled Excess Execution**: If cumulative quantity exceeds contracted BOQ quantity (`cumulativeQuantity > boqItem.quantity`), approval requires explicit `allowExcess = true` and `excessJustification` ($\ge 10$ chars) authorized by managerial roles (`PROJECT_MANAGER`, `COMPANY_ADMIN`, `COMPANY_OWNER`).
  - **Compensating Corrections**: Approved MB records are strictly immutable. Adjustments are recorded as new `DigitalMbRecord` entries with `isCorrection = true` and `supersedesMbRecordId`, following the full DRAFT $\rightarrow$ SUBMITTED $\rightarrow$ VERIFIED $\rightarrow$ APPROVED lifecycle.
  - **Phase 10 Read-Only Billing Interface**: Expose `BoqBillingPositionDto` (contract amount, certified amount, remaining quantity, completion percentage) without mutating financial ledgers.
* **Alternatives Considered**: In-memory running totals, auto-updating approved records, or trusting client-supplied total amounts. Rejected due to audit trail corruption and race condition vulnerabilities.
* **Consequences**: Strict mathematical and legal auditability for contractor measurement and certification.

---

## 2. Classified Open Questions Catalog

```text
+-------------------------------------------------------------------------------+
| Category      | Meaning & Action Policy                                       |
|---------------+---------------------------------------------------------------|
| BLOCKING      | Must be resolved prior to Phase 1-3 implementation.           |
| NON-BLOCKING  | Implementation can proceed with baseline architectural default.|
| FUTURE        | V2 / Enterprise Expansion roadmap item.                       |
+-------------------------------------------------------------------------------+
```

### 2.1 Blocking Questions (Resolve Prior to Implementation)

| ID | Topic | Description & Options | Proposed Architectural Default |
| :--- | :--- | :--- | :--- |
| **Q-BLK-01** | **Multi-Company Financial Consolidation** | When multiple legal companies exist under a tenant, can projects be shared across companies, or is a project strictly bound to exactly 1 Company? | **Default**: Every `Project` belongs to exactly **1 Company** (`company_id NOT NULL`) for clear legal liability and statutory billing. |
| **Q-BLK-02** | **Session Revocation Store** | Should session revocation in Phase 1 rely strictly on PostgreSQL query lookups, or is Redis required immediately? | **Default**: Use PostgreSQL indexed query (`idx_sessions_lookup`) for V1 baseline simplicity. Add Redis caching in Phase 16 if latency $> 10\text{ms}$. |
| **Q-BLK-03** | **Default GSTIN Validation Rule** | Should the backend enforce strict Indian GSTIN format regex (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`) on all company/vendor masters? | **Default**: Enforce standard 15-character GSTIN regex with optional override flag for international entities. |

---

### 2.2 Non-Blocking Questions (Can Proceed with Defaults)

| ID | Topic | Description & Options | Architectural Default |
| :--- | :--- | :--- | :--- |
| **Q-NBLK-01**| **Negative Inventory Policy** | Under what circumstances (if any) can a store issue materials if `currentStock < requestedQty`? | **Default**: Strictly reject negative inventory with `409 Conflict`. Emergency override requires `COMPANY_OWNER` digital sign-off. |
| **Q-NBLK-02**| **Retention Release Timeline** | Are retention funds held per RA bill or pooled at the contract level? | **Default**: Tracked per RA bill, aggregated in contract `retentionHeld`, and released via `FinalBillSettlement`. |
| **Q-NBLK-03**| **Biometric Punch Deduplication** | What is the sliding window for discarding duplicate biometric turnstile punches from the same device? | **Default**: 5-minute deduplication window per worker ID per device. |
| **Q-NBLK-04**| **Outbox Relay Polling Interval**| What is the polling frequency for the background outbox worker? | **Default**: Poll every 1,000ms with `FOR UPDATE SKIP LOCKED`. |

---

### 2.3 Future Roadmap Questions (V2 Expansion)

| ID | Topic | Future Roadmap Consideration |
| :--- | :--- | :--- |
| **Q-FUT-01** | **Multi-Currency Conversion** | Support for cross-border projects with real-time forex exchange rates. |
| **Q-FUT-02** | **BIM 3D Model Viewer** | Direct integration with Autodesk Forge / open-source IFC 3D viewers. |
| **Q-FUT-03** | **Hardware IoT Fuel Sensors** | Direct LoRaWAN / CAN-bus telematics ingestion from excavator fuel tanks. |
| **Q-FUT-04** | **Custom Tenant RLS Policies**| Migration to PostgreSQL native Row-Level Security (RLS) for multi-tenant database partitioning. |

---

## 3. Phased Implementation Roadmap (Phases 1 to 17)

```mermaid
gantt
    title DEZOBUILD Backend Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Foundation & Auth
    Phase 01: Core Framework, Config & Error Contract :2026-04-01, 7d
    Phase 02: Identity, Sessions & Auth Lifecycle     :2026-04-08, 7d
    Phase 03: Tenancy, Company & Branch Masters       :2026-04-15, 5d
    Phase 04: RBAC & Project Scoping Engine           :2026-04-20, 5d
    section Core Operations
    Phase 05: Subscriptions & Entitlements            :2026-04-25, 4d
    Phase 06: Projects, WBS & DPR Progress            :2026-04-29, 8d
    Phase 07: BOQ & Digital Measurement Book (MB)     :2026-05-07, 6d
    Phase 08: Materials, Procurement & 3-Way GRN      :2026-05-13, 8d
    Phase 09: Stores, Inventory & Stock Ledgers       :2026-05-21, 7d
    section Commercial & Governance
    Phase 10: Finance, Petty Cash & Contractor RA Bills:2026-05-28, 8d
    Phase 11: People, Biometrics & Muster             :2026-06-05, 6d
    Phase 12: Fleet Equipment & Fuel Telematics       :2026-06-11, 5d
    Phase 13: Quality (Pour Cards, NCR) & Safety EHS  :2026-06-16, 6d
    Phase 14: Documents, GFC Drawings & RFIs          :2026-06-22, 5d
    Phase 15: Policy-Driven Approval Engine           :2026-06-27, 5d
    section Event & Integrations
    Phase 16: Alerts, Outbox Relay & Reports          :2026-07-02, 7d
    Phase 17: External Adapters (ERP, Razorpay, AI)   :2026-07-09, 8d
```

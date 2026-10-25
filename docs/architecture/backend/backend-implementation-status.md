# DEZOBUILD — Backend Implementation Status Tracking (v1)

```text
================================================================================
Document ID     : STATUS-DEZ-001
Current Phase   : PHASE 04 — RBAC + PERMISSIONS + PROJECT / STORE SCOPE (COMPLETE)
Status          : PHASE 04 PASSED — READY FOR PHASE 05
Last Verified   : 2026-09-10
================================================================================
```

---

## 1. Implementation Milestone Status

| Phase # | Phase Title | Status | Completion Date | Scope Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 01** | **Core Foundation** | **PASS (100%)** | 2026-03-09 | Validated config, DB service boundary, RequestContext, Structured Logger, RFC 7807 Errors, Zod Validator, CORS, `/api/v1` Router, Health endpoints & Test Suite. |
| **Phase 02** | **Identity & Authentication** | **PASS (100%)** | 2026-09-10 | User persistence model, scrypt/bcrypt password hashing, login/refresh/logout, JWT access tokens (15m), rotating SHA-256 refresh tokens (7d), HttpOnly Secure cookies, authentication guard, session revocation & versioning, sliding window rate limiter, audit events. |
| **Phase 03** | **Tenancy & Enterprise Masters** | **PASS (100%)** | 2026-09-10 | Tenant, Company, Branch, Department models & multi-tenant isolation, hierarchy validation, IDOR protection, repository tenant scoping. |
| **Phase 04** | **RBAC & Scoping Engine** | **PASS (100%)** | 2026-09-10 | Authoritative 9 customer roles, 54 canonical permissions (domain:entity:action), live DB authority resolution, privilege escalation prevention, ProjectMember & StoreAccessAssignment scoping. |
| **Phase 05** | **Subscriptions & Entitlements** | PENDING | — | Plan catalog, tenant subscriptions, project capacity limit enforcement. |
| **Phase 06** | **Projects, WBS & DPR Progress** | **PASS (100%)** | 2026-09-10 | Project portfolio, WBS tree, daily shift progress reporting. |
| **Phase 07** | **BOQ & Measurement Book (MB)** | **IMPLEMENTED** | 2026-09-11 | BOQ hierarchy, UOM math, Digital MB lifecycle, SoD, pessimistic locking cumulative cache, excess authorization, compensating corrections, Phase 10 billing positions. |
| **Phase 08** | **Materials, PO & 3-Way GRN** | PENDING | — | Site indents, PO lifecycle, 3-way match Goods Receipt Notes. |
| **Phase 09** | **Stores & Physical Stock Ledgers**| PENDING | — | Store bin balances, immutable dual-entry stock ledger, material issues. |
| **Phase 10** | **Finance & Contractor RA Bills** | PENDING | — | Petty cash expenses, subcontractor RA bills, statutory tax math, payment disbursement. |
| **Phase 11** | **People, Muster & Biometrics** | PENDING | — | Employee roster, trade gangs, biometric turnstile punch reconciliations. |
| **Phase 12** | **Equipment & Fuel Telematics** | PENDING | — | Machinery asset master, hour meters, fuel logs, maintenance tickets. |
| **Phase 13** | **Quality (Pour Cards) & Safety** | PENDING | — | 5-point concrete pour cards, QA/QC NCR workflows, safety incident logs. |
| **Phase 14** | **Documents, Drawings & RFIs** | PENDING | — | GFC drawing versioning, supersede locks, technical engineering RFIs. |
| **Phase 15** | **Policy-Driven Approval Engine** | PENDING | — | Dynamic multi-stage approval routing, segregation of duties. |
| **Phase 16** | **Alerts, Outbox Relay & Reports** | PENDING | — | Anomaly detection engine, transactional outbox worker, async ReportExecution. |
| **Phase 17** | **External Adapters & AI Forecast**| PENDING | — | Tally/SAP ERP sync, RazorpayX payouts, WhatsApp notifications, AI forecasting. |

---

## 2. Phase 01 Detailed Audit

### 2.1 Implemented Components:
* **Validated Configuration (`src/config/`)**: Zod-based environment validation schema (`env.schema.ts`) and centralized config loader (`app.config.ts`) covering APP, DATABASE, CORS, LOGGING, SECURITY placeholders, STORAGE placeholders, and OUTBOX placeholders. Includes strict production guards (prohibiting wildcard CORS and default credentials in production).
* **Database Service Boundary (`src/database/`)**: Lifecycle management (`connect()`, `disconnect()`), connection error logging, and latency health check telemetry (`getStatus()`).
* **Request Context (`src/common/context/`)**: Node.js `AsyncLocalStorage`-backed `RequestContext` capturing `requestId`, `correlationId`, `startTime`, and trace data.
* **Structured Application Logger (`src/common/logging/`)**: JSON/Pretty format logger with automatic sensitive field masking (`password`, `token`, `secret`, `cookie`, `apiKey`).
* **Global RFC 7807 Error Contract (`src/common/errors/`)**: Comprehensive `AppError` hierarchy (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`, `RateLimitError`, `InternalServerError`) with `ProblemDetailsSerializer`.
* **Validation Foundation (`src/common/validation/`)**: `DtoValidator` translating Zod schema violations into structured 422 Problem Details with `invalidParams`.
* **Standard Response Envelopes (`src/common/dto/`)**: `ApiResponse<T>` and `PaginatedResponse<T>` wrappers with correlation and request metadata.
* **HTTP Hardening & CORS (`src/common/middleware/`)**: Dynamic origin validator enforcing configured frontend ports/domains, preflight `OPTIONS` handling, and standard security headers (`nosniff`, `DENY`, `XSS`, `HSTS`).
* **API Versioning & Core Router (`src/common/http/`)**: Lightweight router supporting parameterized routing, `/api/v1` prefixing, JSON body parsing, and `ApplicationServer` with `SIGINT`/`SIGTERM` graceful shutdown.
* **Health Endpoints (`src/modules/health/`)**: `GET /health` and `GET /api/v1/health` reporting service status, version, uptime, and database connectivity.
* **Unit & Integration Test Suite (`tests/`)**: 20 comprehensive unit and integration tests verifying all Phase 01 requirements.

### 2.2 Not Implemented in Phase 01 (Strictly as Intended):
* Authentication & JWT token issuing (Belongs to Phase 02).
* User login, password hashing, refresh token rotation (Phase 02).
* RBAC role evaluations and permissions (Phase 04).
* Subscription entitlement checks (Phase 05).
* Business domain controllers and repositories (Phases 06–15).
* Relational business database migrations (Phases 03+).
* External ERP, Biometric, and Payment integrations (Phase 17).

### 2.3 Deferred Items:
* Redis token blacklist caching (Evaluated for Phase 16/V2 scale).
* PostgreSQL native Row-Level Security (RLS) enforcement (Scheduled for Phase 03/04).

### 2.4 Known Risks & Mitigations:
* *Risk*: High load on session lookups in Phase 02 $\rightarrow$ *Mitigation*: Indexed `sessions` table query baseline with optional Redis cache layer.
* *Risk*: Asynchronous background processing dual-writes $\rightarrow$ *Mitigation*: Transactional Outbox pattern established in architectural design.

---

## 3. Phase 02 Detailed Audit — Identity & Authentication

### Status:
**VERIFIED (100%)** (Remediated & Verified 2026-09-10)

### Implemented & Verified:
* **Prisma Schema & Database Models (`backend/src/database/schema.prisma`)**:
  - `User`: Primary key UUID, scalar `tenantId` placeholder, unique `(tenantId, email)`, `fullName`, `passwordHash`, `status`, `sessionVersion`, `lastLoginAt`, timestamps (`users` table).
  - `Session`: Primary key UUID, `tenantId`, `userId`, `refreshTokenHash`, `userAgent`, `ipAddress`, `version`, `expiresAt`, `revokedAt`, foreign key relation to `User` with `onDelete: Cascade` (`sessions` table).
* **Database Migration & PostgreSQL Persistence (`src/database/migrations/`)**:
  - Migration `20260910055000_init_auth_phase02` applied to local PostgreSQL 18.4 `dezobuild` database (`dezo_user`).
  - Tables `users`, `sessions`, and `_prisma_migrations` verified in PostgreSQL `public` schema.
* **Bcrypt Password Hashing (`src/modules/auth/services/password.service.ts`)**:
  - Authoritative `bcrypt` hashing with configurable work factor (`BCRYPT_SALT_ROUNDS`, default 10, prod 12).
  - Constant-time verification, random salt generation, zero plaintext password storage or logging.
* **Runtime Repository Wiring & Production Composition Root**:
  - `AuthService` and `AuthController` runtime default composition explicitly wired to `PrismaUserRepository` and `PrismaSessionRepository` backed by `DatabaseService` / `PrismaClient`.
  - Silent runtime fallbacks to in-memory repositories eliminated from production paths.
  - In-memory repositories isolated strictly to unit test mocks.
* **Token & Session Lifecycles (`src/modules/auth/auth.service.ts`, `src/modules/auth/services/token.service.ts`)**:
  - 15-minute JWT HS256 access tokens with claims (`iss`, `aud`, `sub`, `tid`, `sid`, `ver`, `iat`, `exp`).
  - 7-day sliding refresh sessions with SHA-256 hashed refresh credentials stored in PostgreSQL `sessions`.
  - Refresh rotation invalidating previous refresh hashes and detecting token replay.
  - HttpOnly, SameSite=Strict, Path=/api/v1/auth, environment-aware Secure `dezo_refresh` cookie.
* **Session Invalidation & Revocation**:
  - Logout sets `revoked_at` timestamp on PostgreSQL `sessions` record.
  - User `session_version` increment in PostgreSQL `users` table immediately invalidates all active sessions and tokens.
* **Process Restart Persistence**: Verified that authentication state survives full application restart and re-instantiation without in-memory state.
* **Brute-Force Protection (`src/modules/auth/services/rate-limiter.service.ts`)**: Sliding window rate limiter enforcing 5 failed attempts per 15-minute window per IP/email.
* **Email Normalization & Safe DTOs**: Strict lowercase trimming on credentials; sensitive fields stripped from responses.
* **Audit Event Dispatcher (`src/modules/auth/services/audit.service.ts`)**: Structured security logging for `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `REFRESH`, `SESSION_REVOKED`, and `PASSWORD_CHANGED`.

### Security Controls:
* Plaintext passwords and password hashes are never logged or returned in responses.
* Refresh tokens are stored in PostgreSQL only as SHA-256 hashes.
* Refresh token reuse immediately triggers full session chain revocation.
* Client-fabricated headers (`X-User-Id`, `X-Tenant-Id`, `X-Role`, `X-Permissions`) are strictly ignored.
* Generic 401 Problem Details responses prevent user enumeration.

### Tests:
* **53/53 tests passing** across 10 test suites (Phase 01 Core + Phase 02 Auth Unit + Phase 02 Real PostgreSQL Persistence & Process Restart Lifecycle).

### Deferred:
* Role-based access control & permission enforcement (Deferred strictly to Phase 04).
* Redis distributed cache for token blacklisting / rate-limiting (Planned for scale phase).

### Known Issues:
* None.

---

## 4. Phase 03 Detailed Audit — Tenancy, Company, Branch, Department

### Status:
**VERIFIED (100%)** (Implemented & Verified 2026-09-10)

### Implemented & Verified:
* **Prisma Schema & Relational Models (`backend/src/database/schema.prisma`)**:
  - `Tenant`: Primary key UUID, unique `code` (uppercase alphanumeric), `name`, `domain`, `planTier`, `status`, `currency`, `currencySymbol`, `timezone`, timestamps (`tenants` table).
  - `Company`: Primary key UUID, `tenantId`, unique `(tenantId, code)`, `name`, `legalName`, `cinNumber`, `panNumber`, `gstin`, `email`, `phone`, `address`, `city`, `state`, `pincode`, `status`, foreign key to `Tenant` (`companies` table).
  - `Branch`: Primary key UUID, `tenantId`, `companyId`, unique `(tenantId, companyId, code)`, `name`, `gstin`, `city`, `state`, `status`, foreign keys to `Tenant` and `Company` (`branches` table).
  - `Department`: Primary key UUID, `tenantId`, unique `(tenantId, code)`, `name`, `status`, foreign key to `Tenant` (`departments` table).
  - `User -> Tenant`: Strict foreign key relation `User.tenantId -> Tenant.id` with `onDelete: Restrict`.
* **Database Migration & PostgreSQL Persistence (`src/database/migrations/`)**:
  - Migration `20260910061500_init_tenancy_phase03` applied cleanly to local PostgreSQL 18.4 `dezobuild` database.
  - Foreign key constraints, composite unique indexes (`tenantId_code`, `tenantId_companyId_code`), and check cascades verified in PostgreSQL `public` schema.
* **Repository-Level Multi-Tenant Scoping (`src/modules/tenancy/repositories/`)**:
  - `TenantRepository`, `CompanyRepository`, `BranchRepository`, `DepartmentRepository` with Prisma implementations.
  - All company, branch, and department queries strictly require and enforce `tenantId` in `where: { id, tenantId }`.
* **Hierarchy Validation & IDOR Protection (`src/modules/tenancy/services/tenancy.service.ts`)**:
  - Branch creation explicitly verifies that the referenced `companyId` exists and belongs to the caller's `tenantId`.
  - Looking up, updating, or deleting any entity with a foreign tenant ID throws `NotFoundError` or `ForbiddenError` without leaking foreign entity existence.
  - Department and company codes are uniquely scoped per tenant.
* **Tenant Provisioning Platform Gate (`src/modules/tenancy/tenancy.controller.ts`)**:
  - `POST /api/v1/tenants` is protected with a platform boundary gate: Ordinary customer users are rejected with `403 Forbidden`. Only `SUPER_ADMIN` / Platform Governance contexts are authorized to provision new root tenants via HTTP.
* **Tenancy REST API (`src/modules/tenancy/`)**:
  - `GET /api/v1/tenants/me`, `GET /api/v1/tenants/:id`, `POST /api/v1/tenants` (platform gate), `PATCH /api/v1/tenants/:id`
  - `GET /api/v1/companies`, `POST /api/v1/companies`, `GET /api/v1/companies/:id`, `PATCH /api/v1/companies/:id`, `DELETE /api/v1/companies/:id`
  - `GET /api/v1/branches`, `POST /api/v1/branches`, `GET /api/v1/branches/:id`, `PATCH /api/v1/branches/:id`, `DELETE /api/v1/branches/:id`
  - `GET /api/v1/departments`, `POST /api/v1/departments`, `GET /api/v1/departments/:id`, `PATCH /api/v1/departments/:id`, `DELETE /api/v1/departments/:id`
* **Test Verification**:
  - 18 comprehensive automated isolation & security tests in `tests/tenancy.test.ts`.
  - Monorepo total: **71/71 tests passing** (11 suites).

### Authoritative Role Baseline for Phase 04:
* Frozen 9 Customer Roles: `COMPANY_OWNER`, `COMPANY_ADMIN`, `PROJECT_MANAGER`, `SITE_ENGINEER`, `PROCUREMENT_STORE`, `ACCOUNTANT`, `HR`, `EMPLOYEE`, `VIEWER`.
* Platform Role: `SUPER_ADMIN` (Platform portal only).

### Deferred:
* Role-based access control & permission enforcement (Deferred strictly to Phase 04).
* Subscription plan enforcement & feature gating (Deferred strictly to Phase 05).
* Project / Site domain model (Deferred strictly to Phase 06).

### Known Issues:
* None.

---

## 5. Phase 04 Detailed Audit — RBAC, Permissions, Project Scope & Store Scope

### Status:
**VERIFIED (100%)** (Implemented & Verified 2026-09-10)

### Implemented & Verified:
* **Prisma Schema & Relational RBAC Models (`backend/src/database/schema.prisma`)**:
  - `Role`: UUID primary key, nullable `tenantId` (null for global system roles, non-null for tenant-scoped custom roles), `name`, `displayName`, `description`, `isSystemRole`, timestamps (`roles` table).
  - `Permission`: UUID primary key, unique `name` (`domain:entity:action` taxonomy), `module`, `description`, timestamps (`permissions` table).
  - `RolePermissionMapping`: Composite primary key `(roleId, permissionId)`, foreign keys to `Role` and `Permission` with `onDelete: Cascade` (`role_permissions` table).
  - `UserRoleAssignment`: UUID primary key, `tenantId`, `userId`, `roleId`, `scopeType` (TENANT, COMPANY, PROJECT), optional `scopeId`, composite unique index, foreign keys to `User` and `Role` (`user_role_assignments` table).
  - `Project`: UUID primary key, `tenantId`, `companyId`, unique `(tenantId, code)`, `name`, `status`, foreign key to `Company` (`projects` table).
  - `ProjectMember`: UUID primary key, `tenantId`, `projectId`, `userId`, unique `(projectId, userId)`, `projectRole`, `isLead`, `joinedAt`, foreign keys to `Project` and `User` with `onDelete: Cascade` (`project_members` table).
  - `Store`: UUID primary key, `tenantId`, optional `branchId`, optional `projectId`, unique `(tenantId, code)`, `name`, `isCentralWarehouse`, `status`, foreign key to `Project` (`stores` table).
  - `StoreAccessAssignment`: UUID primary key, `tenantId`, `storeId`, `userId`, unique `(storeId, userId)`, `accessLevel` (FULL, READ_ONLY, ISSUE_ONLY), foreign keys to `Store` and `User` (`store_access_assignments` table).
* **Database Migration & PostgreSQL Persistence (`src/database/migrations/`)**:
  - Migration `20260910070000_init_rbac_phase04` applied to local PostgreSQL 18.4 `dezobuild` database.
  - 54 canonical permissions across 10 modules seeded.
  - 9 authoritative system customer roles seeded: `COMPANY_OWNER`, `COMPANY_ADMIN`, `PROJECT_MANAGER`, `SITE_ENGINEER`, `PROCUREMENT_STORE`, `ACCOUNTANT`, `HR`, `EMPLOYEE`, `VIEWER`.
  - 228 role-permission mappings seeded idempotently via `RbacSeederService`.
* **Live Database Authority Resolution & Guards (`src/modules/rbac/services/authorization.service.ts`, `guards/rbac.guard.ts`)**:
  - Real-time resolution from PostgreSQL `user_role_assignments` and `role_permissions` tables.
  - Client-supplied role or permission headers (`X-Role`, `X-Permissions`, body roles) are strictly ignored.
  - Fail-closed defaults: Unauthenticated or unassigned callers receive 0 permissions and 403 Forbidden on protected resources.
* **Privilege Escalation Prevention (`src/modules/rbac/services/rbac.service.ts`)**:
  - Role hierarchy ranking enforced.
  - Non-admin callers (e.g. Site Engineer, Employee) cannot assign roles.
  - `COMPANY_ADMIN` cannot assign or remove `COMPANY_OWNER` or `COMPANY_ADMIN` roles.
  - Self-promotion blocked.
  - Cross-tenant role assignment blocked.
  - Removing the last `COMPANY_OWNER` of a tenant is strictly rejected.
* **Project Scope & Store Scope Access Control**:
  - `COMPANY_OWNER` and `COMPANY_ADMIN` have organization-wide project and store access without requiring explicit membership records.
  - Operational roles (`PROJECT_MANAGER`, `SITE_ENGINEER`, etc.) require explicit `ProjectMember` records to access project data.
  - Store staff (`PROCUREMENT_STORE`) require explicit `StoreAccessAssignment` records to access store yards.
  - Access is evaluated dual-layer: User must have required functional permission AND valid project/store scope.
* **REST API Endpoints (`src/modules/rbac/`)**:
  - `GET /api/v1/rbac/permissions`
  - `GET /api/v1/rbac/roles`, `GET /api/v1/rbac/roles/:id`
  - `GET /api/v1/rbac/my-permissions`
  - `GET /api/v1/rbac/users/:userId/roles`, `POST /api/v1/rbac/users/roles`, `DELETE /api/v1/rbac/users/:userId/roles/:roleId`
  - `GET /api/v1/rbac/users/:userId/permissions`
  - `GET /api/v1/rbac/projects/:projectId/members`, `POST /api/v1/rbac/projects/:projectId/members`, `DELETE /api/v1/rbac/projects/:projectId/members/:userId`
  - `GET /api/v1/rbac/stores/:storeId/access`, `POST /api/v1/rbac/stores/:storeId/access`, `DELETE /api/v1/rbac/stores/:storeId/access/:userId`
* **Test Verification**:
  - Matrix Invariant Suite: 5/5 tests passing (`tests/rbac.matrix.test.ts`).
  - PostgreSQL Integration Suite: 18/18 tests passing (`tests/rbac.integration.test.ts`).
  - Entire Test Suite: **94/94 tests passing** across 13 test suites with 0 failures, 0 skipped.
  - TypeScript Typecheck & Production Build: 0 errors (`npm run typecheck`, `npm run build`).

### Deferred:
* Subscription plan tiers & feature entitlement checks (Deferred strictly to Phase 05).
* Project WBS scheduling & DPR progress recording (Deferred strictly to Phase 06).
* Dual-entry inventory ledger & 3-way GRN verification (Deferred strictly to Phases 08–09).

### Known Issues:
* None.

---

## 6. Phase 07.4 Detailed Audit — Purchase Orders / Procurement

### Status:
**PHASE 07.4 IMPLEMENTED — READY FOR FORENSIC GATE** (Implemented 2026-09-10)

### Implemented & Verified:
* **Prisma Schema & Relational Models (`backend/src/database/schema.prisma`)**:
  - `PurchaseOrder`: Primary key UUID, `tenantId`, `projectId`, `vendorId`, `poNumber` (varchar 50, unique per tenant), `status` (DRAFT, SUBMITTED, APPROVED, ORDERED, REJECTED, CANCELLED, CLOSED), `orderDate`, `expectedDeliveryDate`, `deliveryAddress`, `paymentTerms`, `currency` (default INR), `subtotalAmount` Decimal(15,2), `taxAmount` Decimal(15,2), `discountAmount` Decimal(15,2), `grandTotal` Decimal(15,2), `notes`, `termsAndConditions`, audit & lifecycle actor tracking (`createdById`, `submittedById`, `submittedAt`, `approvedById`, `approvedAt`, `approvalRemarks`, `rejectedById`, `rejectedAt`, `rejectionReason`, `cancelledById`, `cancelledAt`, `cancellationReason`, `orderedById`, `orderedAt`), timestamps (`purchase_orders` table).
  - `PurchaseOrderLine`: Primary key UUID, `tenantId`, `purchaseOrderId`, `materialId`, optional `indentLineId`, `quantityOrdered` Decimal(15,4), `quantityReceived` Decimal(15,4) default 0, `uom`, `unitRate` Decimal(12,2), `taxRatePercent` Decimal(5,2), `discountRatePercent` Decimal(5,2), `lineTotal` Decimal(15,2), `expectedDeliveryDate`, optional `wbsNodeId`, optional `taskId`, `remarks`, timestamps (`purchase_order_lines` table).
  - `PurchaseOrderSequence`: Primary key UUID, `tenantId`, `projectId`, `sequenceDate`, `lastSequence`, `updatedAt`, composite unique `(tenantId, projectId, sequenceDate)` (`purchase_order_sequences` table).
  - Relational FK enforcement: `PurchaseOrder.tenantId -> Tenant CASCADE`, `PurchaseOrder.projectId -> Project RESTRICT`, `PurchaseOrder.vendorId -> Vendor RESTRICT`, `PurchaseOrder.createdById -> User RESTRICT`, `PurchaseOrderLine.purchaseOrderId -> PurchaseOrder CASCADE`, `PurchaseOrderLine.materialId -> Material RESTRICT`, `PurchaseOrderLine.indentLineId -> MaterialIndentLine SET NULL`.
* **Database Migration & PostgreSQL Persistence (`src/database/migrations/`)**:
  - Migration `20260910150000_init_purchase_orders_phase07_4` applied to local PostgreSQL 18.4 `dezobuild` database.
  - Unique composite constraints, foreign keys, and indexes verified.
* **Deterministic Numbering & Atomic Sequence Allocator**:
  - DB-backed atomic allocation: `INSERT ... ON CONFLICT (tenant_id, project_id, sequence_date) DO UPDATE SET last_sequence = last_sequence + 1 RETURNING last_sequence`.
  - Format: `PO-<PROJECT_CODE>-<YYYYMMDD>-<SEQ>` with UTC date and zero-padded sequence.
* **Oversubscription & Concurrency Control**:
  - Demand-linked lines require `MaterialIndent` in `APPROVED` status and project matching.
  - Interactive transaction acquires `SELECT ... FOR UPDATE` row lock on `MaterialIndentLine`.
  - Atomic committed quantity computation: `committedQty = SUM(active PurchaseOrderLine.quantityOrdered)` across `DRAFT`, `SUBMITTED`, `APPROVED`, `ORDERED`.
  - Concurrent oversubscription requests serialize safely; excess quantities are rejected with 400 Bad Request.
* **Server-Side Commercial Calculations**:
  - Authoritative financial computation with Decimal arithmetic: `gross = quantityOrdered * unitRate`, `discount = gross * discountRate / 100`, `net = gross - discount`, `tax = net * taxRate / 100`, `lineTotal = net + tax`.
  - PO totals computed server-side: `subtotalAmount`, `discountAmount`, `taxAmount`, `grandTotal`. Client total spoofing strictly ignored.
* **Segregation of Duties (SoD) & RBAC**:
  - Strict SoD: `approver !== createdById` AND `approver !== submittedById`. Self-approval strictly forbidden (403 Forbidden).
  - Canonical permissions: `materials:view` (read), `materials:po:create` (draft, update, submit, order, cancel, delete), `materials:po:approve` (approve, reject).
  - Feature entitlement: `materials:po_matching` required. Starter tier fails closed.
* **Stock & Financial Invariance**:
  - Zero `StockMovement` writes or `StoreStockBalance` mutations across entire PO lifecycle.
  - Zero invoices, expenses, payables, or ledger transactions created.
* **REST API Endpoints (`src/modules/materials/`)**:
  - `POST /api/v1/materials/purchase-orders` (create draft)
  - `GET /api/v1/materials/purchase-orders` (list with filters)
  - `GET /api/v1/materials/purchase-orders/:id` (detail)
  - `PATCH /api/v1/materials/purchase-orders/:id` (update draft/rejected)
  - `POST /api/v1/materials/purchase-orders/:id/submit` (submit for approval)
  - `POST /api/v1/materials/purchase-orders/:id/approve` (approve with SoD)
  - `POST /api/v1/materials/purchase-orders/:id/reject` (reject with mandatory reason)
  - `POST /api/v1/materials/purchase-orders/:id/order` (formal issuance)
  - `POST /api/v1/materials/purchase-orders/:id/cancel` (cancel unfulfilled)
  - `DELETE /api/v1/materials/purchase-orders/:id` (delete draft)
* **Test Verification**:
  - Comprehensive Integration Suite: **37/37 tests passing** (`tests/purchase-orders.integration.test.ts`).
  - Monorepo Backend Suite: **320/320 tests passing** across 21 test suites.
  - TypeScript Typecheck & Monorepo Build: 0 errors across backend, frontend, and owner workspaces.

* **Phase 07.5 Detailed Audit — Goods Receipt Notes (GRN) / Physical Material Receipt**:
  - **Prisma Schema & Database Models (`src/database/schema.prisma`)**:
    - `GoodsReceiptNote`: UUID pk, `tenantId`, `projectId`, `storeId`, `purchaseOrderId`, `vendorId`, `grnNumber` (unique per tenant), `status` (`DRAFT`, `SUBMITTED`, `VERIFIED`, `REJECTED`, `CANCELLED`), `receiptDate`, `deliveryChallanNumber`, `deliveryChallanDate`, `vehicleNumber`, `remarks`, lifecycle audit timestamps and actors (`receivedById`, `submittedById`, `verifiedById`, `rejectedById`, `cancelledById`).
    - `GoodsReceiptLine`: UUID pk, `tenantId`, `grnId`, `purchaseOrderLineId`, `materialId`, `quantityDelivered`, `quantityAccepted`, `quantityRejected`, `uom`, `unitRate`, `storageLocation`, `remarks`. Enforced invariant: `quantityDelivered = quantityAccepted + quantityRejected` with `quantityAccepted <= quantityDelivered` and positive delivered quantities.
    - `GoodsReceiptSequence`: Atomic sequence allocator row per `(tenantId, projectId, sequenceDate)`.
  - **Database Migration (`src/database/migrations/20260910160000_init_grn_phase07_5/`)**:
    - Applied clean migration to PostgreSQL with foreign key cascade/restrict rules: tenant CASCADE, project RESTRICT, store RESTRICT, PO RESTRICT, vendor RESTRICT, material RESTRICT, POLine RESTRICT, user RESTRICT/SET NULL.
  - **Atomic Concurrency-Safe Sequence Numbering**:
    - Allocator format: `GRN-<PROJECT_CODE>-<YYYYMMDD>-<4DIGIT_SEQ>` utilizing PostgreSQL `ON CONFLICT (tenant_id, project_id, sequence_date) DO UPDATE SET last_sequence = last_sequence + 1 RETURNING last_sequence`.
  - **Authoritative Stock Mutation & Reconciliation Engine**:
    - Verification is the strictly isolated physical mutation point.
    - Pessimistic locking on `goods_receipt_notes` and `purchase_order_lines` via `SELECT ... FOR UPDATE`.
    - 0% over-receipt tolerance: rejects if `cumulative accepted > quantityOrdered`.
    - Exactly-once immutable `StockMovement.RECEIPT` creation (`idempotencyKey = GRN-<grnId>-<lineId>`).
    - `StoreStockBalance` updated: `quantityOnHand += acceptedQty`, `availableQuantity += acceptedQty`. `reservedQuantity` remains unchanged.
    - `PurchaseOrderLine.quantityReceived` updated atomically.
    - Automatic transition of `PurchaseOrder.status -> 'CLOSED'` only when all lines are fully received (`quantityReceived >= quantityOrdered`).
  - **Segregation of Duties (SoD) & RBAC**:
    - Server-side SoD enforcement: Verifier cannot be `receivedById` AND cannot be PO `createdById`.
    - Canonical permissions: `materials:view` (read), `materials:grn:create` (draft, update, submit, delete), `materials:grn:verify` (verify, reject, cancel).
    - Entitlement: `materials:po_matching` required. STARTER plan tier fails closed.
  - **Financial Boundary & Deferred Scope**:
    - Zero invoices, expenses, payables, or ledger transactions created.
    - Batch/serial lifecycle and unplanned GRN without PO deferred.
  - **Test Suite Verification**:
    - Comprehensive Phase 07.5 Integration Suite: **40/40 tests passing** (`tests/goods-receipts.integration.test.ts`).
    - Monorepo Backend Suite: **360/360 tests passing** across 22 test suites.
    - TypeScript Typecheck & Monorepo Build: 0 errors across backend, frontend, and owner workspaces.

* **Phase 07.6 Detailed Audit — Stock Issue / Material Consumption**:
  - **Prisma Schema & Database Models (`src/database/schema.prisma`)**:
    - `MaterialIssue`: UUID pk, `tenantId`, `projectId`, `storeId`, `issueNumber` (unique per tenant), `status` (`DRAFT`, `SUBMITTED`, `APPROVED`, `ISSUED`, `CANCELLED`), `issueDate`, `purpose`, `remarks`, audit actors (`requestedById`, `issuedById`, `issuedAt`, `approvedById`, `approvedAt`, `cancelledById`, `cancelledAt`, `cancellationReason`).
    - `MaterialIssueLine`: UUID pk, `tenantId`, `materialIssueId`, `materialId`, `quantityRequested`, `quantityIssued`, `uom`, `wbsNodeId`, `taskId`, `remarks`.
    - `MaterialIssueSequence`: Atomic sequence allocator row per `(tenantId, projectId, sequenceDate)`.
  - **Database Migration (`src/database/migrations/20260910173000_init_material_issue_phase07_6/`)**:
    - Applied clean migration to PostgreSQL with foreign key cascade/restrict rules: tenant CASCADE, project RESTRICT, store RESTRICT, material RESTRICT, WBS node SET NULL, task SET NULL, user RESTRICT/SET NULL.
  - **Atomic Concurrency-Safe Sequence Numbering**:
    - Allocator format: `MI-<PROJECT_CODE>-<YYYYMMDD>-<4DIGIT_SEQ>` utilizing PostgreSQL `ON CONFLICT (tenant_id, project_id, sequence_date) DO UPDATE SET last_sequence = last_sequence + 1 RETURNING last_sequence`.
  - **Authoritative Stock Decrement & Concurrency Engine**:
    - Issuance is the strictly isolated physical decrement point.
    - Pessimistic row locking on `material_issues` and `store_stock_balances` via `SELECT ... FOR UPDATE`.
    - Deterministic deadlock prevention: lines are sorted by `materialId ASC` before row lock acquisition.
    - Strict Negative Stock Prevention: enforces `quantityIssued <= availableQuantity` (`quantityOnHand - reservedQuantity`).
    - Exactly-once immutable `StockMovement.ISSUE` creation (`idempotencyKey = MI-<issueId>-<lineId>`).
    - `StoreStockBalance` updated: `quantityOnHand -= quantityIssued`. `reservedQuantity` remains unchanged.
    - `MaterialIssueLine.quantityIssued` updated atomically.
    - Transactional rollback proof: any line stock failure rolls back the entire multi-line transaction atomically.
  - **Segregation of Duties (SoD) & RBAC**:
    - Server-side SoD enforcement: Approver cannot be `requestedById` AND Issuer cannot be `requestedById`.
    - Canonical permissions: `materials:view` (read), `materials:stock:issue` (draft, update, submit, approve, issue, cancel, delete).
    - Entitlement: `materials:core` (available across Starter, Professional, and Enterprise tiers).
  - **Financial Boundary & Pure Operational Attribution**:
    - Zero financial ledger postings, zero expense vouchers, zero AP liabilities created.
    - Material standardRate snapshotted on `StockMovement.unitRate` for operational valuation.
  - **Test Suite Verification**:
    - Comprehensive Phase 07.6 Integration Suite: **40/40 tests passing** (`tests/material-issues.integration.test.ts`).
    - Monorepo Backend Suite: **400/400 tests passing** across 23 test suites.
    - TypeScript Typecheck & Monorepo Build: 0 errors across backend, frontend, and owner workspaces.

* **Phase 07.7 Detailed Audit — Material Return / Return to Store**:
  - **Prisma Schema & Database Models (`src/database/schema.prisma`)**:
    - `MaterialReturn`: UUID pk, `tenantId`, `projectId`, `storeId`, `materialIssueId`, `returnNumber` (unique per tenant), `status` (`DRAFT`, `SUBMITTED`, `VERIFIED`, `REJECTED`, `CANCELLED`), `returnDate`, `remarks`, `rejectionReason`, `cancellationReason`, audit actors (`returnedById`, `verifiedById`, `verifiedAt`).
    - `MaterialReturnLine`: UUID pk, `tenantId`, `materialReturnId`, `materialIssueLineId`, `materialId`, `quantityReturned`, `uom`, `condition` (`GOOD`, `DAMAGED`, `DEFECTIVE`, `UNUSABLE`), `remarks`.
    - `MaterialReturnSequence`: Atomic sequence allocator row per `(tenantId, projectId, sequenceDate)`.
  - **Database Migration (`src/database/migrations/20260910180000_init_material_return_phase07_7/`)**:
    - Applied clean migration to PostgreSQL with foreign key cascade/restrict rules: tenant CASCADE, project RESTRICT, store RESTRICT, materialIssue RESTRICT, material RESTRICT, materialIssueLine RESTRICT, user RESTRICT/SET NULL.
  - **Atomic Concurrency-Safe Sequence Numbering**:
    - Allocator format: `MR-<PROJECT_CODE>-<YYYYMMDD>-<4DIGIT_SEQ>` utilizing PostgreSQL `ON CONFLICT (tenant_id, project_id, sequence_date) DO UPDATE SET last_sequence = last_sequence + 1 RETURNING last_sequence`.
  - **Source Issue & Same-Store Invariants**:
    - Returns strictly trace to parent `MaterialIssue` in `ISSUED` status.
    - Same-Store Rule: `MaterialReturn.storeId === MaterialIssue.storeId` enforced without cross-store leakage.
    - Material & UOM consistency inherited directly from source `MaterialIssueLine`.
  - **Authoritative Returnable Quantity & Concurrency Engine**:
    - Returnable Quantity formula: $\text{quantityIssued} - \sum \text{VERIFIED returns}$. Unverified statuses (DRAFT, SUBMITTED, REJECTED, CANCELLED) consume zero returnable quantity.
    - Pessimistic row locking on `material_returns` and source `material_issue_lines` via `SELECT ... FOR UPDATE`.
    - Deterministic deadlock prevention: lines are sorted by `materialIssueLineId ASC` before row lock acquisition.
    - Single-transaction verification atomicity: any line over-return failure rolls back the entire multi-line return.
  - **Condition Handling & Physical Stock Mutation**:
    - Condition `GOOD`: creates immutable `StockMovement.RETURN` (`idempotencyKey = MR-<returnId>-<lineId>`) and increments `StoreStockBalance.quantityOnHand`. `reservedQuantity` remains unchanged.
    - Conditions `DAMAGED`, `DEFECTIVE`, `UNUSABLE`: permanently preserved on `MaterialReturnLine` for physical audit, but create NO usable stock movement and do NOT increment `StoreStockBalance`.
  - **Segregation of Duties (SoD) & RBAC**:
    - Server-side SoD enforcement: Verifier cannot be the return submitter (`verifiedById !== returnedById`). Rejector cannot be the return submitter.
    - Canonical permissions: `materials:view` (read), `materials:stock:issue` (draft, update, submit, verify, reject, cancel, delete).
    - Entitlement: `materials:core` (available across Starter, Professional, and Enterprise tiers).
  - **Financial Boundary & Deferred Scope**:
    - Zero invoices, expenses, payables, cost entries, or general ledger postings.
    - Stock Transfer (Phase 07.8), Inventory Reservation (Phase 07.9), Quarantine subsystem, and batch/serial lifecycle deferred.
  - **Test Suite Verification**:
    - Comprehensive Phase 07.7 Integration Suite: **37/37 tests passing** (`tests/material-returns.integration.test.ts`).
    - Monorepo Backend Suite: **437/437 tests passing** across 32 test suites.
    - TypeScript Typecheck & Monorepo Build: 0 errors across backend, frontend, and owner workspaces.

* **Phase 07.8 Detailed Audit — Material Transfer / Inter-Store Transfer**:
  - **Status**: **IMPLEMENTED — READY FOR FORENSIC GATE**
  - **Prisma Schema & Database Models (`src/database/schema.prisma`)**:
    - `MaterialTransfer`: UUID pk, `tenantId`, `sourceStoreId`, `destinationStoreId`, `sourceProjectId` (nullable), `destinationProjectId` (nullable), `transferNumber` (unique per tenant), `status` (`DRAFT`, `SUBMITTED`, `APPROVED`, `IN_TRANSIT`, `RECEIVED`, `REJECTED`, `CANCELLED`), `transferDate`, `dispatchDate`, `receivedDate`, `deliveryChallanNumber`, `vehicleNumber`, `driverName`, `driverPhone`, `remarks`, `approvalRemarks`, `rejectionReason`, `cancellationReason`, `receiptRemarks`, audit actors (`createdById`, `submittedById`, `submittedAt`, `approvedById`, `approvedAt`, `dispatchedById`, `dispatchedAt`, `receivedById`, `receivedAt`, `rejectedById`, `rejectedAt`, `cancelledById`, `cancelledAt`).
    - `MaterialTransferLine`: UUID pk, `tenantId`, `materialTransferId`, `materialId`, `quantityTransferred`, `quantityReceived` (default 0), `uom`, `remarks`.
    - `MaterialTransferSequence`: Atomic sequence allocator row per `(tenantId, scopeKey, sequenceDate)`.
  - **Database Migration (`src/database/migrations/20260910190000_init_material_transfer_phase07_8/`)**:
    - Applied clean migration to PostgreSQL with foreign key cascade/restrict rules: tenant CASCADE, sourceStore RESTRICT, destinationStore RESTRICT, sourceProject RESTRICT, destinationProject RESTRICT, material RESTRICT, user RESTRICT/SET NULL.
  - **Atomic Concurrency-Safe Sequence Numbering**:
    - Allocator format: `MT-<SCOPE_CODE>-<YYYYMMDD>-<4DIGIT_SEQ>` utilizing PostgreSQL `ON CONFLICT (tenant_id, scope_key, sequence_date) DO UPDATE SET last_sequence = last_sequence + 1 RETURNING last_sequence`.
  - **Store Scope & Project Authoritative Derivation**:
    - Supported transfer types: Central -> Central, Central -> Project Site, Project Site -> Central, Project Site -> Project Site.
    - Same-store transfers strictly prohibited (`sourceStoreId !== destinationStoreId`).
    - Source and destination stores must both be ACTIVE and belong to caller's tenant.
    - Project IDs derived authoritatively from store entities (`sourceProjectId = sourceStore.projectId`, `destinationProjectId = destinationStore.projectId`). Client project IDs are not trusted.
  - **Stock Ledger Integration & Two-Phase Balance Mutation**:
    - Phase 1 — Dispatch (`POST /api/v1/materials/transfers/:id/dispatch`):
      - Status transitions `APPROVED -> IN_TRANSIT`.
      - Pessimistic row locking on source `store_stock_balances` via `SELECT ... FOR UPDATE`.
      - Deterministic deadlock prevention: lines sorted by `materialId ASC`.
      - Enforces `quantityTransferred <= availableQuantity` (`quantityOnHand - reservedQuantity`).
      - Decrements source balance: `source.quantityOnHand -= quantityTransferred`.
      - Creates immutable `StockMovement.TRANSFER_OUT` (`idempotencyKey = MT-<transferId>-<lineId>-OUT`).
    - Phase 2 — Receive (`POST /api/v1/materials/transfers/:id/receive`):
      - Status transitions `IN_TRANSIT -> RECEIVED` (terminal state).
      - Pessimistic row locking on destination `store_stock_balances`.
      - Increments destination balance: `destination.quantityOnHand += quantityTransferred`.
      - Updates `quantityReceived = quantityTransferred`.
      - Creates immutable `StockMovement.TRANSFER_IN` (`idempotencyKey = MT-<transferId>-<lineId>-IN`).
    - Total physical stock across tenant is strictly conserved at all stages (Source + In-Transit + Destination = Total).
  - **Segregation of Duties (SoD) & RBAC**:
    - Creator cannot approve transfer (`createdById !== approvedById`).
    - Dispatcher cannot receive transfer (`dispatchedById !== receivedById`).
    - Canonical permissions: `materials:view` (read), `materials:stock:transfer` (create, update, submit, approve, reject, cancel, dispatch, delete), `materials:stock:receive` (receive).
    - Entitlement: `materials:core` (available across Starter, Professional, and Enterprise tiers).
  - **Financial Boundary & Pure Operational Attribution**:
    - Zero invoices, expenses, payables, cost entries, general ledger postings, or financial journal mutations.
    - Reservations (Phase 07.9), partial multi-leg receiving, carrier claims, and quarantine deferred.
  - **Test Suite Verification**:
    - Comprehensive Phase 07.8 Integration Suite: **50/50 tests passing** (`tests/material-transfers.integration.test.ts`).
    - Monorepo Backend Suite: **487/487 tests passing** across 33 test suites.
    - TypeScript Typecheck & Monorepo Build: 0 errors across backend, frontend, and owner workspaces.

---

## 14. Phase 07.9 Detailed Audit — Inventory Reservations / Material Allocations

### Status:
**PHASE 07.9 IMPLEMENTED — READY FOR FORENSIC GATE** (Implemented 2026-09-11)

### Implemented & Verified:
* **Prisma Schema & Database Models (`backend/src/database/schema.prisma`)**:
  - `InventoryReservation`: Primary key UUID, `tenantId`, `storeId`, `projectId`, unique `reservationNumber` (`RES-<SCOPE>-<YYYYMMDD>-<SEQ>`), `status` (DRAFT, SUBMITTED, ACTIVE, PARTIALLY_FULFILLED, FULFILLED, RELEASED, REJECTED, CANCELLED, EXPIRED), `priority` (LOW, MEDIUM, HIGH, URGENT, CRITICAL), `reservationDate`, `requiredDate`, `expiryDate`, `purpose`, remarks, reason fields, lifecycle actor IDs and timestamps (`inventory_reservations` table).
  - `InventoryReservationLine`: Primary key UUID, `tenantId`, `reservationId`, `materialId`, `quantityReserved`, `quantityFulfilled`, `quantityReleased`, `uom`, `wbsNodeId`, `taskId`, `materialIndentLineId`, `remarks` (`inventory_reservation_lines` table). Check constraints: `quantity_reserved > 0`, `quantity_fulfilled >= 0`, `quantity_released >= 0`, `quantity_fulfilled + quantity_released <= quantity_reserved`.
  - `InventoryReservationSequence`: Atomic PostgreSQL upsert sequence generator (`inventory_reservation_sequences` table) with unique constraint `(tenantId, scopeKey, sequenceDate)`.
* **Database Migration (`backend/src/database/migrations/20260911120000_init_inventory_reservation_phase07_9/migration.sql`)**:
  - Tables, indices, check constraints, foreign keys with `ON DELETE RESTRICT` created and verified in PostgreSQL.
* **Domain & Application Architecture (`backend/src/modules/materials/`)**:
  - DTOs & Validation: `inventory-reservation.dto.ts` with strict Zod validation, positive quantities, duplicate material line rejection.
  - Repository: `prisma-inventory-reservation.repository.ts` with pessimistic row locking (`SELECT ... FOR UPDATE`), deterministic `materialId ASC` deadlock prevention, atomic `reservedQuantity` mutation, lightweight stale reservation expiration (`expireStaleReservations`).
  - Service: `inventory-reservation.service.ts` enforcing store/project derivation, central store beneficiary project validation, segregation of duties (creator cannot approve own reservation), RBAC and feature entitlement (`materials:core`).
  - Controller & Routes: `inventory-reservations.controller.ts` exposed via `materials.routes.ts`.
* **Core Inventory Invariant & Zero Stock Movement Invariant**:
  - Reservation operations (`create`, `submit`, `approve`, `release`, `cancel`, `expire`) mutate ONLY `StoreStockBalance.reservedQuantity` and generate **ZERO `StockMovement` rows**.
  - `quantityOnHand` remains strictly invariant during reservation creation, submission, activation, release, cancellation, and expiration.
  - `availableQuantity = quantityOnHand - reservedQuantity` dynamically controls stock availability for issues and transfers.
* **Material Issue Integration (Phase 07.6 Additive Fulfillment)**:
  - Material issue lines optionally link to `reservationLineId`.
  - Under pessimistic lock: decrements `quantityOnHand -= issueQty` AND `reservedQuantity -= issueQty`, increments `reservationLine.quantityFulfilled`, updates reservation status to `PARTIALLY_FULFILLED` or `FULFILLED`, and generates physical `StockMovement.ISSUE`.
  - Unreserved direct issues verify `qty <= availableQuantity` and decrement `quantityOnHand` only, preserving `reservedQuantity`.
* **Adjustment & Transfer Guards**:
  - Negative inventory adjustment is prevented from reducing `quantityOnHand < reservedQuantity`.
  - Inter-store material transfer dispatch is prevented from consuming active reserved stock.
* **Financial Boundary**:
  - Pure logical stock allocation. Zero invoices, expenses, payables, journals, tax entries, or general ledger postings.
* **Test Suite Verification**:
  - Dedicated Phase 07.9 Integration Suite: **56/56 tests passing** (`tests/material-reservations.integration.test.ts`).
  - Full Backend Monorepo Suite: **543/543 tests passing** across 34 test suites.
  - TypeScript Typecheck & Monorepo Build: 0 errors across backend, frontend, and owner workspaces.

---

## 15. Phase 07.10 Detailed Audit — Inventory Availability & Allocation Intelligence

### Status:
**PHASE 07.10 IMPLEMENTATION COMPLETE — AWAITING FORENSIC GATE** (Implemented 2026-09-11)

### Implemented & Verified:
* **Pure Read-Only Intelligence Architecture (`backend/src/modules/materials/`)**:
  - **Zero Database Schema Changes & Zero Migrations**: Built completely on top of frozen canonical tables (`materials`, `stores`, `store_stock_balances`, `material_transfers`, `material_transfer_lines`, `purchase_orders`, `purchase_order_lines`, `material_indents`, `material_indent_lines`, `inventory_reservations`, `inventory_reservation_lines`).
  - **Zero Stock Movement Creation**: Pure query and aggregation service. Emits zero `StockMovement` records and performs zero balance mutations (`quantityOnHand`, `reservedQuantity` strictly invariant).
  - **Zero Financial Side Effects**: No financial models, services, or ledgers imported or altered.
* **REST API Endpoints (`/api/v1/materials/`)**:
  - `GET /api/v1/materials/availability`: Consolidated availability across tenant stores with category, material, project, store, and threshold filters.
  - `GET /api/v1/materials/availability/:materialId`: Material 360° deep-dive reporting store balances, in-transit inbound/outbound, pending PO inbound, active project reservations, and threshold alerts.
  - `GET /api/v1/materials/availability/by-project/:projectId`: Project-centric material position strictly isolating physical site stores, central warehouse reservations allocated to this project, incoming transfers, pending PO procurement, open indent demand, and computed immediate/net shortages.
  - `GET /api/v1/materials/availability/by-store/:storeId`: Store-centric inventory breakdown with in-transit pipelines, active reservations, and central store project allocation breakdown.
  - `GET /api/v1/materials/shortages`: Enterprise shortage detection engine auditing immediate site shortages, net projected project shortages, reorder level alerts, and safety stock alerts.
* **Canonical Formulas Implemented**:
  - Store Level:
    - `FreeAvailable = max(0, PhysicalOnHand - ActiveReserved)`
    - `StoreProjectedAvailable = FreeAvailable + InTransitInbound`
  - Project Level:
    - `SiteFreeAvailable = sum(SiteStore.FreeAvailable)`
    - `CentralAllocatedForProject = sum(RemainingReserved)` where store is Central Warehouse and `reservation.projectId === requestedProjectId`.
    - `ProjectIncomingTransfer = sum(quantityTransferred)` where transfer status is `IN_TRANSIT` and destination store belongs to requested project.
    - `ProjectPendingPO = sum(max(0, quantityOrdered - quantityReceived))` where PO status is `ORDERED` and `po.projectId === requestedProjectId`.
    - `ProjectControlledSupply = SiteFreeAvailable + CentralAllocatedForProject`
    - `ProjectProjectedSupply = ProjectControlledSupply + ProjectIncomingTransfer + ProjectPendingPO`
    - `ImmediateSiteShortage = max(0, OpenIndentDemand - SiteFreeAvailable)`
    - `NetProjectShortage = max(0, OpenIndentDemand - ProjectProjectedSupply)`
  - Material Thresholds:
    - `ReorderAlert = TotalOnHand <= Material.reorderLevel`
    - `SafetyStockAlert = TotalOnHand <= Material.safetyStock`
* **Cross-Project Isolation Invariant**:
  - In `getProjectAvailability()`, central store reserved stock is only counted if `reservation.projectId === requestedProjectId`. Project A cannot see or count Project B allocations.
* **RBAC, Entitlements & Security**:
  - Least privilege permission `materials:view` enforced across all 5 endpoints.
  - Feature entitlement `materials:core` enforced via `EntitlementGuard` (fail-closed).
  - Multi-tenant data isolation enforced on every query.
  - Project and store scoped access enforced via `AuthorizationService`.
* **Test Suite Verification**:
  - Dedicated Phase 07.10 Integration Suite: **37/37 tests passing** (`tests/inventory-availability.integration.test.ts`).
  - Full Backend Monorepo Suite: **580/580 tests passing** across 35 test suites.
  - TypeScript Typecheck & Monorepo Build: 0 errors across backend, frontend, and owner workspaces.

---

## 16. Phase 07 Detailed Audit — Bill of Quantities (BOQ) & Digital Measurement Book (MB)

### Status:
**PHASE 07 IMPLEMENTATION COMPLETE — AWAITING FINAL FORENSIC GATE** (Implemented 2026-09-11)

### Implemented & Verified:
* **Prisma Schema & Database Models (`backend/src/database/schema.prisma`)**:
  - `BoqItem`: Primary key UUID, `tenantId`, `projectId`, `wbsNodeId?`, `parentId?`, `itemNumber`, `description`, `specification?`, `uom`, `quantity`, `unitRate`, `totalAmount`, `executedQuantity`, `status`, `createdById`, `createdAt`, `updatedAt` (`boq_items` table). Indexes: `(projectId, itemNumber)` UNIQUE, `(tenantId, projectId)`, `(projectId, wbsNodeId)`, `(projectId, status)`.
  - `DigitalMbRecord`: Primary key UUID, `tenantId`, `projectId`, `boqItemId`, `dprId?`, `taskId?`, `contractorId?`, `mbNumber`, `measurementDate`, `measurementType`, `location`, `chainageFrom?`, `chainageTo?`, `gpsLatitude?`, `gpsLongitude?`, `witnessedBy?`, `remarks?`, `photoUrls`, `attachmentUrls`, `currentQuantity`, `previousCumulativeQuantity`, `cumulativeQuantity`, `isExcess`, `excessJustification?`, `isCorrection`, `supersedesMbRecordId?`, `correctionReason?`, `status`, `createdById`, `submittedById?`, `submittedAt?`, `verifiedById?`, `verifiedAt?`, `approvedById?`, `approvedAt?`, `rejectedById?`, `rejectedAt?`, `rejectionReason?`, `createdAt`, `updatedAt` (`digital_mb_records` table). Indexes: `(projectId, mbNumber)` UNIQUE, `(tenantId, projectId)`, `(projectId, boqItemId)`, `(projectId, status)`, `(tenantId, measurementDate)`.
  - `MeasurementDimension`: Primary key UUID, `tenantId`, `digitalMbRecordId`, `description`, `count`, `length`, `breadth`, `depth`, `factor`, `calculatedQuantity`, `remarks?`, `sequence`, `createdAt` (`measurement_dimensions` table). Indexes: `(tenantId, digitalMbRecordId)`, `(digitalMbRecordId)`.
  - `DigitalMbSequence`: Primary key UUID, `tenantId`, `projectId`, `currentNumber`, `updatedAt` (`digital_mb_sequences` table). Index: `(tenantId, projectId)` UNIQUE.
* **REST API Endpoints (`/api/v1/projects/:projectId/`)**:
  - `GET    /api/v1/projects/:projectId/boq`
  - `GET    /api/v1/projects/:projectId/boq/billing-positions` (Phase 10 Read-Only Position)
  - `GET    /api/v1/projects/:projectId/boq/:boqItemId`
  - `POST   /api/v1/projects/:projectId/boq`
  - `POST   /api/v1/projects/:projectId/boq/bulk`
  - `PATCH  /api/v1/projects/:projectId/boq/:boqItemId`
  - `DELETE /api/v1/projects/:projectId/boq/:boqItemId`
  - `GET    /api/v1/projects/:projectId/measurements`
  - `GET    /api/v1/projects/:projectId/measurements/:measurementId`
  - `POST   /api/v1/projects/:projectId/measurements`
  - `PATCH  /api/v1/projects/:projectId/measurements/:measurementId`
  - `DELETE /api/v1/projects/:projectId/measurements/:measurementId`
  - `POST   /api/v1/projects/:projectId/measurements/:measurementId/submit`
  - `POST   /api/v1/projects/:projectId/measurements/:measurementId/verify`
  - `POST   /api/v1/projects/:projectId/measurements/:measurementId/approve`
  - `POST   /api/v1/projects/:projectId/measurements/:measurementId/reject`
* **Canonical UOM & Dimensional Math**:
  - Supported UOMs: Volume (`CUM`, `CFT`), Area (`SQM`, `SQFT`), Length (`RMT`, `M`, `FT`), Count (`NOS`, `BAGS`, `TRIP`, `SET`), Weight (`MT`, `KG`, `TON`), Commercial (`LS`, `MONTH`, `DAY`).
  - UOM Math:
    - Volume: `count * length * breadth * depth * factor`
    - Area: `count * length * breadth * factor`
    - Length: `count * length * factor`
    - Count: `count * factor`
    - Weight/LS: `DIRECT_QUANTITY`
  - Factors: Strictly `1.00` or `-1.00` (deductions).
  - All arithmetic computed with `Prisma.Decimal` and `ROUND_HALF_UP` to 2 decimal places.
* **Measurement Workflow State Machine & Segregation of Duties (SoD)**:
  - Lifecycle: `DRAFT -> SUBMITTED -> VERIFIED -> APPROVED` or `REJECTED -> DRAFT`.
  - Immutability: `APPROVED` records and their dimensions are permanently immutable.
  - SoD: `createdById !== verifiedById`, `createdById !== approvedById`, `submittedById !== approvedById`.
* **Pessimistic Locking & Cumulative Quantity Cache**:
  - Approval executes inside a single PostgreSQL transaction with `SELECT ... FROM boq_items WHERE id = ... FOR UPDATE`.
  - `previousCumulativeQuantity = locked BoqItem.executedQuantity`
  - `cumulativeQuantity = previousCumulativeQuantity + currentQuantity`
  - `BoqItem.executedQuantity = cumulativeQuantity` atomically updated.
  - Reconciliation proven: `SUM(APPROVED currentQuantity) === BoqItem.executedQuantity`.
* **Controlled Excess Execution**:
  - If `newCumulative > boqItem.quantity`, `isExcess = true`.
  - Requires explicit `allowExcess = true` and `excessJustification` ($\ge 10$ characters) authorized by `PROJECT_MANAGER`, `COMPANY_ADMIN`, or `COMPANY_OWNER`.
* **Compensating Corrections**:
  - Adjustments create new records with `isCorrection = true` and `supersedesMbRecordId`.
  - Follow standard workflow without mutating historical approved measurements.
* **Phase 10 Read-Only Billing Interface**:
  - Exposes `BoqBillingPositionDto` (contract amount, certified amount, remaining quantity, completion percentage) with zero financial mutations.
* **RBAC, Entitlements & Security**:
  - Enforces permissions: `projects:view` (read/billing), `projects:wbs:edit` or `projects:manage` (BOQ write), `projects:dpr:create`/`projects:dpr:submit` (MB create/submit), `projects:dpr:approve` or `projects:manage` (MB verify/approve/reject).
  - Feature entitlements: `projects:core` and `projects:wbs`.
  - Cross-tenant and cross-project boundaries strictly enforced across BOQ, MB, WBS, DPR, Task, and Vendor linkages.
* **Test Suite Verification**:
  - Dedicated Phase 07 BOQ Integration Suite: **21/21 tests passing** (`tests/boq.integration.test.ts`).
  - Dedicated Phase 07 Digital MB Integration Suite: **24/24 tests passing** (`tests/digital-mb.integration.test.ts`).
  - Total Dedicated Phase 07 Tests: **45/45 tests passing**.
  - Full Backend Monorepo Suite: **625/625 tests passing** across 37 test suites.
  - TypeScript Typecheck & Monorepo Build: 0 errors across backend, frontend, and owner workspaces.

---

### NEXT MILESTONE:
**FINAL FORENSIC GATE AUDIT FOR PHASE 07 — BILL OF QUANTITIES (BOQ) & DIGITAL MEASUREMENT BOOK (MB)**


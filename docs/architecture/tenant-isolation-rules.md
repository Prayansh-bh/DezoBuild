# DEZOBUILD — Multi-Tenant Isolation & Security Rules

## 1. Principles of Multi-Tenancy

DEZOBUILD operates as a strictly isolated multi-tenant SaaS. Under no circumstances may data from Company A leak to Company B, or be accessible by a user not explicitly provisioned inside that tenant.

---

## 2. Core Isolation Directives

### A. Database-Level Isolation
1. **Mandatory Tenant Foreign Key**:
   - Every tenant-scoped table in PostgreSQL (`Project`, `WbsActivity`, `DprRecord`, `Indent`, `PurchaseOrder`, `GoodsReceiptNote`, `MaterialItem`, `ExpenseRecord`, `PaymentRecord`, `Employee`, `AttendanceRecord`, `DocumentItem`, etc.) must include `tenantId VARCHAR NOT NULL REFERENCES Tenant(id)`.
2. **Tenant Scoping on All Queries**:
   - All Prisma / SQL queries must include `where: { tenantId }`. Unscoped `SELECT`, `UPDATE`, or `DELETE` queries are strictly forbidden.
3. **Row-Level Security (RLS)**:
   - PostgreSQL RLS policies enforce `current_setting('app.current_tenant_id') = tenant_id` on all tables.

### B. Project & Site Assignment Scoping
1. Users with roles `PROJECT_MANAGER`, `SITE_ENGINEER`, and `EMPLOYEE` operate within an additional scoping layer:
   - A `SITE_ENGINEER` assigned to "Project Alpha" cannot view or mutate DPRs, indents, or muster for "Project Beta" within the same company.
2. Executive roles (`COMPANY_OWNER`, `COMPANY_ADMIN`, `ACCOUNTANT`) have tenant-wide portfolio visibility.

### C. File Vault & Cloud Storage Isolation
1. Document storage keys must follow the structured format:
   `s3://dezobuild-vault/{tenantId}/projects/{projectId}/{category}/{documentId}_{filename}`
2. Pre-signed URLs for document viewing/downloading are generated with a strict 15-minute expiration and validated against the requesting user's tenant membership.

### D. Audit Logging & Compliance
1. Every write, update, approval, rejection, and deletion creates an immutable audit record:
   - `AuditLog`: `{ id, tenantId, userId, userEmail, userRole, entityType, entityId, action, ipAddress, userAgent, timestamp, metadata }`.
2. Cross-tenant access attempts trigger an automated `SECURITY_ALERT` logged to the Platform Owner telemetry feed.

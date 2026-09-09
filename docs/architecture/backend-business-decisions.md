# DEZOBUILD — Business Decisions & Product Policy Log

**Phase**: Backend Architecture Definition  
**Mode**: Explicit Policy Identification & Open Questions  
**Status**: Authoritative Blueprint (Pre-Implementation Gate)  

---

## 1. Explicit Open Business Decisions

The following architectural and operational policies require formal confirmation from the Product Owner / Business Leadership before backend database migrations and services are implemented. For each item, an architectural default recommendation is provided.

---

### Decision 1: Negative Inventory Policy
- **Question**: Is physical material inventory permitted to drop below zero (negative balance) when site emergency concrete pours occur before formal GRN entry?
- **Architectural Trade-off**: Permitting negative stock simplifies urgent field operations but corrupts weighted average valuation and audit trails.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **STRICT ZERO FLOOR (`CHECK (on_hand_qty >= 0)`)**. Emergency stock issues must require an expedited "Emergency GRN" or temporary override role authorization rather than permitting mathematical negative balances.

---

### Decision 2: Partial GRN Receipt & PO Amendment Rules
- **Question**: When a vendor delivers only 60 tons out of a 100-ton steel PO, can the remaining 40-ton PO commitment be cancelled or amended to a new vendor rate?
- **Architectural Trade-off**: Allowing in-place modification of active POs complicates historical committed cost tracking versus requiring an explicit PO Cancellation / Revision record.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **IMMUTABLE LINE ITEM WITH CANCELLATION ENTRY**. Once a PO has received its first partial GRN, line items cannot be deleted. The remaining balance can either be closed as "Fulfilled Short" or cancelled via an explicit amendment transaction.

---

### Decision 3: Multi-Tier Financial Approval Limits
- **Question**: Are financial approval limits (e.g. PM approves up to ₹50,000; Owner approves > ₹5,00,000) hardcoded system-wide or configurable per tenant?
- **Architectural Trade-off**: Configurable approval limit matrices increase schema complexity; fixed rules simplify V1 delivery.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **HYBRID DEFAULT MODEL**. V1 ships with standard defaults (PM ≤ ₹50,000; Owner > ₹50,000) stored in `tenant_settings.approval_thresholds` JSONB, enabling custom tenant overrides without schema migrations.

---

### Decision 4: Multi-Site Project Topologies
- **Question**: What constitutes a physical site? Can a single linear project (e.g. Highway Viaduct) have multiple geographically distinct site camps with independent store inventories?
- **Architectural Trade-off**: Single-site projects simplify store balances; multi-site hierarchies require inter-site stock transfer workflows.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **1-TO-MANY PROJECT-TO-SITE RELATIONSHIP**. Every Project contains one or more `ProjectSite` records. Store inventory and daily DPRs are anchored to specific sites, while commercial budgets and contracts aggregate at the project level.

---

### Decision 5: Cross-Project Role Scoping
- **Question**: Can a single employee hold different roles across different projects (e.g., `PROJECT_MANAGER` on Project A, but `VIEWER` on Project B)?
- **Architectural Trade-off**: Project-level role bindings require composite `(user_id, project_id, role_id)` tables instead of a single `user.role`.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **TENANT-LEVEL PRIMARY ROLE WITH PROJECT SCOPING IN V1**. A user holds a single organizational role (`PROJECT_MANAGER`), and access to specific projects is governed by `ProjectAssignment`. Cross-project polymorphic roles deferred to V2.

---

### Decision 6: Financial Posting & Payment Reversals
- **Question**: How should bounced vendor cheques or failed RTGS transfers be handled once a payment voucher is marked `POSTED`?
- **Architectural Trade-off**: Direct mutation of posted records violates accounting audit standards; contra-entries maintain full auditability.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **STRICT CONTRA-VOUCHER REVERSAL**. Once a payment is `POSTED`, its record is immutable. A failed or bounced transaction triggers a linked `PaymentReversal` contra-journal entry that restores the outstanding payable balance.

---

### Decision 7: Employee Directory Scoping
- **Question**: Are employee records (staff engineers, HR, accountants) tenant-global or restricted to specific project sites?
- **Architectural Trade-off**: Project-scoped HR complicates central payroll; tenant-global HR with site assignment enables centralized management with localized attendance.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **TENANT-GLOBAL EMPLOYEE DIRECTORY WITH SITE DEPLOYMENT POINTER**. Employees are registered at the corporate tenant level and assigned to active project sites for daily biometric muster tracking.

---

### Decision 8: Budget Revision & Contingency Allocation Rules
- **Question**: When a project experiences a cost overrun, how is the budget baseline revised? Does it require an explicit Change Order / Variation Approval?
- **Architectural Trade-off**: Allowing direct edits to `project.budget` hides cost variance; structured change orders preserve baseline vs variance integrity.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **IMMUTABLE ORIGINAL BASELINE WITH VARIATION LOGS**. `original_budget` remains frozen. Budget revisions create versioned `BudgetVariation` records signed off by `COMPANY_OWNER`.

---

### Decision 9: External Integration Boundaries
- **Question**: Which external third-party integrations are mandatory for V1 MVP?
  - Biometric Attendance Devices (ZKTeco / eSSL push API)
  - WhatsApp Business Notifications (Site DPR reminders)
  - Accounting ERP Export (Tally / Zoho Books XML/JSON export)
  - Payment Gateways (Razorpay / Cashfree for owner SaaS billing)
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **PAYMENT GATEWAY (RAZORPAY) MANDATORY FOR OWNER; TALLY JSON EXPORT & BIOMETRIC REST API HOOKS PROVIDED IN CUSTOMER V1**. Deep proprietary ERP syncs deferred to post-V1.

---

### Decision 10: Document & Drawing Statutory Retention
- **Question**: How long must superseded GFC architectural drawing revisions and vendor tax invoices be retained in active cloud storage?
- **Architectural Trade-off**: Perpetual hot storage increases cloud infrastructure costs; cold archiving requires retrieval delays.
- **Status**: `RECOMMENDATION — REQUIRES BUSINESS CONFIRMATION`
- **Default Recommendation**: **HOT STORAGE FOR ACTIVE REVISIONS + AUTOMATED 365-DAY S3 GLACIER COLD TIERING FOR SUPERSEDED VERSIONS**. Guarantees permanent compliance retention while minimizing storage expenditure.

# DEZOBUILD — Authoritative Backend Workflows, State Machines & Inventory/Financial Integrity

**Phase**: Backend Architecture Definition  
**Mode**: Domain Workflow & Transaction Specification  
**Status**: Authoritative Blueprint (Pre-Implementation Gate)  

---

## 1. Authoritative Workflow State Machines

Every state machine in DEZOBUILD is strictly deterministic. Transitions require an **authorized actor role**, an **explicit permission**, **prerequisite state validation**, and trigger **immutable audit side effects**.

---

### 1. Project Lifecycle State Machine
```mermaid
stateDiagram-v2
    [*] --> DRAFT : Create Project Form
    DRAFT --> ACTIVE : Sign-off Initial Baselines (COMPANY_OWNER / ADMIN)
    ACTIVE --> ON_HOLD : Work Suspension (Blocker / Cash Flow)
    ON_HOLD --> ACTIVE : Resume Construction
    ACTIVE --> COMPLETED : Final Handover & As-Built Acceptance
    COMPLETED --> ARCHIVED : Final Accounts Settled & Statutory Retention Complete
    ARCHIVED --> [*]
```

---

### 2. Daily Progress Report (DPR) Workflow
```mermaid
stateDiagram-v2
    [*] --> DRAFT : Site Engineer Fills Log
    DRAFT --> SUBMITTED : Submit Daily DPR with Photos
    SUBMITTED --> REVIEWED : QA/QC / Lead Eng Checks Measurements
    REVIEWED --> APPROVED : Project Manager Signs Off
    SUBMITTED --> REJECTED : Discrepancy Found (Quantity / Workmanship)
    REJECTED --> DRAFT : Site Engineer Corrects Submission
    APPROVED --> [*] : Cumulative Physical Progress Updated
```
- **Side Effect on `APPROVED`**: Advances cumulative progress on linked WBS activities, updates daily labour muster summary, and locks DPR photo attachments against editing.

---

### 3. Material Indent Workflow
```mermaid
stateDiagram-v2
    [*] --> DRAFT : Site Engineer Drafts Requisition
    DRAFT --> SUBMITTED : Site Indent Submitted
    SUBMITTED --> APPROVED : PM / Store Lead Approves
    SUBMITTED --> REJECTED : Rejected (Excess BOQ / Alternative Stock Available)
    APPROVED --> CONVERTED : Sourced into Purchase Order
    REJECTED --> DRAFT : Revised Requisition
    DRAFT --> CANCELLED : Request Abandoned
```

---

### 4. Purchase Order (PO) Lifecycle Workflow
```mermaid
stateDiagram-v2
    [*] --> DRAFT : Procurement Creates PO
    DRAFT --> SUBMITTED : Submit for Commercial Approval
    SUBMITTED --> APPROVED : Project Manager / Company Owner Signs Off
    SUBMITTED --> REJECTED : Commercial Terms Not Met
    APPROVED --> PARTIALLY_RECEIVED : First GRN Verified (Delivered < Contracted)
    PARTIALLY_RECEIVED --> RECEIVED : All Line Items Fully Delivered
    APPROVED --> RECEIVED : Single Complete GRN Receipt
    RECEIVED --> CLOSED : Vendor Invoice Matched & Paid
    APPROVED --> CANCELLED : Vendor Default / Order Revocation
```
- **Side Effect on `APPROVED`**: Creates commercial commitment entry in Financial Ledger (`committed_cost`), reserves budget line allocation.

---

### 5. Goods Receipt Note (GRN) & Physical Stock Verification Workflow
```mermaid
stateDiagram-v2
    [*] --> DRAFT : Security / Store Logs Gate Arrival
    DRAFT --> SUBMITTED : Delivery Challan & Weight Slip Uploaded
    SUBMITTED --> VERIFIED : Store Keeper Physical Count & Lab Quality OK
    VERIFIED --> APPROVED : Store Lead Approves GRN
    SUBMITTED --> REJECTED : Damaged / Out-of-Spec Material
    APPROVED --> [*] : Physical Stock Ledger Credited
```
- **Side Effect on `APPROVED`**: Executes atomic transaction:
  1. Writes debit to `stock_ledger_entries` for accepted quantities.
  2. Updates `inventory_balances` cached on-hand stock.
  3. Updates `purchase_orders.delivered_qty` (advances state to `PARTIALLY_RECEIVED` or `RECEIVED`).
  4. Generates a pending `payable` draft record for finance invoice matching.

---

### 6. Expense Voucher Workflow
```mermaid
stateDiagram-v2
    [*] --> DRAFT : Site Engineer / Staff Enters Voucher
    DRAFT --> SUBMITTED : Voucher Uploaded with Receipt
    SUBMITTED --> APPROVED : PM / Accountant Verifies Authenticity
    SUBMITTED --> REJECTED : Invalid Tax Invoice / Unapproved Scope
    APPROVED --> PAID : Cash Disbursed / UPI Transfer Executed
    PAID --> [*] : Incurred Cost Journal Posted
```

---

### 7. Vendor Payment Disbursement Workflow
```mermaid
stateDiagram-v2
    [*] --> DRAFT : Accountant Schedules Running Bill Payment
    DRAFT --> PENDING_APPROVAL : Payment Voucher Queued
    PENDING_APPROVAL --> APPROVED : Company Owner / Finance Lead Authorizes
    APPROVED --> POSTED : Bank Transfer / UTR Reference Recorded
    APPROVED --> FAILED : Bank Gateway Failure / Insufficient Funds
    FAILED --> PENDING_APPROVAL : Re-queued for Processing
```

---

### 8. Site Issue & Snag Rectification Workflow
```mermaid
stateDiagram-v2
    [*] --> OPEN : Snag Detected (Quality / Safety)
    OPEN --> ASSIGNED : Subcontractor / Lead Engineer Allocated
    ASSIGNED --> IN_PROGRESS : Rectification Commenced On-Site
    IN_PROGRESS --> RESOLVED : Contractor Submits Rectification Photo
    RESOLVED --> CLOSED : QA/QC Engineer Inspects & Signs Off
    RESOLVED --> REOPENED : Defect Persists / Sub-standard Finish
    REOPENED --> ASSIGNED
```

---

## 2. Hybrid Approval Architecture

DEZOBUILD implements a **Hybrid Tiered Approval Engine**:
- **Fixed System Rules (Baseline)**: High-risk mutations (GRN acceptance, DPR sign-off, user invitations) have fixed role-based approval gates.
- **Configurable Financial Thresholds**: Purchase orders, expenses, and payment vouchers enforce monetary thresholds:

```text
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ TRANSACTION VALUE                            │ REQUIRED APPROVER ROLE                       │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ PO / Expense ≤ ₹50,000                       │ PROJECT_MANAGER                              │
│ PO / Expense > ₹50,000 AND ≤ ₹5,00,000       │ PROJECT_MANAGER + ACCOUNTANT                 │
│ PO / Expense > ₹5,00,000 (Major Commercial)  │ COMPANY_OWNER                                │
│ Subcontractor Advance (Any Value)            │ PROJECT_MANAGER + COMPANY_OWNER              │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Authoritative Double-Entry Inventory Accounting

To guarantee mathematical consistency, inventory is never mutated with simple `stock = stock + x` statements. Every inventory event creates an **immutable stock ledger entry** with double-entry movements.

```mermaid
flowchart LR
    subgraph Procurement Inflow
        PO[Purchase Order] --> GRN[GRN Approved]
        GRN -->|Credit +Qty| Ledger[(Stock Ledger Entry)]
        Ledger -->|Cache Update| Balance[(Inventory Balances)]
    end

    subgraph Site Outflow
        Issue[Material Issue] -->|Debit -Qty| Ledger
        TransferOut[Transfer Outward] -->|Debit -Qty| Ledger
    end

    subgraph Return Inflow
        Return[Material Return] -->|Credit +Qty| Ledger
        TransferIn[Transfer Inward] -->|Credit +Qty| Ledger
    end
```

### Critical Inventory Guarantees:
1. **No Negative Stock**: An atomic database check (`CHECK (on_hand_qty >= 0)`) prevents material issues exceeding available unallocated store inventory.
2. **Double GRN Approval Prevention**: GRN approvals require an explicit transactional pessimistic lock (`SELECT * FROM goods_receipt_notes WHERE id = :id FOR UPDATE`). Once approved, status changes to `APPROVED` and cannot be re-executed.
3. **Idempotent Stock Transfers**: Stock transfer between Site A and Site B creates a single atomic transaction:
   - Debit outward from Site A `inventory_balances`
   - Create `in_transit` tracking record
   - Credit inward to Site B `inventory_balances` upon gate arrival signoff.

---

## 4. Financial Integrity & Transaction Boundaries

### Separation of Concerns:
1. **Document State**: Draft voucher with receipt photos (`DRAFT`).
2. **Approval State**: Management authorization (`APPROVED`).
3. **Posting State**: Bank settlement & general ledger posting (`POSTED`).

### Financial Transaction Boundaries:
- **Budget Commitment**: When a PO is approved, `committed_cost` on the project increases, preventing over-commitment against the approved baseline.
- **Cost Incurrence**: When a GRN is approved or an expense is marked `PAID`, `actual_cost` increases while `committed_cost` decreases by the matched amount.
- **Idempotency**: All payment disbursements require an `Idempotency-Key` header. If a network drop causes a client retry, the server returns the existing transaction receipt without executing duplicate debits.
- **No Mutation of Historical Financials**: Once an expense or payment voucher reaches `POSTED` status, it becomes permanently immutable. Adjustments require an explicit contra/reversal voucher linked to the original record.

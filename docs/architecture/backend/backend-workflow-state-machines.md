# DEZOBUILD — Operational Workflow State Machines (v1)

```text
================================================================================
Document ID     : ARCH-DEZ-006
Milestone       : BACKEND ARCHITECTURE BASELINE v1
Status          : AUTHORITATIVE BASELINE — FROZEN FOR IMPLEMENTATION
Scope           : State Machine Lifecycles, Invariants & Transition Rules
================================================================================
```

---

## 1. Core Financial & Commercial Lifecycles

### 1.1 Multi-Stage Contractor RA Billing State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create RA Bill against verified MB records
    DRAFT --> SUBMITTED: POST /contractor-ra-bills/:id/submit
    SUBMITTED --> VERIFIED: POST /contractor-ra-bills/:id/verify (Site Engineer quantity sign-off)
    SUBMITTED --> REJECTED: Reject with discrepancies
    VERIFIED --> APPROVED: POST /contractor-ra-bills/:id/approve (Project Manager / Commercial Head)
    VERIFIED --> REJECTED: Commercial rejection
    APPROVED --> PAYABLE: Auto-transition / Generate Accounts Payable ledger
    PAYABLE --> PAID: POST /payments/disburse (Idempotent Disbursement)
    REJECTED --> DRAFT: Correction by Contractor / Engineer
    PAID --> [*]
```

#### Transition Invariants:
* **Measurement Binding**: An RA bill cannot be created unless linked to `verified` Digital Measurement Book entries.
* **Statutory Calculation Integrity**: Deductions ($\text{Retention } 5\%$, $\text{TDS } 2\%$, $\text{Labour Cess } 1\%$, $\text{Advance Recovery}$) are calculated automatically on Gross Bill amount.
* **Approved $\neq$ Paid**: An `approved` or `payable` RA bill records a liability. Cash only leaves the account upon audited execution of `POST /api/v1/payments/disburse`.

---

### 1.2 Client Billing & Certification State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create Client Claim (Cumulative Work Execution)
    DRAFT --> SUBMITTED: POST /client-claims/:id/submit
    SUBMITTED --> CLIENT_CERTIFIED: POST /client-claims/:id/certify (Client / PMC Verification)
    SUBMITTED --> REJECTED: Client Disputed Claim
    CLIENT_CERTIFIED --> RECEIVABLE: Record Accounts Receivable
    RECEIVABLE --> RECEIVED: Record Inward Bank Receipt
    REJECTED --> DRAFT: Revised Claim Submission
    RECEIVED --> [*]
```

---

### 1.3 Site Petty Cash Expense State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Record Expense Claim
    DRAFT --> PENDING_APPROVAL: POST /expenses/:id/submit
    PENDING_APPROVAL --> APPROVED: POST /expenses/:id/approve (PM / Accountant)
    PENDING_APPROVAL --> REJECTED: Reject with note
    APPROVED --> PAID: POST /expenses/:id/pay (Petty Cash Box Disbursement)
    REJECTED --> DRAFT: Resubmission with proper vouchers
    PAID --> [*]
```

---

## 2. Procurement, Inventory & Stock Movement Lifecycles

### 2.1 Material Indent to Purchase Order to 3-Way Match GRN

```mermaid
stateDiagram-v2
    [*] --> INDENT_DRAFT: Site Indent Created
    INDENT_DRAFT --> INDENT_SUBMITTED: Submit for Site Approval
    INDENT_SUBMITTED --> INDENT_APPROVED: PM / Store Head Approves
    INDENT_SUBMITTED --> INDENT_REJECTED: Indent Rejected
    
    INDENT_APPROVED --> PO_DRAFT: Generate PO linked to Vendor
    PO_DRAFT --> PO_ISSUED: Issue PO (POST /purchase-orders/:id/issue)
    
    PO_ISSUED --> GRN_DRAFT: Gate Entry & Material Unloading
    GRN_DRAFT --> GRN_3WAY_VERIFIED: POST /grn/:id/verify (Qty & Quality Check)
    GRN_DRAFT --> GRN_FLAGGED: Quantity / Quality Discrepancy Flagged
    
    GRN_3WAY_VERIFIED --> STOCK_INCREMENTED: Atomic Stock Ledger (+ Receipts)
    STOCK_INCREMENTED --> PO_PARTIALLY_RECEIVED: Received Qty < PO Qty
    STOCK_INCREMENTED --> PO_DELIVERED: Received Qty >= PO Qty
    
    PO_DELIVERED --> [*]
```

#### 3-Way Match Verification Invariants:
1. **Quantity Verification**: $\text{Ordered Qty (PO)} \ge \text{Received Qty (Challan)} = \text{Accepted Qty} + \text{Rejected Qty}$.
2. **Atomic Ledger Posting**: Transitioning GRN to `verified` atomically increases `StockBalance.currentStock` at the target `Store` and appends an immutable `StockLedger` row of type `RECEIPT_GRN`.
3. **No Automatic Payment**: A verified GRN creates no payment voucher. Payment is authorized only after invoice matching by the `ACCOUNTANT`.

---

### 2.2 Store Material Issue & Inter-Site Stock Transfer

```mermaid
stateDiagram-v2
    state "Material Store Issue (To WBS)" as IssueFlow {
        [*] --> ISSUE_REQUESTED: Requisition raised for WBS Activity
        ISSUE_REQUESTED --> STOCK_VERIFIED: Check Store CurrentStock >= RequestedQty
        STOCK_VERIFIED --> ISSUE_POSTED: POST /stores/:id/issues (Atomic Stock Decrement & Ledger Append)
        ISSUE_POSTED --> [*]
    }
    
    state "Inter-Site Stock Transfer" as TransferFlow {
        [*] --> TRANSFER_DRAFT: Create Transfer Memo
        TRANSFER_DRAFT --> DISPATCHED: POST /stores/transfers (Source Store Stock Decremented)
        DISPATCHED --> IN_TRANSIT: Driver dispatched with E-Way bill
        IN_TRANSIT --> RECEIVED: POST /stores/transfers/:id/receive (Dest Store Stock Incremented)
        IN_TRANSIT --> DISCREPANCY: Quantity mismatch recorded
        RECEIVED --> [*]
    }
```

---

## 3. Project, Progress (DPR) & Technical Lifecycles

### 3.1 Daily Progress Report (DPR) State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Site Engineer compiles daily shift logs
    DRAFT --> SUBMITTED: POST /projects/:id/dpr/:dprId/submit
    SUBMITTED --> APPROVED: POST /projects/:id/dpr/:dprId/approve (Project Manager)
    SUBMITTED --> REJECTED: Mandatory rejection remarks
    APPROVED --> WBS_UPDATED: Atomic update to WbsActivity.actualQty
    REJECTED --> DRAFT: Engineer corrections
    WBS_UPDATED --> [*]
```

---

### 3.2 Concrete Pour Card State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Pour Card initiated (Grade, Element, Volume)
    DRAFT --> INSPECTION_SUBMITTED: Submit for multi-trade inspection
    INSPECTION_SUBMITTED --> APPROVED: 5-point checklist verified (Shuttering, Rebar, Cover, MEP, Cleaning)
    INSPECTION_SUBMITTED --> REJECTED: Quality defect detected
    APPROVED --> POURED: Pouring executed & Cube samples logged
    REJECTED --> DRAFT: Site rework
    POURED --> [*]
```

---

### 3.3 Non-Conformance Report (NCR) & Safety Incident Lifecycles

```mermaid
stateDiagram-v2
    state "QA/QC Non-Conformance (NCR)" as NcrFlow {
        [*] --> NCR_OPEN: Quality defect raised
        NCR_OPEN --> ASSIGNED: Assigned to Contractor / Gang
        ASSIGNED --> ACTION_REQUIRED: CAPA plan submitted
        ACTION_REQUIRED --> UNDER_VERIFICATION: Site rectification executed
        UNDER_VERIFICATION --> CLOSED: Quality Engineer verified & signed off
        CLOSED --> [*]
    }
    
    state "Safety & EHS Incident" as SafetyFlow {
        [*] --> INCIDENT_OPEN: Near-miss or LTI reported
        INCIDENT_OPEN --> UNDER_INVESTIGATION: Safety Officer root-cause analysis
        UNDER_INVESTIGATION --> CAPA_IMPLEMENTED: Corrective safety actions deployed
        CAPA_IMPLEMENTED --> CLOSED: Safety Director review & closeout
        CLOSED --> [*]
    }
```

---

### 3.4 GFC Drawings & Technical RFI Lifecycles

```mermaid
stateDiagram-v2
    state "GFC Drawing Revisions" as DrawingFlow {
        [*] --> REV_UNDER_REVIEW: New revision uploaded
        REV_UNDER_REVIEW --> GFC_ISSUED: Stamped Good for Construction (GFC)
        GFC_ISSUED --> SUPERSEDED: Subsequent revision approved (Rev N+1)
        SUPERSEDED --> [*]
    }
    
    state "Technical Request for Information (RFI)" as RfiFlow {
        [*] --> RFI_OPEN: Site query raised
        RFI_OPEN --> UNDER_REVIEW: Assigned to Consultant / Structural Engineer
        UNDER_REVIEW --> ANSWERED: Engineering clarification provided
        ANSWERED --> CLOSED: RFI acknowledged & implemented on site
        CLOSED --> [*]
    }
```

---

## 4. Policy-Driven Multi-Stage Approval Engine

```mermaid
stateDiagram-v2
    [*] --> STAGE_1: Mutation exceeds threshold (e.g. Expense > ₹50,000)
    STAGE_1 --> STAGE_2: Stage 1 Approver decides APPROVED (e.g. Project Manager)
    STAGE_1 --> REJECTED: Stage 1 Approver decides REJECTED
    STAGE_2 --> FINAL_APPROVED: Stage 2 Approver decides APPROVED (e.g. Company Owner)
    STAGE_2 --> REJECTED: Stage 2 Approver decides REJECTED
    STAGE_1 --> ESCALATED: Exceeded 48h timeout without decision
    STAGE_2 --> ESCALATED: Exceeded 48h timeout without decision
    FINAL_APPROVED --> MUTATION_COMMITTED: Execute target domain state transition
    REJECTED --> MUTATION_ABORTED: Document returned to draft/rejected
```

#### Segregation of Duties Rules:
1. `Creator != Approver`: The user who authored the initial document is strictly prevented from approving any stage of the workflow.
2. `Single-Approver Override`: If configured by enterprise policy on low-value items ($<\text{₹}5,000$), single-step approval is permitted.

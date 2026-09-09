# DEZOBUILD — Operational Workflows & Standard Operating Procedures

## 1. Daily Site Operations Lifecycle (DPR & Telemetry)

```mermaid
sequenceDiagram
    participant SE as Site Engineer
    participant DPR as DPR Engine
    participant Store as Materials Store
    participant PM as Project Manager
    participant Owner as Owner Dashboard

    SE->>DPR: 1. Input Daily Labour Muster & Weather
    SE->>DPR: 2. Record WBS Quantity Progress
    SE->>Store: 3. Verify Material Consumption & Issues
    SE->>DPR: 4. Upload Site Inspection Photos & Issues
    DPR->>PM: 5. Submit DPR for Review
    PM->>DPR: 6. Approve DPR
    DPR->>Owner: 7. Sync Cumulative Progress & Cost Burn
```

---

## 2. Procurement & 3-Way Match Verification Lifecycle

```mermaid
sequenceDiagram
    participant Site as Site Engineer
    participant PM as Project Manager
    participant Vendor as Supplier / Vendor
    participant Gate as Storekeeper / Gate
    participant Acc as Accounts / Finance

    Site->>PM: 1. Raise Material Requisition (Indent)
    PM->>Vendor: 2. Approve Indent & Issue Purchase Order (PO)
    Vendor->>Gate: 3. Dispatch Material with Invoice / Delivery Challan
    Gate->>Gate: 4. Conduct Inspection & Weighbridge Check (GRN)
    Gate->>Acc: 5. 3-Way Match (Indent vs PO vs GRN vs Invoice)
    Acc->>Vendor: 6. Process Payment Voucher & Release Payout
```

---

## 3. Exception & Smart Alert Escalation Lifecycle

1. **Trigger Condition**: WBS activity delay > 3 days, actual cost > 10% budget variance, or material stock < safety stock.
2. **Alert Broadcast**: Dispatched directly to the DEZOBUILD top nav indicator and Alerts module.
3. **Acknowledgment**: Field engineer / PM reviews site constraints and flags acknowledgment.
4. **Resolution**: Corrective action executed on site (e.g. material replenishment, gang reallocation) and marked resolved with timestamped site notes.

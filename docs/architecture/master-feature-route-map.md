# DEZOBUILD — Master Feature-to-Route Map

**Authoritative UX Architecture & Route Binding Specification**  
**Core Domain Paradigm:** `PROJECT` → `MONEY` → `MATERIAL` → `PEOPLE` → `EQUIPMENT` + `ALERTS` + `DOCUMENTS` + `REPORTS` + `SETTINGS` + `OWNER PORTAL`  
**Milestone:** `FRONTEND PRODUCT SCOPE COMPLETE — BACKEND IMPLEMENTATION REQUIRED`

---

## 1. Domain: Executive Overview (`/`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Role-Specific Home Dashboard | `/` | Default | Contextual metrics, active site rollups, pending items | Switch role view / Drilldown | All 9 Roles | Starter, Pro, Enterprise |
| Company Owner Executive View | `/` | Executive Mode | Cross-project financial burn, critical risk feed, site radar | View site anomalies | Company Owner | Pro, Enterprise |
| Site Engineer Daily Focus View | `/` | Field Mode | Today's DPR checklist, muster pending, incoming indents | Create DPR / Mark Muster | Site Engineer | Starter, Pro, Enterprise |
| Project Manager Project Health Radar | `/` | PM Mode | S-Curve slippage, delay warnings, unapproved POs | Approve Indent / PO | Project Manager | Pro, Enterprise |
| Accountant Financial Radar | `/` | Accounts Mode | Unpaid vouchers, advances outstanding, cash balance | Approve Payment | Accountant | Starter, Pro, Enterprise |
| Store Keeper Material Radar | `/` | Store Mode | Low stock alert items, pending GRN verification | Record GRN / Issue | Procurement / Store | Starter, Pro, Enterprise |
| HR Workforce Radar | `/` | HR Mode | Daily muster count, overtime impact, understrength gangs | Log Muster Roll | HR | Starter, Pro, Enterprise |

---

## 2. Domain: Projects (`/projects`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Project Portfolio Grid / Table | `/projects` | Active Sites / All | Multi-card grid & dense table with health tags & capacity banner | Filter by status / Search | All 9 Roles | Starter (2), Pro (10), Enterprise (Unltd) |
| Create New Project | `/projects/new` | Multi-Step Wizard | Setup name, code, client, dates, budget, team with capacity guard | Save Project | Owner, Admin, PM | Starter (2), Pro (10), Enterprise (Unltd) |
| Project Overview Dashboard | `/projects/$id` | Overview Tab | Progress %, Budget vs Actual, variance, site team | Edit Project Metadata | All 9 Roles | Starter, Pro, Enterprise |
| Work Breakdown Structure (WBS) | `/projects/$id` | WBS & Schedule Tab | Hierarchical tree (Substructure, Superstructure, MEP) | Add Activity / Tree View | PM, SE, Owner | Pro, Enterprise |
| Interactive Gantt & Dependencies | `/projects/$id` | Gantt Tab | Gantt bar visualization with FS/SS dependency linkages & lag | Link Predecessor | PM, SE, Owner | Enterprise |
| Look-ahead Planning Board | `/projects/$id` | Look-ahead Tab | 2-week / 4-week forward activity commitment board | Commit Lookahead Plan | PM, SE | Pro, Enterprise |
| BOQ Master Schedule | `/projects/$id` | BOQ Tab | Master item quantity schedule, client rate, tender spec | Add Item / Import Excel | PM, SE, Owner | Enterprise |
| Digital Measurement Book (MB) | `/projects/$id` | Digital MB Tab | L×B×D dimension formulas, previous/current/cumulative qty | Record Measurement | SE, PM, Accountant | Enterprise |
| Commercials & Project Profitability | `/projects/$id` | Commercials Tab | Contract value, actual cost, committed cost, margin %, EAC | Export Cost Summary | Owner, PM, Accountant | Pro, Enterprise |
| QA/QC Pour-Cards & NCR Tickets | `/projects/$id` | Quality & NCR Tab | Pre-Pour Checklists, Pour Cards, NCR ticket lifecycle with CAPA | Log NCR / Sign Pour Card | SE, PM, Owner | Enterprise |
| Site Safety & EHS Inspections | `/projects/$id` | Safety & EHS Tab | Daily EHS walkthrough, PPE audits, near-miss/incident reports | Report Incident | All Site Roles | Enterprise |
| GFC Drawing Register & Revisions | `/projects/$id` | Drawings Tab | Discipline classification, revision control (`Rev 01`, `Rev 02`, `SUPERSEDED`) | Upload Drawing Revision | PM, SE | Enterprise |
| RFI / Technical Query Desk | `/projects/$id` | RFI Desk Tab | RFI queries, discipline routing, consultant reply drawer | Create RFI / Reply | SE, PM, Owner | Enterprise |
| Work Readiness Score Composite | `/projects/$id` | Readiness Tab | Composite readiness across Materials, Gangs, Drawings, Permits | Check Readiness | PM, Owner | Enterprise |
| Project Health Diagnostics | `/projects/$id` | Health Tab | Multi-factor composite health (Cost, Sched, Quality, Safety) | Run Diagnostic | Owner, PM | Enterprise |
| Daily Progress Reports (DPR) | `/projects/$id` | DPR Tab | Daily logs with manpower, plant, materials & photos | Create DPR / Approve DPR | PM, SE, Owner | Starter, Pro, Enterprise |
| Site Photo Gallery | `/projects/$id` | Photos Tab / DPR Modal | Time-stamped geo-tagged construction site captures | Upload Site Photo | PM, SE | Starter, Pro, Enterprise |

---

## 3. Domain: Material & Store (`/materials`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Store Inventory Register | `/materials` | Inventory Tab | Live stock balance, reorder level, unit rate, value | Filter by Warehouse / Search | Store, PM, Owner | Starter, Pro, Enterprise |
| Material Indents (Requisitions) | `/materials` | Indents Tab | Site requisition form with priority & required date | Create Indent / Approve | SE, PM, Store | Pro, Enterprise |
| Purchase Orders (PO) | `/materials` | Purchase Orders Tab | Vendor PO generation with rate, taxes & payment terms | Issue PO / 2-Way Match | Procurement, Owner | Pro, Enterprise |
| Goods Received Note (GRN) | `/materials` | GRN Tab | Challan recording, vehicle no, quantity acceptance | Record GRN / Verify | Store, SE | Starter, Pro, Enterprise |
| Material Issue | `/materials` | Issues Tab | Issue stock to specific WBS code & site gang | Issue Material | Store, SE | Starter, Pro, Enterprise |
| Material Return | `/materials` | Returns Tab | Return excess, damaged, or scrap material to store | Record Material Return | Store, SE | Pro, Enterprise |
| Inter-Project Stock Transfers | `/materials` | Transfers Tab | Multi-warehouse dispatch, transit tracker & receipt | Dispatch / Confirm Receipt | Store, PM | Pro, Enterprise |
| Vendor Directory & Rates | `/materials` | Vendors Tab | Supplier contacts, GSTIN, active PO count, rating | Add Vendor / Edit | Procurement, Acct | Pro, Enterprise |
| Material Consumption Reconciliation | `/materials` | Reconciliation Tab | Theoretical standard vs actual store issue variance & leakage | Check Variance / Leakage | Store, PM, Owner | Enterprise |
| Dead & Non-Moving Stock Analysis | `/materials` | Dead Stock (>90d) Tab | Idle stock tying up working capital (>90 days) | Analyze Dead Stock | Store, PM, Owner | Enterprise |
| Reorder Planning | `/materials` | Reorder Planning Tab | Auto-calculated replenishment suggestions from lead times | Plan Replenishment | Store, Procurement | Enterprise |
| Master Materials Excel Import | `/materials` | Import Wizard Modal | 5-step file ingestion: Upload → Detect → Map → Validate → Report | Import Materials XLSX | Store, Admin | Enterprise |

---

## 4. Domain: Finance & Cost (`/finance`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Expense Ledger | `/finance` | Expenses Tab | Expense voucher entry, category filter, receipt proof | Add Expense / Approve | All authorized | Starter, Pro, Enterprise |
| Payments & Vouchers | `/finance` | Payments Tab | Vendor / contractor payment schedule & status | Request Payment / Mark Paid | Acct, Owner, PM | Starter, Pro, Enterprise |
| Contractor RA Billing Suite | `/finance` | Contractor RA Bills Tab | Gross Bill, Retention %, Advance Recovery, TDS, Labour Cess | Create / Certify RA Bill | Acct, PM, Owner | Enterprise |
| Client Billing (GST Claim) | `/finance` | Client Billing Tab | Cumulative certified work, 18% GST calculation, net claim | Generate Client Claim | Acct, Owner | Enterprise |
| Final Bill Closeout | `/finance` | Final Bills Tab | Retention release, recovery offsets, No-Claim certificate | Settle Final Bill | Owner, Acct | Enterprise |
| 30/60/90-Day Cash Flow Projection | `/finance` | Cash Flow Tab | Rolling liquidity projection of inflows vs outflows | Analyze Cash Horizon | Owner, Acct | Enterprise |
| Receivables & Payables Aging | `/finance` | Aging Tab | Current, 1–30, 31–60, 61–90, 90+ day maturity buckets | View Aging Ledgers | Owner, Acct | Enterprise |
| Project Profit & Loss (P&L) | `/finance` | Project P&L Tab | Certified revenue vs direct material/labor/machinery cost | View Project P&L | Owner, Acct | Enterprise |
| Advances & Recovery | `/finance` | Advances Tab | Subcontractor, supplier, employee advance balance | Issue Advance / Recover | Acct, Owner | Pro, Enterprise |
| Budget Matrix | `/finance` | Budget Matrix Tab | Category-level planned vs actual vs committed budget | Edit Budget Allocation | Owner, PM, Acct | Pro, Enterprise |
| Vendor Excel Master Import | `/finance` | Import Wizard Modal | Bulk vendor master ingestion with GSTIN validation | Import Vendors XLSX | Acct, Admin | Enterprise |

---

## 5. Domain: People & Labour (`/people`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Staff Directory | `/people` | Staff Directory Tab | Internal staff directory, roles, phone, assigned site | Add Employee / Filter | HR, Admin, Owner | Starter, Pro, Enterprise |
| Gangs & Labour Contractors | `/people` | Gangs & Workers Tab | Subcontractor workforce deployment & wage rate | Add Gang / Assign Trade | HR, PM, SE | Starter, Pro, Enterprise |
| Daily Muster Roll | `/people` | Muster Roll Tab | Headcount, trade-wise present/absent, overtime (OT) | Log Daily Muster | HR, SE | Starter, Pro, Enterprise |
| Workforce Productivity Analysis | `/people` | Productivity Tab | Output achieved per man-day vs CPWD standard norms | Evaluate Productivity | PM, SE, HR | Enterprise |
| Subcontractor Performance Scorecard | `/people` | Scorecard Tab | Quality, Timeliness, Safety, and Manpower rating matrix | Score Contractor | PM, Owner | Enterprise |
| Workforce Shortage Forecast | `/people` | Shortage Forecast Tab | Trade demand vs gang supply from lookahead schedules | Plan Gang Mobilization | PM, HR | Enterprise |
| Staff & Worker Excel Import | `/people` | Import Wizard Modal | 5-step bulk employee and worker spreadsheet ingestion | Import Staff/Workers XLSX| HR, Admin | Enterprise |

---

## 6. Domain: Equipment & Machinery (`/equipment`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Machinery Registry | `/equipment` | Registry Tab | Fleet list (Owned/Rented), hour meter, operator | Add Machinery | PM, Store | Pro, Enterprise |
| Fleet Utilization Analysis | `/equipment` | Utilization Tab | Operating vs available hours % (`Operating / Available * 100`)| Analyze Utilization | PM, Store, Owner | Enterprise |
| Operating Cost per Hour Rollup | `/equipment` | Cost Analysis Tab | Fuel + Operator + Maintenance + Rental hourly TCO | Calculate Hourly TCO | PM, Acct | Enterprise |
| Statutory Compliance & Expiry | `/equipment` | Compliance Tab | Fitness, road tax, insurance expiry alerts & certificates | Update Compliance Doc | Store, PM | Enterprise |
| Fuel Telematics & Logs | `/equipment` | Fuel Logs Tab | Quantity dispensed (Liters), rate, LPH efficiency | Log Fuel Dispensation | SE, Store | Pro, Enterprise |
| Maintenance & Breakdowns | `/equipment` | Maintenance Tab | Preventive service countdown, breakdown repair tickets | Create Repair Ticket | PM, Store | Pro, Enterprise |

---

## 7. Domain: Alerts & Smart Assistant (`/alerts`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Smart Alert Feed | `/alerts` | Operational Feed | Severity tags, impact in ₹/days, remediation CTAs | Acknowledge / Resolve | All 9 Roles | Starter, Pro, Enterprise |
| Custom Alert Rule Builder | `/alerts` | Rule Builder Tab | Metric, Operator, Threshold, Scope, Severity, Recipient | Save Alert Rule | Owner, Admin | Enterprise |
| AI & Predictive UI Shells | `/alerts` | Predictive AI Tab | Delay Prediction, Overrun Forecast, Copilot Drawer (Shell) | Open AI Assistant | All 9 Roles | Enterprise |

---

## 8. Domain: Documents & Vault (`/documents`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Document Vault Explorer | `/documents` | Vault Explorer | Category folders (Contracts, Drawings, Commercial, HR) | Upload / Download File | All 9 Roles | All Plans |
| Central GFC Drawing Register | `/documents` | Drawing Register | Discipline categorization, revision history & superseded state | Register Drawing | PM, SE | Enterprise |
| Central RFI Technical Query Desk | `/documents` | RFI Desk | Cross-project query tracker with consultant reply drawer | Create RFI / Reply | SE, PM, Owner | Enterprise |

---

## 9. Domain: Administration & Settings (`/settings`)

| Feature Name | Route | Sub-route / Tab | Detail Workflow | Primary Action | Role Access | Plan Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Company Profile & Statutory | `/settings` | Company Tab | GSTIN, PAN, CIN, Registered Address, Billing contact | Edit Company Profile | Owner, Admin | All Plans |
| Multi-Company Legal Entities | `/settings` | Company Tab | Subsidiary corporate entities (`Tenant → Legal Entity`) | Register Legal Entity | Owner, Admin | Enterprise |
| Regional Operational Branch Hubs | `/settings` | Branches Tab | State circles and regional operating branches | Add Operational Branch | Owner, Admin | Enterprise |
| Custom Multi-Stage Approval Matrix | `/settings` | Approval Matrix Tab | PO, Expense, Payment, GRN, DPR, Leave with SoD toggle | Configure Workflow | Owner, Admin | Enterprise |
| Developer API Keys & Webhooks | `/settings` | API Keys & Webhooks | API access token generation/revocation & Webhook URLs | Generate Key / Webhook | Owner, Admin | Enterprise |
| Team & User Management | `/settings` | Team Tab | User provisioning with 9-role authorization assignment | Invite User | Owner, Admin | All Plans |
| RBAC Capability Matrix | `/settings` | Roles Tab | Role-Based Access Control matrix across operational modules | Inspect Permissions | All 9 Roles | All Plans |
| Security Audit Trail | `/settings` | Security Audit Tab | Operational audit log of user logins and administrative actions | View Audit Log | Owner, Admin | Enterprise |

---

## 10. Domain: Platform Owner Portal (`owner/`)

| Module | Route | Detail Workflow | Primary Action | Role Access |
| :--- | :--- | :--- | :--- | :--- |
| Platform Overview | `/` | Tenant growth, subscription distribution, system telemetry | View Health | Platform Owner |
| Tenant Operations | `/tenants` | Tenant directory, status toggle, provisioning modal | Provision Tenant | Platform Owner |
| Subscriptions & Plans | `/subscriptions` | Subscription tier allocation, billing frequency, renewal | Manage Subscription | Platform Owner |
| Entitlement Catalog | `/entitlements` | Feature catalog and plan tier entitlement matrix | Configure Matrix | Platform Owner |
| Infrastructure Telemetry | `/health` | API latency, database pool, worker health (cold-boot clean) | Run Health Check | Platform Owner |
| Platform Audit Logs | `/audit` | Administrative security events and configuration audits | Export Audit Log | Platform Owner |
| Support Desk | `/support` | Platform support tickets and incident escalation queue | Resolve Ticket | Platform Owner |

```
===================================================================================
FINAL MILESTONE:
FRONTEND PRODUCT SCOPE COMPLETE — BACKEND IMPLEMENTATION REQUIRED
===================================================================================
```

# DEZOBUILD — UI/UX Refinement & Visual QA Audit

**Date:** September 2026  
**Status:** Audit Complete — Refinement Plan Active  
**Scope:** Complete Frontend (Routes, Components, Layouts, Mobile Responsiveness, Data Presentation, Accessibility)

---

## 1. Executive Summary & Current Strengths

### Current Strengths

1. **Rich Domain Scope:** The application successfully models real-world Indian construction workflows (Projects, WBS, DPRs, Indents, POs, GRNs, Material Issues, Contractor Advances, Muster Roll Attendance, Machinery Fuel/Hours, Smart Variance Alerts, GFC Drawings).
2. **State & Store Architecture:** All mutations, filters, and relationships (projects ↔ alerts ↔ finances ↔ materials) operate reactively with zero runtime errors.
3. **Typography & Styling Foundation:** Clean modern font stack (`Inter`, `Plus Jakarta Sans`, `JetBrains Mono`) with OKLCH design tokens.

---

## 2. Identified UX Problems & Visual Inconsistencies

### A. "Card Soup" & Excessive Nesting

- **Issue:** Several pages wrap every element inside bordered, shadowed `div` cards, creating visual clutter rather than clean, breathable sections.
- **Remedy:** Restrict cards to primary KPIs, critical alerts, and summary highlights. Use clean table layouts, subtle dividers, and whitespace for secondary information.

### B. Project 360 Navigation Density

- **Issue:** Project 360 (`/projects/$id`) currently uses a single horizontal 10-tab list. On medium and small viewports, this list wraps awkwardly or clips.
- **Remedy:** Introduce an intelligently grouped secondary navigation on desktop:
  - **Overview**
  - **Execution:** WBS & Activities, Daily Progress / DPR, Milestones
  - **Resources:** Materials & Stores, Labour & Gangs, Equipment Fleet
  - **Commercial:** Expenses & Cost, Billing & Payments
  - **Control:** Alerts & Risks, Drawings & Documents
  - On mobile, provide a clean dropdown/segmented selector.

### C. Materials Workflow Discoverability

- **Issue:** Material stages (Indents, POs, GRNs, Inventory, Issues) exist only inside tabs, obscuring the natural construction lifecycle.
- **Remedy:** Add an interactive visual workflow progress header at the top of `/materials`:
  `REQUISITION (12) → PROCUREMENT (8) → RECEIVING (5) → STORE (Healthy/Low) → ISSUE → RECONCILIATION`.

### D. Finance Decision Hierarchy

- **Issue:** Incurred expenses table is positioned high up, while high-level executive financial metrics (Committed POs, Pending Bills, Overdue Advances) are not grouped with strong visual priority.
- **Remedy:** Place top-level financial decision metrics first: `Approved Budget`, `Actual Cost`, `Committed (Open POs)`, `Pending Payables`, `Overdue Bills`, `Contractor Advances`, followed by visual Budget vs. Actual progress and financial risk highlights before detailed transaction logs.

### E. People & Attendance Mobile UX

- **Issue:** Attendance table is dense for site supervisors on mobile devices.
- **Remedy:** Enhance attendance with a "Mark All Present" button, gang/project filter, and large touch-friendly status pills (Present, Absent, Half Day) with quick OT hour controls.

### F. Equipment Fleet Command

- **Issue:** Equipment statuses are presented without prominent operational exception visibility for breakdowns.
- **Remedy:** Provide a Fleet Command ribbon: `Total Fleet (24)`, `Running (18)`, `Idle (3)`, `Maintenance (2)`, and a prominent high-priority badge for `Breakdown (1)`.

### G. Prototype Data Honesty

- **Issue:** Simulated labels like `"Live Site Sync"`, `"100% Data Accuracy"`, `"Verified against site transactions"` imply real backend integrations.
- **Remedy:** Replace with transparent, honest labels such as `"Prototype Demo Data"`, `"Sample Portfolio"`, and `"Configured Templates"`.

### H. Mobile Responsiveness (375px)

- **Issue:** Dual Quick Add buttons on mobile (floating button + bottom bar Add button) overlap bottom content.
- **Remedy:** Unify mobile quick-add into the bottom navigation bar and ensure all tables support either clean horizontal scroll or responsive stacked cards.

---

## 3. Recommended Implementation Roadmap

| Step   | Area                              | Key Actions                                                                                                |
| :----- | :-------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **1**  | **Global Design & Honesty**       | Refine prototype labels in `app-shell`, update Indian numbering consistency (`₹4.20 L`, `₹1.24 Cr`).       |
| **2**  | **Project 360 (`/projects/$id`)** | Grouped navigation sidebar/drawer, context-rich header, WBS hierarchy tree indicators.                     |
| **3**  | **Materials (`/materials`)**      | Visual construction workflow ribbon (`Indents → POs → GRNs → Stock → Issues`), low-stock badge thresholds. |
| **4**  | **Finance (`/finance`)**          | Executive decision metrics, Budget vs Actual progress bar, Financial Risk list, transaction tables.        |
| **5**  | **People & Labour (`/people`)**   | Mobile-first attendance workflow, "Mark All Present", Gang selectors, large touch targets.                 |
| **6**  | **Equipment (`/equipment`)**      | Fleet command overview, prominent breakdown alert, operational machinery logs.                             |
| **7**  | **Alerts Hub (`/alerts`)**        | Incident workspace layout, structured fields (Problem, Root Cause, Impact, Action), drawer preview.        |
| **8**  | **Reports (`/reports`)**          | Analytical workspace: Report Catalog → Filters → S-Curve / Visual analysis → Data table → Export.          |
| **9**  | **Documents (`/documents`)**      | Construction document control (Drawing Rev vs Doc Version, upload, preview).                               |
| **10** | **Global Search & Quick Add**     | Grouped results, streamlined 2-step quick add modal.                                                       |
| **11** | **Verification & QA**             | `npx tsc --noEmit`, `npm run build`, responsive checks at 375px / 768px / 1024px / 1440px.                 |

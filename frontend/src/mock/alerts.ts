import type { SmartAlert } from "./types";

export const initialAlerts: SmartAlert[] = [
  {
    id: "alt-001",
    title: "Steel consumption 18% above planned baseline",
    projectId: "proj-001",
    projectName: "Orion Heights",
    severity: "critical",
    category: "Material",
    problem:
      "TMT Rebar Fe500D consumption for Tower A superstructure (20th-22nd floors) exceeded theoretical BBS by 18.4%.",
    rootCause:
      "Excessive lapping lengths on heavy diameter 25mm rebar bundles and untracked scrap cut-pieces offloading.",
    impact: "Estimated ₹4.2L direct material cost overrun and potential safety buffer depletion.",
    impactAmount: 420000,
    impactDays: 0,
    suggestedAction:
      "Conduct physical bar bending schedule (BBS) reconciliation with Mahadev Barbending Gang supervisor before issuing next 23rd floor steel bundle.",
    sourceRef: {
      type: "WBS Activity",
      id: "wbs-107",
      label: "WBS 2.2 · TMT Fe500D Rebar Cutting & Binding",
      to: "/projects/proj-001",
    },
    status: "open",
    assignedTo: "Rahul Menon (Senior PM)",
    createdAt: "2026-09-07 09:30 IST",
    history: [
      {
        action: "Triggered by Automated Variance Engine",
        by: "System",
        timestamp: "2026-09-07 09:30 IST",
      },
    ],
  },
  {
    id: "alt-002",
    title: "Foundation piling milestone delayed by 6 days",
    projectId: "proj-002",
    projectName: "Metro Depot Package 2",
    severity: "critical",
    category: "Schedule",
    problem:
      "Stabling line 4 pile driving rate has dropped to 3 piles/day against planned baseline of 5 piles/day.",
    rootCause:
      "Dense basalt rock boulder layer encountered at 12m depth requiring slow core-barrel augering plus excavator breakdown.",
    impact:
      "6 days critical path slippage impacting track laying handover scheduled for next month.",
    impactAmount: 180000,
    impactDays: 6,
    suggestedAction:
      "Mobilize secondary rotary hydraulic piling rig HR-220 to operate simultaneous second shift.",
    sourceRef: {
      type: "WBS Activity",
      id: "wbs-201",
      label: "WBS 1.0 · Piling & Substructure Foundation",
      to: "/projects/proj-002",
    },
    status: "open",
    assignedTo: "Sunita Deshpande (Project Director)",
    createdAt: "2026-09-07 07:15 IST",
    history: [
      {
        action: "Flagged from Daily Progress Report DPR-MTR-2026-0907",
        by: "System",
        timestamp: "2026-09-07 07:15 IST",
      },
    ],
  },
  {
    id: "alt-003",
    title: "Excavator EX-220 hydraulic hose breakdown on critical path",
    projectId: "proj-002",
    projectName: "Metro Depot Package 2",
    severity: "critical",
    category: "Equipment",
    problem:
      "Komatsu PC210 crawler excavator suffered sudden main hydraulic delivery hose rupture during spoil clearing.",
    rootCause:
      "Scheduled 2000-hour preventative hydraulic circuit maintenance was deferred by 45 operating hours.",
    impact: "Piling spoil clearing halted for 14 hours; ₹28,500 emergency repair ticket created.",
    impactAmount: 28500,
    impactDays: 1,
    suggestedAction:
      "Authorize emergency Komatsu mobile technician ticket and enforce mandatory pre-shift hydraulic pressure checks across all active excavators.",
    sourceRef: {
      type: "Equipment Asset",
      id: "eq-002",
      label: "Asset EX-220 · Crawler Excavator",
      to: "/equipment",
    },
    status: "open",
    assignedTo: "Girish Kulkarni (Site Engineer)",
    createdAt: "2026-09-06 14:20 IST",
    history: [
      {
        action: "Maintenance ticket MNT-2026-0044 created",
        by: "Girish Kulkarni",
        timestamp: "2026-09-06 14:25 IST",
      },
    ],
  },
  {
    id: "alt-004",
    title: "M-Sand inventory below minimum safety reorder threshold",
    projectId: "proj-002",
    projectName: "Metro Depot Package 2",
    severity: "attention",
    category: "Material",
    problem: "Khadki yard M-Sand stock currently at 1,200 cft (Threshold: 2,000 cft).",
    rootCause:
      "Supplier Anand Steel delayed dispatched bulk tipper loads by 48 hours due to highway RTO checks.",
    impact: "Risk of track bed concrete batching stoppage within next 48 hours if unfulfilled.",
    impactAmount: 96000,
    suggestedAction:
      "Expedite delivery under PO-2026-0492 or divert 400 cft stock from Greenfield Logistics Park warehouse.",
    sourceRef: {
      type: "Material Master",
      id: "mat-003",
      label: "MAT-SND-01 · Manufactured Sand",
      to: "/materials",
    },
    status: "open",
    assignedTo: "Imran Shaikh (Store Keeper)",
    createdAt: "2026-09-07 08:00 IST",
    history: [
      {
        action: "System inventory threshold monitor triggered",
        by: "System",
        timestamp: "2026-09-07 08:00 IST",
      },
    ],
  },
  {
    id: "alt-005",
    title: "Vendor invoice overdue by 6 days (Shreeji Ready Mix)",
    projectId: "proj-001",
    projectName: "Orion Heights",
    severity: "attention",
    category: "Payment",
    problem: "Vendor bill INV-2026-8812 for ₹18.4L remains unpaid past due date (2026-09-01).",
    rootCause: "Pending client milestone payment clearance from Orion Developers.",
    impact: "Vendor has threatened hold on Friday's scheduled 23rd floor slab RMC delivery.",
    impactAmount: 1840000,
    suggestedAction:
      "Release 50% partial payment (₹9.2L) from project petty treasury and notify vendor dispatch coordinator.",
    sourceRef: {
      type: "Payment Voucher",
      id: "pay-001",
      label: "Voucher PV-2026-0914 · Shreeji Ready Mix",
      to: "/finance",
    },
    status: "open",
    assignedTo: "Arjun Kapoor (Company Owner)",
    createdAt: "2026-09-05 10:00 IST",
    history: [
      {
        action: "Automated accounts payable aging alert",
        by: "System",
        timestamp: "2026-09-05 10:00 IST",
      },
    ],
  },
  {
    id: "alt-006",
    title: "Labour deployment 31% below planned strength",
    projectId: "proj-004",
    projectName: "Crescent Business Park",
    severity: "attention",
    category: "Schedule",
    problem: "Current site attendance records 62 workers vs planned muster roll strength of 90.",
    rootCause:
      "Local regional festival exodus of masonry gang workers from Tamil Nadu delta districts.",
    impact: "Internal AAC block masonry progress rate lagging by 150 sq.ft/day.",
    suggestedAction:
      "Instruct labour contractor Crescent Masonry Syndicate to deploy substitute finishing squad by Wednesday.",
    sourceRef: {
      type: "Labour Contractor",
      id: "lc-004",
      label: "Contractor LC-004 · Crescent Masonry Syndicate",
      to: "/people",
    },
    status: "open",
    assignedTo: "Karthik Iyer (Project Lead)",
    createdAt: "2026-09-05 17:30 IST",
    history: [
      {
        action: "Flagged from muster roll daily attendance",
        by: "System",
        timestamp: "2026-09-05 17:30 IST",
      },
    ],
  },
  {
    id: "alt-007",
    title: "3 Site DPRs missing from yesterday's evening cycle",
    projectId: "proj-004",
    projectName: "Portfolio Wide",
    severity: "attention",
    category: "DPR",
    problem:
      "Daily Progress Reports for Crescent Park, Greenfield Logistics, and Aerocity were not uploaded before 8 PM cutoff.",
    rootCause:
      "Site engineers delayed in site data compilation due to late evening concrete pours.",
    impact:
      "Daily operational executive summary and cash burn report generation delayed by 12 hours.",
    suggestedAction:
      "Send reminder notification to respective site leads to submit draft site logs.",
    sourceRef: {
      type: "DPR Module",
      id: "dpr-rollup",
      label: "Daily Progress Reports Workspace",
      to: "/reports",
    },
    status: "open",
    assignedTo: "All Project Leads",
    createdAt: "2026-09-06 20:30 IST",
    history: [
      {
        action: "Triggered by Nightly DPR Auditing Job",
        by: "System",
        timestamp: "2026-09-06 20:30 IST",
      },
    ],
  },
];

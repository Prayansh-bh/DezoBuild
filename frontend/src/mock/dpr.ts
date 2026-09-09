import type { DprRecord } from "./types";

export const initialDprRecords: DprRecord[] = [
  {
    id: "dpr-001",
    projectId: "proj-001",
    projectName: "Orion Heights",
    dprNumber: "DPR-ORH-2026-0907",
    date: "2026-09-07",
    weather: "sunny",
    temperature: "28°C",
    shift: "General Shift (8 AM - 6 PM)",
    manpower: [
      { trade: "Masons", skilled: 18, unskilled: 22, supervisor: 2 },
      { trade: "Barbenders (Steel Fixers)", skilled: 34, unskilled: 28, supervisor: 3 },
      { trade: "Carpenters / Shuttering", skilled: 24, unskilled: 16, supervisor: 2 },
      { trade: "Electricians & Plumbers", skilled: 8, unskilled: 4, supervisor: 1 },
      { trade: "General Helpers / Safety", skilled: 0, unskilled: 22, supervisor: 1 },
    ],
    equipment: [
      { name: "Tower Crane TC-01 (Tower A)", hours: 9.5, status: "running" },
      { name: "Stationary Concrete Pump CP-04", hours: 6.0, status: "running" },
      { name: "Passenger & Material Hoist PH-02", hours: 10.0, status: "running" },
      { name: "DG Set 250 kVA (Backup)", hours: 2.0, status: "idle" },
    ],
    materials: [
      { materialName: "OPC 53 Cement", quantity: 380, unit: "bags" },
      { materialName: "TMT Steel Fe500D (16mm & 20mm)", quantity: 14.5, unit: "MT" },
      { materialName: "Ready Mix Concrete M40", quantity: 85, unit: "cum" },
      { materialName: "Binding Wire", quantity: 65, unit: "kg" },
    ],
    progressItems: [
      {
        activityId: "wbs-106",
        activityName: "Aluminium Formwork Shuttering",
        workCompleted:
          "Tower A - 22nd Floor Slab shuttering completed and checked for level & plumb.",
        quantityDone: 420,
        unit: "sqm",
        progressPercentage: 100,
      },
      {
        activityId: "wbs-107",
        activityName: "TMT Rebar Cutting & Binding",
        workCompleted:
          "Tower A - 22nd Floor beam & column rebar tying completed. Cover blocks placed.",
        quantityDone: 14.5,
        unit: "MT",
        progressPercentage: 90,
      },
    ],
    photos: [
      {
        id: "p1",
        url: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?w=600&auto=format&fit=crop&q=80",
        caption: "Tower A 22nd floor rebar tying and cover inspection prior to pour",
        timestamp: "11:45 AM",
      },
      {
        id: "p2",
        url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&auto=format&fit=crop&q=80",
        caption: "M40 RMC slump test and cube casting at ground pump point",
        timestamp: "02:15 PM",
      },
    ],
    safetyRemarks:
      "Zero lost-time injuries. Toolbox talk conducted on working at heights and 100% harness hookup compliance.",
    delaysObstacles:
      "Slight RMC transit delay due to Whitefield main road traffic congestion (35 mins).",
    submittedBy: { name: "Vikram Shenoy", role: "Site Engineer" },
    status: "submitted",
    createdAt: "2026-09-07 18:30 IST",
  },
  {
    id: "dpr-002",
    projectId: "proj-002",
    projectName: "Metro Depot Package 2",
    dprNumber: "DPR-MTR-2026-0907",
    date: "2026-09-07",
    weather: "cloudy",
    temperature: "26°C",
    shift: "General Shift (8 AM - 6 PM)",
    manpower: [
      { trade: "Piling Rig Operators & Riggers", skilled: 12, unskilled: 18, supervisor: 2 },
      { trade: "Fabricators & Welders", skilled: 22, unskilled: 14, supervisor: 2 },
      { trade: "Civil Helpers", skilled: 0, unskilled: 24, supervisor: 1 },
    ],
    equipment: [
      { name: "Hydraulic Piling Rig HR-180", hours: 4.5, status: "idle" },
      { name: "Crawler Excavator EX-220", hours: 1.0, status: "breakdown" }, // Breakdown alert
      { name: "Transit Mixer TM-03", hours: 7.5, status: "running" },
    ],
    materials: [
      { materialName: "River Sand", quantity: 45, unit: "cft" },
      { materialName: "Bentonite Powder", quantity: 30, unit: "bags" },
      { materialName: "Structural Steel I-Beams", quantity: 18, unit: "MT" },
    ],
    progressItems: [
      {
        activityId: "wbs-201",
        activityName: "Piling & Substructure Foundation",
        workCompleted:
          "Stabling Bay Line 4 - 3 Bored cast-in-situ piles driven to 18m refusal depth.",
        quantityDone: 3,
        unit: "nos",
        progressPercentage: 87,
      },
    ],
    photos: [
      {
        id: "p3",
        url: "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=600&auto=format&fit=crop&q=80",
        caption: "Bored pile cage lowering at stabling bay line 4",
        timestamp: "10:30 AM",
      },
    ],
    safetyRemarks:
      "Barricading maintained around active piling boring zone. Safety marshals deployed.",
    delaysObstacles:
      "Excavator EX-220 hydraulic hose burst at 11:30 AM causing 4 hours downtime in spoil clearing.",
    submittedBy: { name: "Girish Kulkarni", role: "Site Engineer" },
    status: "submitted",
    createdAt: "2026-09-07 18:45 IST",
  },
  {
    id: "dpr-003",
    projectId: "proj-003",
    projectName: "Lakeview Residences",
    dprNumber: "DPR-LKV-2026-0906",
    date: "2026-09-06",
    weather: "sunny",
    temperature: "31°C",
    shift: "General Shift (8 AM - 6 PM)",
    manpower: [
      { trade: "Tile Layers & Marble Fitters", skilled: 28, unskilled: 16, supervisor: 3 },
      { trade: "Painters (Putty & Primer)", skilled: 20, unskilled: 12, supervisor: 2 },
      { trade: "Plumbing & Sanitary", skilled: 14, unskilled: 8, supervisor: 1 },
    ],
    equipment: [
      { name: "Tile Cutting Machines", hours: 8.0, status: "running" },
      { name: "Material Hoist MH-01", hours: 9.0, status: "running" },
    ],
    materials: [
      { materialName: "600x1200 Vitrified Tiles", quantity: 840, unit: "sqft" },
      { materialName: "Tile Adhesive Type 2", quantity: 65, unit: "bags" },
      { materialName: "Epoxy Grout", quantity: 24, unit: "kg" },
    ],
    progressItems: [
      {
        activityId: "wbs-302",
        activityName: "Vitrified Tile Flooring & Dado Works",
        workCompleted:
          "14th Floor Flat 1401 & 1402 master bedroom and living room tiling finished.",
        quantityDone: 840,
        unit: "sqft",
        progressPercentage: 82,
      },
    ],
    photos: [
      {
        id: "p4",
        url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&auto=format&fit=crop&q=80",
        caption: "14th floor living room vitrified tile alignment & spacer inspection",
        timestamp: "04:00 PM",
      },
    ],
    safetyRemarks: "Dust masks and eye protection provided to all tile cutting craftsmen.",
    delaysObstacles: "None. All materials available at floor staging.",
    submittedBy: { name: "Prakash Rao", role: "Site Supervisor" },
    status: "approved",
    createdAt: "2026-09-06 19:15 IST",
  },
];

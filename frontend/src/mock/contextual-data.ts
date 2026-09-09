/**
 * DEZOBUILD — Role-Contextual Data Helper
 * 
 * Provides scoping and filtering for mock data based on the active
 * user role and project/site assignments.
 * 
 * Scoping rules:
 * - Executive / Admin / Finance / Auditor roles: See portfolio-wide aggregated data.
 * - Project Manager: Scoped to assigned projects (e.g. "proj-001", "proj-002").
 * - Site Engineer: Scoped to assigned site/project ("proj-001" - Metro Line 4).
 * - Store Manager: Scoped to warehouse and store allocations across projects.
 * - HR: Scoped to workforce and muster rolls.
 */

import { useCurrentUser } from "@/auth";
import { CustomerRole } from "@/authorization/roles";
import { useMockStore } from "./index";
import type {
  Project,
  DprRecord,
  Indent,
  PurchaseOrder,
  GrnRecord,
  MaterialIssue,
  ExpenseRecord,
  AttendanceRecord,
  DocumentItem,
  SmartAlert,
  MaterialItem,
  EquipmentAsset,
} from "./types";

export interface ContextualStoreData {
  projects: Project[];
  allProjects: Project[];
  dprRecords: DprRecord[];
  materials: MaterialItem[];
  equipment: EquipmentAsset[];
  indents: Indent[];
  purchaseOrders: PurchaseOrder[];
  grnRecords: GrnRecord[];
  materialIssues: MaterialIssue[];
  expenses: ExpenseRecord[];
  attendanceRecords: AttendanceRecord[];
  documents: DocumentItem[];
  alerts: SmartAlert[];
  isScopedToProjects: boolean;
  scopedProjectNames: string[];
  scopeLabel: string;
}

export function useContextualData(): ContextualStoreData {
  const store = useMockStore();
  const { user } = useCurrentUser();

  const assignedProjectIds = user.assignedProjects.map((p) => p.projectId);
  const isExecutiveRole =
    user.role === CustomerRole.COMPANY_OWNER ||
    user.role === CustomerRole.COMPANY_ADMIN ||
    user.role === CustomerRole.ACCOUNTANT ||
    user.role === CustomerRole.VIEWER;

  const shouldFilterByProject =
    !isExecutiveRole && assignedProjectIds.length > 0;

  // Filter projects
  const filteredProjects = shouldFilterByProject
    ? store.projects.filter((p) => assignedProjectIds.includes(p.id))
    : store.projects;

  // Filter DPRs
  const filteredDprs = shouldFilterByProject
    ? store.dprRecords.filter((d) => assignedProjectIds.includes(d.projectId))
    : store.dprRecords;

  // Filter Indents
  const filteredIndents = shouldFilterByProject
    ? store.indents.filter((i) => assignedProjectIds.includes(i.projectId))
    : store.indents;

  // Filter Purchase Orders
  const filteredPOs = shouldFilterByProject
    ? store.purchaseOrders.filter((po) => assignedProjectIds.includes(po.projectId))
    : store.purchaseOrders;

  // Filter GRN Records
  const filteredGrn = shouldFilterByProject
    ? store.grnRecords.filter((g) => assignedProjectIds.includes(g.projectId))
    : store.grnRecords;

  // Filter Material Issues
  const filteredIssues = shouldFilterByProject
    ? store.materialIssues.filter((mi) => assignedProjectIds.includes(mi.projectId))
    : store.materialIssues;

  // Filter Expenses
  const filteredExpenses = shouldFilterByProject
    ? store.expenses.filter((e) => assignedProjectIds.includes(e.projectId))
    : store.expenses;

  // Filter Attendance
  const filteredAttendance = shouldFilterByProject
    ? store.attendanceRecords.filter((a) => assignedProjectIds.includes(a.projectId))
    : store.attendanceRecords;

  // Filter Documents
  const filteredDocuments = shouldFilterByProject
    ? store.documents.filter((doc) => assignedProjectIds.includes(doc.projectId))
    : store.documents;

  // Filter Alerts
  const filteredAlerts = shouldFilterByProject
    ? store.alerts.filter((a) => assignedProjectIds.includes(a.projectId))
    : store.alerts;

  const scopedProjectNames = user.assignedProjects.map((p) => p.projectName);

  const scopeLabel = shouldFilterByProject
    ? `Scoped to: ${scopedProjectNames.join(", ")}`
    : `Portfolio-Wide (${store.projects.length} Active Sites)`;

  return {
    projects: filteredProjects,
    allProjects: store.projects,
    dprRecords: filteredDprs,
    materials: store.materials,
    equipment: store.equipment,
    indents: filteredIndents,
    purchaseOrders: filteredPOs,
    grnRecords: filteredGrn,
    materialIssues: filteredIssues,
    expenses: filteredExpenses,
    attendanceRecords: filteredAttendance,
    documents: filteredDocuments,
    alerts: filteredAlerts,
    isScopedToProjects: shouldFilterByProject,
    scopedProjectNames,
    scopeLabel,
  };
}

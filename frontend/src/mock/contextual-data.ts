/**
 * DEZOBUILD — Authoritative Role-Contextual Data Helper
 * 
 * Powered by React Query + Live Backend API Client.
 * Bridges live server state with UI presentation models and handles
 * active user role scoping.
 * 
 * In accordance with Phase 18 runtime architecture:
 * React UI -> Typed API Client -> HTTP/JSON -> Backend API -> PostgreSQL/Prisma
 * 
 * On API failure, error state is propagated to the UI for retry (NO mock fallback).
 */

import { useCurrentUser } from "@/auth";
import { CustomerRole } from "@/authorization/roles";
import {
  useProjectsList,
  useMaterialsList,
  useEquipmentList,
  useMaterialIndents,
  usePurchaseOrders,
  useGoodsReceipts,
  useMaterialIssues,
  useExpensesList,
  useAttendanceList,
  useDocumentsList,
  useAlertsList,
} from "@/hooks/api";
import {
  adaptProject,
  adaptMaterial,
  adaptEquipment,
  adaptIndent,
  adaptPurchaseOrder,
  adaptGoodsReceipt,
  adaptMaterialIssue,
  adaptExpense,
  adaptAttendance,
  adaptDocument,
  adaptAlert,
} from "@/lib/api/adapters";
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
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useContextualData(): ContextualStoreData {
  const { user } = useCurrentUser();

  // Execute live React Query hooks
  const projectsQuery = useProjectsList();
  const materialsQuery = useMaterialsList();
  const equipmentQuery = useEquipmentList();
  const indentsQuery = useMaterialIndents();
  const poQuery = usePurchaseOrders();
  const grnQuery = useGoodsReceipts();
  const issuesQuery = useMaterialIssues();
  const expensesQuery = useExpensesList();
  const attendanceQuery = useAttendanceList();
  const documentsQuery = useDocumentsList();
  const alertsQuery = useAlertsList();

  const isLoading =
    projectsQuery.isLoading ||
    materialsQuery.isLoading ||
    equipmentQuery.isLoading ||
    indentsQuery.isLoading ||
    poQuery.isLoading ||
    grnQuery.isLoading ||
    issuesQuery.isLoading ||
    expensesQuery.isLoading ||
    attendanceQuery.isLoading ||
    documentsQuery.isLoading ||
    alertsQuery.isLoading;

  const isError =
    projectsQuery.isError ||
    materialsQuery.isError ||
    equipmentQuery.isError ||
    indentsQuery.isError ||
    poQuery.isError ||
    grnQuery.isError ||
    issuesQuery.isError ||
    expensesQuery.isError ||
    attendanceQuery.isError ||
    documentsQuery.isError ||
    alertsQuery.isError;

  const error = (
    projectsQuery.error ||
    materialsQuery.error ||
    equipmentQuery.error ||
    indentsQuery.error ||
    poQuery.error ||
    grnQuery.error ||
    issuesQuery.error ||
    expensesQuery.error ||
    attendanceQuery.error ||
    documentsQuery.error ||
    alertsQuery.error
  ) as Error | null;

  const refetch = async () => {
    await Promise.all([
      projectsQuery.refetch(),
      materialsQuery.refetch(),
      equipmentQuery.refetch(),
      indentsQuery.refetch(),
      poQuery.refetch(),
      grnQuery.refetch(),
      issuesQuery.refetch(),
      expensesQuery.refetch(),
      attendanceQuery.refetch(),
      documentsQuery.refetch(),
      alertsQuery.refetch(),
    ]);
  };

  // Safe helper to extract item array from raw array or paginated object ({ items: [...] })
  function extractItems<T = any>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object") {
      if (Array.isArray((data as any).items)) return (data as any).items as T[];
      if (Array.isArray((data as any).data)) return (data as any).data as T[];
    }
    return [];
  }

  // Adapt backend DTOs to UI models
  const rawProjects: Project[] = extractItems(projectsQuery.data).map(adaptProject);
  const rawMaterials: MaterialItem[] = extractItems(materialsQuery.data).map(adaptMaterial);
  const rawEquipment: EquipmentAsset[] = extractItems(equipmentQuery.data).map(adaptEquipment);
  const rawIndents: Indent[] = extractItems(indentsQuery.data).map(adaptIndent);
  const rawPurchaseOrders: PurchaseOrder[] = extractItems(poQuery.data).map(adaptPurchaseOrder);
  const rawGrn: GrnRecord[] = extractItems(grnQuery.data).map(adaptGoodsReceipt);
  const rawIssues: MaterialIssue[] = extractItems(issuesQuery.data).map(adaptMaterialIssue);
  const rawExpenses: ExpenseRecord[] = extractItems(expensesQuery.data).map(adaptExpense);
  const rawAttendance: AttendanceRecord[] = extractItems(attendanceQuery.data).map((a) => adaptAttendance(a));
  const rawDocuments: DocumentItem[] = extractItems(documentsQuery.data).map(adaptDocument);
  const rawAlerts: SmartAlert[] = extractItems(alertsQuery.data).map(adaptAlert);

  const assignedProjectIds = user?.assignedProjects?.map((p) => p.projectId) || [];
  const isExecutiveRole =
    !user ||
    user.role === CustomerRole.COMPANY_OWNER ||
    user.role === CustomerRole.COMPANY_ADMIN ||
    user.role === CustomerRole.ACCOUNTANT ||
    user.role === CustomerRole.VIEWER;

  const shouldFilterByProject = !isExecutiveRole && assignedProjectIds.length > 0;

  // Filter projects
  const filteredProjects = shouldFilterByProject
    ? rawProjects.filter((p) => assignedProjectIds.includes(p.id))
    : rawProjects;

  // Filter Indents
  const filteredIndents = shouldFilterByProject
    ? rawIndents.filter((i) => assignedProjectIds.includes(i.projectId))
    : rawIndents;

  // Filter Purchase Orders
  const filteredPOs = shouldFilterByProject
    ? rawPurchaseOrders.filter((po) => assignedProjectIds.includes(po.projectId))
    : rawPurchaseOrders;

  // Filter GRN Records
  const filteredGrn = shouldFilterByProject
    ? rawGrn.filter((g) => assignedProjectIds.includes(g.projectId))
    : rawGrn;

  // Filter Material Issues
  const filteredIssues = shouldFilterByProject
    ? rawIssues.filter((mi) => assignedProjectIds.includes(mi.projectId))
    : rawIssues;

  // Filter Expenses
  const filteredExpenses = shouldFilterByProject
    ? rawExpenses.filter((e) => assignedProjectIds.includes(e.projectId))
    : rawExpenses;

  // Filter Attendance
  const filteredAttendance = shouldFilterByProject
    ? rawAttendance.filter((a) => assignedProjectIds.includes(a.projectId))
    : rawAttendance;

  // Filter Documents
  const filteredDocuments = shouldFilterByProject
    ? rawDocuments.filter((doc) => assignedProjectIds.includes(doc.projectId))
    : rawDocuments;

  // Filter Alerts
  const filteredAlerts = shouldFilterByProject
    ? rawAlerts.filter((a) => assignedProjectIds.includes(a.projectId))
    : rawAlerts;

  const scopedProjectNames = user?.assignedProjects?.map((p) => p.projectName) || [];

  const scopeLabel = shouldFilterByProject
    ? `Scoped to: ${scopedProjectNames.join(", ")}`
    : `Portfolio-Wide (${rawProjects.length} Active Sites)`;

  return {
    projects: filteredProjects,
    allProjects: rawProjects,
    dprRecords: [],
    materials: rawMaterials,
    equipment: rawEquipment,
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
    isLoading,
    isError,
    error,
    refetch,
  };
}

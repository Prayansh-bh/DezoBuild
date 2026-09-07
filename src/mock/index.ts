import { useSyncExternalStore } from "react";
import { initialAlerts } from "./alerts";
import { initialDocuments } from "./documents";
import { initialDprRecords } from "./dpr";
import { initialEquipment, initialFuelLogs, initialMaintenanceRecords } from "./equipment";
import {
  initialAdvances,
  initialContractors,
  initialExpenses,
  initialPayments,
  initialVendors,
} from "./finance";
import {
  initialGrnRecords,
  initialIndents,
  initialMaterialIssues,
  initialMaterials,
  initialMaterialReturns,
  initialPurchaseOrders,
  initialStockTransfers,
} from "./materials";
import {
  initialAttendanceRecords,
  initialEmployees,
  initialLabourContractors,
} from "./people";
import { initialProjects } from "./projects";
import { initialReports } from "./reports";
import { initialCompanySettings, initialRolesPermissions } from "./settings";
import type {
  AdvanceRecord,
  AttendanceRecord,
  CompanySettings,
  Contractor,
  DocumentItem,
  DprRecord,
  Employee,
  EquipmentAsset,
  ExpenseRecord,
  FuelLog,
  GrnRecord,
  Indent,
  LabourContractor,
  MaintenanceRecord,
  MaterialIssue,
  MaterialItem,
  MaterialReturn,
  PaymentRecord,
  Project,
  PurchaseOrder,
  ReportConfig,
  RolePermission,
  SmartAlert,
  StockTransfer,
  Vendor,
  WbsActivity,
} from "./types";
import { initialWbsActivities } from "./wbs";

export * from "./types";

export interface MockStoreState {
  projects: Project[];
  wbsActivities: WbsActivity[];
  dprRecords: DprRecord[];
  materials: MaterialItem[];
  indents: Indent[];
  purchaseOrders: PurchaseOrder[];
  grnRecords: GrnRecord[];
  materialIssues: MaterialIssue[];
  materialReturns: MaterialReturn[];
  stockTransfers: StockTransfer[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  advances: AdvanceRecord[];
  vendors: Vendor[];
  contractors: Contractor[];
  employees: Employee[];
  labourContractors: LabourContractor[];
  attendanceRecords: AttendanceRecord[];
  equipment: EquipmentAsset[];
  fuelLogs: FuelLog[];
  maintenanceRecords: MaintenanceRecord[];
  alerts: SmartAlert[];
  reports: ReportConfig[];
  documents: DocumentItem[];
  companySettings: CompanySettings;
  rolesPermissions: RolePermission[];
}

let state: MockStoreState = {
  projects: initialProjects,
  wbsActivities: initialWbsActivities,
  dprRecords: initialDprRecords,
  materials: initialMaterials,
  indents: initialIndents,
  purchaseOrders: initialPurchaseOrders,
  grnRecords: initialGrnRecords,
  materialIssues: initialMaterialIssues,
  materialReturns: initialMaterialReturns,
  stockTransfers: initialStockTransfers,
  expenses: initialExpenses,
  payments: initialPayments,
  advances: initialAdvances,
  vendors: initialVendors,
  contractors: initialContractors,
  employees: initialEmployees,
  labourContractors: initialLabourContractors,
  attendanceRecords: initialAttendanceRecords,
  equipment: initialEquipment,
  fuelLogs: initialFuelLogs,
  maintenanceRecords: initialMaintenanceRecords,
  alerts: initialAlerts,
  reports: initialReports,
  documents: initialDocuments,
  companySettings: initialCompanySettings,
  rolesPermissions: initialRolesPermissions,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const mockStore = {
  getSnapshot(): MockStoreState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // --- MUTATIONS ---

  // 1. Projects
  addProject(project: Omit<Project, "id" | "criticalIssuesCount" | "varianceAmount" | "activeWorkersToday" | "weatherToday">): Project {
    const newProject: Project = {
      ...project,
      id: `proj-${String(state.projects.length + 1).padStart(3, "0")}`,
      criticalIssuesCount: 0,
      varianceAmount: 0,
      activeWorkersToday: 0,
      weatherToday: { condition: "sunny", temp: "28°C" },
    };
    state = { ...state, projects: [newProject, ...state.projects] };
    emitChange();
    return newProject;
  },

  updateProject(id: string, updates: Partial<Project>) {
    state = {
      ...state,
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    };
    emitChange();
  },

  // 2. WBS Activities
  addWbsActivity(activity: Omit<WbsActivity, "id">): WbsActivity {
    const newActivity: WbsActivity = {
      ...activity,
      id: `wbs-${String(state.wbsActivities.length + 101)}`,
    };
    state = { ...state, wbsActivities: [...state.wbsActivities, newActivity] };
    emitChange();
    return newActivity;
  },

  updateWbsActivity(id: string, updates: Partial<WbsActivity>) {
    state = {
      ...state,
      wbsActivities: state.wbsActivities.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    };
    emitChange();
  },

  // 3. DPR
  addDpr(dpr: Omit<DprRecord, "id" | "dprNumber" | "createdAt">): DprRecord {
    const project = state.projects.find((p) => p.id === dpr.projectId);
    const code = project ? project.code.split("-")[0] : "PRJ";
    const dateStr = dpr.date.replace(/-/g, "");
    const newDpr: DprRecord = {
      ...dpr,
      id: `dpr-${String(state.dprRecords.length + 1).padStart(3, "0")}`,
      dprNumber: `DPR-${code}-${dateStr}`,
      createdAt: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} IST`,
    };
    state = { ...state, dprRecords: [newDpr, ...state.dprRecords] };
    emitChange();
    return newDpr;
  },

  updateDprStatus(id: string, status: DprRecord["status"]) {
    state = {
      ...state,
      dprRecords: state.dprRecords.map((d) => (d.id === id ? { ...d, status } : d)),
    };
    emitChange();
  },

  // 4. Materials
  addIndent(indent: Omit<Indent, "id" | "indentNumber" | "createdAt">): Indent {
    const newIndent: Indent = {
      ...indent,
      id: `ind-${String(state.indents.length + 1).padStart(3, "0")}`,
      indentNumber: `IND-${String(state.indents.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    state = { ...state, indents: [newIndent, ...state.indents] };
    emitChange();
    return newIndent;
  },

  addPurchaseOrder(po: Omit<PurchaseOrder, "id" | "poNumber">): PurchaseOrder {
    const newPO: PurchaseOrder = {
      ...po,
      id: `po-${String(state.purchaseOrders.length + 1).padStart(3, "0")}`,
      poNumber: `PO-2026-${String(state.purchaseOrders.length + 493).padStart(4, "0")}`,
    };
    state = { ...state, purchaseOrders: [newPO, ...state.purchaseOrders] };
    emitChange();
    return newPO;
  },

  addGrn(grn: Omit<GrnRecord, "id" | "grnNumber">): GrnRecord {
    const newGrn: GrnRecord = {
      ...grn,
      id: `grn-${String(state.grnRecords.length + 1).padStart(3, "0")}`,
      grnNumber: `GRN-2026-${String(state.grnRecords.length + 313).padStart(4, "0")}`,
    };
    // Update materials inventory
    const updatedMaterials = state.materials.map((mat) => {
      const grnItem = grn.items.find((i) => i.materialId === mat.id);
      if (grnItem) {
        const newStock = mat.currentStock + grnItem.acceptedQty;
        return {
          ...mat,
          currentStock: newStock,
          totalStockValue: newStock * mat.unitRate,
          status: (newStock <= mat.reorderLevel ? (newStock <= mat.safetyStock ? "critical" : "attention") : "healthy") as "healthy" | "attention" | "critical",
        };
      }
      return mat;
    });

    state = { ...state, grnRecords: [newGrn, ...state.grnRecords], materials: updatedMaterials };
    emitChange();
    return newGrn;
  },

  addMaterialIssue(issue: Omit<MaterialIssue, "id" | "issueNumber">): MaterialIssue {
    const newIssue: MaterialIssue = {
      ...issue,
      id: `iss-${String(state.materialIssues.length + 1).padStart(3, "0")}`,
      issueNumber: `ISS-2026-${String(state.materialIssues.length + 519).padStart(4, "0")}`,
    };
    // Deduct stock
    const updatedMaterials = state.materials.map((mat) => {
      const issueItem = issue.items.find((i) => i.materialId === mat.id);
      if (issueItem) {
        const newStock = Math.max(0, mat.currentStock - issueItem.quantity);
        return {
          ...mat,
          currentStock: newStock,
          totalStockValue: newStock * mat.unitRate,
          status: (newStock <= mat.reorderLevel ? (newStock <= mat.safetyStock ? "critical" : "attention") : "healthy") as "healthy" | "attention" | "critical",
        };
      }
      return mat;
    });
    state = { ...state, materialIssues: [newIssue, ...state.materialIssues], materials: updatedMaterials };
    emitChange();
    return newIssue;
  },

  addStockTransfer(transfer: Omit<StockTransfer, "id" | "transferNumber">): StockTransfer {
    const newTransfer: StockTransfer = {
      ...transfer,
      id: `st-${String(state.stockTransfers.length + 1).padStart(3, "0")}`,
      transferNumber: `ST-2026-${String(state.stockTransfers.length + 20).padStart(4, "0")}`,
    };
    state = { ...state, stockTransfers: [newTransfer, ...state.stockTransfers] };
    emitChange();
    return newTransfer;
  },

  // 5. Expenses & Finance
  addExpense(expense: Omit<ExpenseRecord, "id" | "expenseNumber">): ExpenseRecord {
    const newExpense: ExpenseRecord = {
      ...expense,
      id: `exp-${String(state.expenses.length + 1).padStart(3, "0")}`,
      expenseNumber: `EXP-2026-${String(state.expenses.length + 821).padStart(4, "0")}`,
    };
    // Update project actual cost if approved or paid
    const updatedProjects = state.projects.map((p) => {
      if (p.id === expense.projectId) {
        return { ...p, actualCost: p.actualCost + expense.amount };
      }
      return p;
    });
    state = { ...state, expenses: [newExpense, ...state.expenses], projects: updatedProjects };
    emitChange();
    return newExpense;
  },

  updateExpenseStatus(id: string, status: ExpenseRecord["status"]) {
    state = {
      ...state,
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, status } : e)),
    };
    emitChange();
  },

  addPayment(payment: Omit<PaymentRecord, "id" | "voucherNumber">): PaymentRecord {
    const newPayment: PaymentRecord = {
      ...payment,
      id: `pay-${String(state.payments.length + 1).padStart(3, "0")}`,
      voucherNumber: `PV-2026-${String(state.payments.length + 932).padStart(4, "0")}`,
    };
    state = { ...state, payments: [newPayment, ...state.payments] };
    emitChange();
    return newPayment;
  },

  updatePaymentStatus(id: string, status: PaymentRecord["status"]) {
    state = {
      ...state,
      payments: state.payments.map((p) => (p.id === id ? { ...p, status } : p)),
    };
    emitChange();
  },

  // 6. People & Attendance
  addAttendanceRecord(record: Omit<AttendanceRecord, "id">): AttendanceRecord {
    const newRecord: AttendanceRecord = {
      ...record,
      id: `att-${String(state.attendanceRecords.length + 1).padStart(3, "0")}`,
    };
    state = { ...state, attendanceRecords: [newRecord, ...state.attendanceRecords] };
    emitChange();
    return newRecord;
  },

  addEmployee(emp: Omit<Employee, "id" | "empCode">): Employee {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${String(state.employees.length + 1).padStart(3, "0")}`,
      empCode: `DEZ-EMP-${String(state.employees.length + 108)}`,
    };
    state = { ...state, employees: [newEmp, ...state.employees] };
    emitChange();
    return newEmp;
  },

  // 7. Equipment
  addEquipmentLog(fuelLog: Omit<FuelLog, "id">): FuelLog {
    const newLog: FuelLog = {
      ...fuelLog,
      id: `fl-${String(state.fuelLogs.length + 1).padStart(3, "0")}`,
    };
    state = { ...state, fuelLogs: [newLog, ...state.fuelLogs] };
    emitChange();
    return newLog;
  },

  addMaintenanceRecord(record: Omit<MaintenanceRecord, "id" | "ticketNumber">): MaintenanceRecord {
    const newMaint: MaintenanceRecord = {
      ...record,
      id: `maint-${String(state.maintenanceRecords.length + 1).padStart(3, "0")}`,
      ticketNumber: `MNT-2026-${String(state.maintenanceRecords.length + 45).padStart(4, "0")}`,
    };
    state = { ...state, maintenanceRecords: [newMaint, ...state.maintenanceRecords] };
    emitChange();
    return newMaint;
  },

  // 8. Alerts
  resolveAlert(id: string, note?: string) {
    state = {
      ...state,
      alerts: state.alerts.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            status: "resolved",
            resolvedAt: new Date().toLocaleTimeString(),
            history: [
              ...a.history,
              {
                action: "Marked as Resolved",
                by: "Arjun Kapoor (Owner)",
                timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} IST`,
                note: note || "Action verified and confirmed on site.",
              },
            ],
          };
        }
        return a;
      }),
    };
    emitChange();
  },

  acknowledgeAlert(id: string) {
    state = {
      ...state,
      alerts: state.alerts.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            status: "acknowledged",
            history: [
              ...a.history,
              {
                action: "Acknowledged by Site Team",
                by: "User",
                timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} IST`,
              },
            ],
          };
        }
        return a;
      }),
    };
    emitChange();
  },

  // 9. Documents
  addDocument(doc: Omit<DocumentItem, "id" | "updatedDate">): DocumentItem {
    const newDoc: DocumentItem = {
      ...doc,
      id: `doc-${String(state.documents.length + 1).padStart(3, "0")}`,
      updatedDate: new Date().toISOString().slice(0, 10),
    };
    state = { ...state, documents: [newDoc, ...state.documents] };
    emitChange();
    return newDoc;
  },
};

// React Hook to consume store
export function useMockStore(): MockStoreState {
  return useSyncExternalStore(mockStore.subscribe, mockStore.getSnapshot, mockStore.getSnapshot);
}

// Formatting helpers
export function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCompactNumber(num: number): string {
  return num.toLocaleString("en-IN");
}

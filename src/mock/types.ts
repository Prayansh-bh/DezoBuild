export type ProjectHealth = "critical" | "attention" | "healthy";
export type ProjectStatus = "active" | "planning" | "completed" | "archived";

export interface ProjectTeamMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  location: string;
  address: string;
  city: string;
  state: string;
  startDate: string;
  targetCompletion: string;
  status: ProjectStatus;
  health: ProjectHealth;
  budget: number; // In INR (Raw integer for math, formatted to Cr/Lakhs in UI)
  actualCost: number;
  committedCost: number;
  progress: number; // 0-100 percentage
  plannedProgress: number;
  manager: ProjectTeamMember;
  team: ProjectTeamMember[];
  siteArea: string;
  builtUpArea: string;
  description: string;
  criticalIssuesCount: number;
  varianceAmount: number; // actual - planned cost
  activeWorkersToday: number;
  weatherToday: { condition: "sunny" | "cloudy" | "rainy"; temp: string };
}

export type WbsStatus = "not_started" | "in_progress" | "completed" | "delayed";

export interface WbsActivity {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  category: "Substructure" | "Superstructure" | "Finishes" | "MEP" | "External Works";
  unit: string;
  plannedQty: number;
  actualQty: number;
  plannedRate: number;
  actualRate: number;
  plannedCost: number;
  actualCost: number;
  plannedProgress: number;
  actualProgress: number;
  startDate: string;
  endDate: string;
  status: WbsStatus;
  assignedGang: string;
}

export interface DprManpower {
  trade: string;
  skilled: number;
  unskilled: number;
  supervisor: number;
}

export interface DprEquipment {
  name: string;
  hours: number;
  status: "running" | "idle" | "breakdown";
}

export interface DprMaterial {
  materialName: string;
  quantity: number;
  unit: string;
}

export interface DprProgressItem {
  activityId: string;
  activityName: string;
  workCompleted: string;
  quantityDone: number;
  unit: string;
  progressPercentage: number;
}

export interface DprPhoto {
  id: string;
  url: string;
  caption: string;
  timestamp: string;
}

export type DprStatus = "draft" | "submitted" | "approved" | "rejected";

export interface DprRecord {
  id: string;
  projectId: string;
  projectName: string;
  dprNumber: string;
  date: string;
  weather: "sunny" | "cloudy" | "rainy" | "windy";
  temperature: string;
  shift: "General Shift (8 AM - 6 PM)" | "Night Shift (7 PM - 5 AM)";
  manpower: DprManpower[];
  equipment: DprEquipment[];
  materials: DprMaterial[];
  progressItems: DprProgressItem[];
  photos: DprPhoto[];
  safetyRemarks: string;
  delaysObstacles: string;
  submittedBy: { name: string; role: string };
  status: DprStatus;
  createdAt: string;
}

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: "Cement" | "Steel" | "Aggregates" | "Masonry" | "Finishing" | "MEP" | "Consumables";
  unit: string;
  currentStock: number;
  reorderLevel: number;
  safetyStock: number;
  unitRate: number;
  totalStockValue: number;
  primaryWarehouse: string;
  siteAllocations: Array<{ siteName: string; quantity: number }>;
  status: "healthy" | "attention" | "critical";
  specification: string;
}

export interface IndentItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  purpose: string;
}

export interface Indent {
  id: string;
  indentNumber: string;
  projectId: string;
  projectName: string;
  requestedBy: string;
  requiredDate: string;
  priority: "normal" | "urgent" | "critical";
  items: IndentItem[];
  status: "draft" | "submitted" | "approved" | "rejected" | "ordered";
  createdAt: string;
  notes: string;
}

export interface PurchaseOrderItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  indentId?: string;
  projectId: string;
  projectName: string;
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  issueDate: string;
  expectedDelivery: string;
  status: "draft" | "issued" | "partially_received" | "delivered" | "cancelled";
  items: PurchaseOrderItem[];
  paymentTerms: string;
}

export interface GrnItem {
  materialId: string;
  materialName: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  rejectionReason?: string;
}

export interface GrnRecord {
  id: string;
  grnNumber: string;
  poNumber: string;
  projectId: string;
  projectName: string;
  vendorName: string;
  challanNumber: string;
  invoiceNumber: string;
  date: string;
  warehouse: string;
  vehicleNo: string;
  receivedBy: string;
  items: GrnItem[];
  status: "verified" | "flagged" | "draft";
}

export interface MaterialIssue {
  id: string;
  issueNumber: string;
  projectId: string;
  projectName: string;
  activityId: string;
  activityName: string;
  issuedTo: string;
  date: string;
  items: Array<{ materialId: string; materialName: string; quantity: number; unit: string }>;
  requisitionNo: string;
  issuedBy: string;
}

export interface MaterialReturn {
  id: string;
  returnNumber: string;
  projectId: string;
  projectName: string;
  returnedBy: string;
  date: string;
  items: Array<{ materialId: string; materialName: string; quantity: number; unit: string; condition: "good" | "damaged" | "scrap" }>;
  reason: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouse: string;
  destinationWarehouse: string;
  dispatchDate: string;
  arrivalDate?: string;
  status: "in_transit" | "received" | "cancelled";
  items: Array<{ materialId: string; materialName: string; quantity: number; unit: string }>;
  driverContact: string;
}

export type ExpenseCategory = "Fuel" | "Labour Wages" | "Site Amenities" | "Equipment Hire" | "Materials" | "Permits & Statutory" | "Miscellaneous";
export type ExpenseStatus = "draft" | "pending_approval" | "approved" | "rejected" | "paid";

export interface ExpenseRecord {
  id: string;
  expenseNumber: string;
  projectId: string;
  projectName: string;
  category: ExpenseCategory;
  amount: number;
  vendorContractor: string;
  paidBy: string;
  paymentMode: "Petty Cash" | "Bank Transfer" | "UPI" | "Cheque";
  date: string;
  receiptAttached: boolean;
  receiptName?: string;
  status: ExpenseStatus;
  notes: string;
}

export interface PaymentRecord {
  id: string;
  voucherNumber: string;
  projectId: string;
  projectName: string;
  payeeName: string;
  payeeType: "Vendor" | "Contractor" | "Staff" | "Utility";
  invoiceRef: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: "pending" | "approved" | "paid" | "overdue";
  paymentMethod?: string;
}

export interface AdvanceRecord {
  id: string;
  advanceNumber: string;
  projectId: string;
  projectName: string;
  partyName: string;
  partyType: "Subcontractor" | "Supplier" | "Employee";
  amount: number;
  recoveredAmount: number;
  outstandingBalance: number;
  disbursementDate: string;
  recoveryTerms: string;
  status: "active" | "recovered" | "overdue";
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  rating: number;
  activePOsCount: number;
  totalBilled: number;
  pendingPayment: number;
  status: "active" | "blocked";
}

export interface Contractor {
  id: string;
  name: string;
  trade: string;
  contactPerson: string;
  phone: string;
  workOrdersCount: number;
  activeWorkers: number;
  totalContractValue: number;
  paidToDate: number;
  retentionHeld: number;
  performanceScore: number;
  status: "active" | "hold";
}

export interface Employee {
  id: string;
  empCode: string;
  name: string;
  role: string;
  department: string;
  assignedSite: string;
  phone: string;
  email: string;
  status: "on_site" | "in_office" | "on_leave" | "travelling";
  dateOfJoining: string;
}

export interface LabourContractor {
  id: string;
  name: string;
  trade: string;
  assignedProject: string;
  currentDeployment: number;
  plannedDeployment: number;
  supervisorName: string;
  phone: string;
  dailyWageRate: number;
  status: "active" | "understrength" | "inactive";
}

export interface AttendanceEntry {
  workerId: string;
  workerName: string;
  trade: string;
  contractorName: string;
  status: "present" | "absent" | "half_day";
  hours: number;
  otHours: number;
  wageRate: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  projectId: string;
  projectName: string;
  totalWorkforce: number;
  totalPresent: number;
  totalAbsent: number;
  regularHours: number;
  overtimeHours: number;
  totalWageImpact: number;
  entries: AttendanceEntry[];
  submittedBy: string;
}

export interface EquipmentAsset {
  id: string;
  assetCode: string;
  name: string;
  type: "Tower Crane" | "Excavator" | "Concrete Pump" | "Batching Plant" | "Transit Mixer" | "DG Set" | "Passenger Hoist";
  ownership: "Owned" | "Rented";
  currentSite: string;
  status: "running" | "idle" | "breakdown" | "maintenance";
  totalOperatingHours: number;
  currentHourMeter: number;
  fuelEfficiencyLph: number;
  hourlyRate: number;
  nextServiceInHours: number;
  lastServiceDate: string;
  operator: { name: string; phone: string };
  rentalVendor?: string;
  monthlyRental?: number;
}

export interface FuelLog {
  id: string;
  date: string;
  equipmentId: string;
  equipmentName: string;
  projectId: string;
  quantityLiters: number;
  unitRate: number;
  totalAmount: number;
  dispensedBy: string;
  hourMeterReading: number;
}

export interface MaintenanceRecord {
  id: string;
  ticketNumber: string;
  equipmentId: string;
  equipmentName: string;
  projectId: string;
  issueDate: string;
  resolvedDate?: string;
  type: "Preventative" | "Breakdown" | "Routine Service";
  description: string;
  cost: number;
  partsReplaced?: string;
  status: "open" | "in_progress" | "completed";
  technician: string;
}

export interface SmartAlert {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  severity: "critical" | "attention" | "healthy";
  category: "Material" | "Schedule" | "Cost" | "Equipment" | "DPR" | "Safety" | "Payment";
  problem: string;
  rootCause: string;
  impact: string;
  impactAmount?: number;
  impactDays?: number;
  suggestedAction: string;
  sourceRef: { type: string; id: string; label: string; to?: string };
  status: "open" | "acknowledged" | "assigned" | "resolved";
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  history: Array<{ action: string; by: string; timestamp: string; note?: string }>;
}

export interface ReportConfig {
  id: string;
  name: string;
  cadence: string;
  category: string;
  description: string;
  owner: string;
  format: "PDF" | "XLSX";
  lastGenerated: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: "Drawing" | "Contract" | "Invoice" | "Report" | "Approval" | "Compliance" | "Photo";
  category: string;
  projectId: string;
  projectName: string;
  size: string;
  fileExtension: string;
  version: string;
  updatedDate: string;
  uploadedBy: string;
  tags: string[];
  status: "active" | "archived" | "superseded";
  downloadUrl?: string;
}

export interface RolePermission {
  id: string;
  roleName: string;
  description: string;
  usersCount: number;
  permissions: Record<string, { view: boolean; create: boolean; edit: boolean; approve: boolean; delete: boolean }>;
}

export interface CompanySettings {
  companyName: string;
  legalName: string;
  gstin: string;
  panNumber: string;
  cinNumber: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  fiscalYearStart: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  subscription: {
    planName: "Enterprise Tier";
    activeProjectsLimit: number;
    activeProjectsUsed: number;
    storageLimitGb: number;
    storageUsedGb: number;
    seatsLimit: number;
    seatsUsed: number;
    renewsOn: string;
    billingCycle: "Annual";
  };
}

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
  id?: string;
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
  rawStatus?: string;
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
  items: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    condition: "good" | "damaged" | "scrap";
  }>;
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

export type ExpenseCategory =
  | "Fuel"
  | "Labour Wages"
  | "Site Amenities"
  | "Equipment Hire"
  | "Materials"
  | "Permits & Statutory"
  | "Miscellaneous";
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
  type:
    | "Tower Crane"
    | "Excavator"
    | "Concrete Pump"
    | "Batching Plant"
    | "Transit Mixer"
    | "DG Set"
    | "Passenger Hoist";
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
  permissions: Record<
    string,
    { view: boolean; create: boolean; edit: boolean; approve: boolean; delete: boolean }
  >;
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
    planName: "Enterprise Tier" | "Professional Tier" | "Starter Tier";
    activeProjectsLimit: number;
    activeProjectsUsed: number;
    storageLimitGb: number;
    storageUsedGb: number;
    seatsLimit: number;
    seatsUsed: number;
    renewsOn: string;
    billingCycle: "Annual" | "Monthly";
  };
}

// --- BOQ & DIGITAL MEASUREMENT BOOK ---
export interface BoqItem {
  id: string;
  projectId: string;
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  wbsActivityId?: string | undefined;
  wbsActivityCode?: string | undefined;
  executedQty?: number | undefined;
}

export type MeasurementType =
  | "Length × Breadth × Depth"
  | "Length × Breadth"
  | "Length"
  | "Area"
  | "Volume"
  | "Count"
  | "Weight"
  | "Custom";

export interface DigitalMbRecord {
  id: string;
  projectId: string;
  projectName: string;
  mbNumber: string;
  date: string;
  measurementType: MeasurementType;
  boqItemId: string;
  boqItemNumber: string;
  wbsActivityId: string;
  location: string;
  description: string;
  dimensions: {
    length: number;
    breadth: number;
    depth: number;
    count: number;
    customFactor: number;
  };
  unit: string;
  calculatedQty: number;
  previousQty: number;
  currentQty: number;
  cumulativeQty: number;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedBy?: string | undefined;
  verifiedAt?: string | undefined;
  notes: string;
  attachments: string[];
}

// --- LOOKAHEAD & PLANNING ---
export interface LookaheadItem {
  id: string;
  projectId: string;
  wbsActivityId: string;
  activityCode: string;
  activityName: string;
  plannedStart: string;
  plannedFinish: string;
  weekWindow: "2_weeks" | "4_weeks";
  readinessStatus: "ready" | "blocked" | "at_risk";
  blockedReason?: string | undefined;
  responsibleTeam: string;
  delayDays: number;
  progressPercent: number;
}

// --- QA/QC & NCR ---
export interface PourCardRecord {
  id: string;
  projectId: string;
  pourNumber: string;
  location: string;
  element: string;
  gradeOfConcrete: string;
  plannedQuantityCum: number;
  pourDate: string;
  checklist: {
    shutteringVerified: boolean;
    rebarVerified: boolean;
    coverBlocksVerified: boolean;
    mepInsertsVerified: boolean;
    cleaningVerified: boolean;
  };
  status: "draft" | "submitted" | "approved" | "rejected" | "poured";
  approvedBy?: string | undefined;
  conductedBy: string;
}

export type NcrSeverity = "minor" | "major" | "critical";
export type NcrStatus = "open" | "assigned" | "action_required" | "under_verification" | "closed";

export interface NcrRecord {
  id: string;
  projectId: string;
  ncrNumber: string;
  title: string;
  description: string;
  location: string;
  severity: NcrSeverity;
  responsibleParty: string;
  dueDate: string;
  correctiveAction?: string | undefined;
  preventiveAction?: string | undefined;
  status: NcrStatus;
  verifiedBy?: string | undefined;
  closedAt?: string | undefined;
  createdAt: string;
}

// --- SAFETY & EHS ---
export interface SafetyWalkthrough {
  id: string;
  projectId: string;
  walkthroughNumber: string;
  date: string;
  inspectorName: string;
  ppeCompliancePercent: number;
  scaffoldingSafe: boolean;
  electricalSafe: boolean;
  housekeepingRating: number; // 1-5
  violationsFound: number;
  status: "completed" | "actions_pending";
}

export interface SafetyIncident {
  id: string;
  projectId: string;
  incidentNumber: string;
  date: string;
  type: "near_miss" | "first_aid" | "medical_treatment" | "lost_time";
  description: string;
  location: string;
  rootCause: string;
  capaPlan: string;
  status: "open" | "under_investigation" | "capa_implemented" | "closed";
  reportedBy: string;
}

// --- DRAWINGS & RFI ---
export interface DrawingRevision {
  revisionCode?: string | undefined; // "Rev 01", "Rev 02"
  revision?: string | undefined;
  issueDate: string;
  description?: string | undefined;
  note?: string | undefined;
  status?: "current" | "superseded" | undefined;
}

export interface DrawingRecord {
  id: string;
  projectId: string;
  drawingNumber: string;
  title: string;
  discipline: "Architecture" | "Structural" | "MEP" | "Other" | string;
  currentRevision?: string | undefined;
  revision?: string | undefined;
  status: "approved" | "under_review" | "superseded" | "GFC" | string;
  issueDate: string;
  isSuperseded?: boolean | undefined;
  revisions?: DrawingRevision[] | undefined;
  revisionHistory?: Array<{ revision: string; issueDate: string; note?: string }> | undefined;
  fileSize?: string | undefined;
}

export interface RfiRecord {
  id: string;
  projectId?: string | undefined;
  project?: string | undefined;
  rfiNumber?: string | undefined;
  subject: string;
  technicalQuery: string;
  discipline: "Architecture" | "Structural" | "MEP" | "Other" | string;
  raisedBy: string;
  assignedTo?: string | undefined;
  priority: "low" | "medium" | "high" | "critical" | "Urgent" | "High" | "Medium" | string;
  dueDate: string;
  status: "open" | "under_review" | "answered" | "closed" | "Open" | string;
  response?: string | undefined;
  respondedBy?: string | undefined;
  respondedAt?: string | undefined;
  createdAt?: string | undefined;
}

// --- RA BILLING, CLIENT BILLING, FINAL BILL ---
export type RaBillStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "approved"
  | "payable"
  | "paid";

export interface ContractorRaBill {
  id: string;
  billNumber: string;
  projectId: string;
  projectName: string;
  contractorId: string;
  contractorName: string;
  billingPeriod: string;
  measurementRef: string;
  grossBill: number;
  retentionPercent: number;
  retentionAmount: number;
  advanceRecovery: number;
  tdsPercent: number;
  tdsAmount: number;
  labourCessPercent: number;
  labourCessAmount: number;
  otherDeductions: number;
  netPayable: number;
  status: RaBillStatus;
  submittedDate: string;
  approvedDate?: string | undefined;
  paidDate?: string | undefined;
}

export type ClientBillingStatus =
  | "draft"
  | "submitted"
  | "certified"
  | "receivable"
  | "received";

export interface ClientBillingRecord {
  id: string;
  claimNumber: string;
  projectId: string;
  projectName: string;
  claimPeriod: string;
  cumulativeWork: number;
  previousCertified: number;
  currentClaim: number;
  grossClaim: number;
  gstPercent: number;
  gstAmount: number;
  netClaim: number;
  status: ClientBillingStatus;
  submittedDate: string;
  certifiedDate?: string | undefined;
}

export interface FinalBillRecord {
  id: string;
  finalBillNumber: string;
  projectId: string;
  projectName: string;
  contractorName: string;
  contractValue: number;
  grossTotalExecuted: number;
  totalRetentionHeld: number;
  retentionReleased: number;
  totalRecoveries: number;
  otherDeductions: number;
  netSettlement: number;
  noClaimCertificateReceived: boolean;
  status: "under_audit" | "settlement_approved" | "closed";
  closeoutDate: string;
}

// --- ALERTS & APPROVAL RULES ---
export interface CustomAlertRule {
  id: string;
  name: string;
  metric: string;
  operator: ">" | "<" | "=" | ">=" | "<=";
  threshold: number;
  scope: string; // Project / Store / Company
  severity: "critical" | "attention" | "healthy" | "info" | string;
  recipientRole?: string | undefined;
  recipient?: string | undefined;
  enabled: boolean;
  status?: string | undefined;
  connectedState?: "engine_not_connected" | string | undefined;
}

export interface CustomApprovalRule {
  id: string;
  module: "PO" | "Expense" | "Payment" | "GRN" | "DPR" | "Leave";
  triggerCondition: string;
  stagesCount: number;
  approverRoles: string[];
  segregationOfDuties: boolean;
  status: "active" | "inactive";
}

// --- ENTERPRISE STRUCTURE & INTEGRATIONS ---
export interface CompanyEntity {
  id: string;
  code: string;
  name: string;
  legalName: string;
  cin?: string | undefined;
  pan: string;
  gstin: string;
  state: string;
  status: "active" | "inactive";
  projectCount?: number | undefined;
}

export interface BranchEntity {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  gstin: string;
  status: "active" | "inactive";
  projectCount?: number | undefined;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix?: string | undefined;
  token?: string | undefined;
  maskedToken?: string | undefined;
  scope?: string | undefined;
  createdDate?: string | undefined;
  createdAt?: string | undefined;
  lastUsed?: string | undefined;
  lastUsedAt?: string | undefined;
  status: "active" | "revoked";
}

export interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  secret?: string | undefined;
  status: "active" | "failing";
  lastDelivery?: string | undefined;
  lastDeliveryAt?: string | undefined;
  connectedState?: "delivery_service_disconnected" | string | undefined;
}

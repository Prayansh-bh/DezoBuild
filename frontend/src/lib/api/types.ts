/**
 * DEZOBUILD — Typed API Data Contracts & Response DTOs
 * 
 * Strict TypeScript types reflecting backend domain models and REST envelopes.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    correlationId: string;
    requestId: string;
    message?: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    timestamp: string;
    correlationId: string;
    requestId: string;
    message?: string;
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// ==========================================
// AUTH & USER TYPES
// ==========================================

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  tenantId: string;
  tenantName?: string;
  planTier?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  assignedProjects?: Array<{ projectId: string; projectName: string; roleName: string }>;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ==========================================
// INVITATION TYPES
// ==========================================

export interface InviteUserRequest {
  email: string;
  fullName: string;
  roleId: string;
}

export interface InvitationDto {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface AcceptInviteRequest {
  token: string;
  password: string;
  fullName?: string | undefined;
}


export interface AcceptInviteResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  user: AuthUser;
}


// ==========================================
// PROJECT TYPES
// ==========================================

export interface ProjectEntity {
  id: string;
  tenantId: string;
  companyId: string;
  branchId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  projectType: string;
  status: string;
  clientName?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  contractValue: number | string;
  budget: number | string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  progressPercent: number;
  projectManagerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  companyId: string;
  branchId?: string;
  code: string;
  name: string;
  description?: string;
  projectType?: string;
  clientName?: string;
  location?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contractValue: number | string;
  budget: number | string;
  plannedStartDate: string;
  plannedEndDate: string;
  projectManagerId?: string;
}

export interface WbsNodeEntity {
  id: string;
  tenantId: string;
  projectId: string;
  parentId?: string | null;
  code: string;
  name: string;
  level: number;
  sequence: number;
  plannedBudget?: number | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEntity {
  id: string;
  tenantId: string;
  projectId: string;
  wbsNodeId: string;
  title: string;
  description?: string | null;
  status: string;
  progressPercent: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DprEntity {
  id: string;
  tenantId: string;
  projectId: string;
  reportDate: string;
  dprNumber: string;
  status: string;
  weather?: string | null;
  siteConditions?: string | null;
  workExecutedSummary?: string | null;
  hindrances?: string | null;
  safetyObservations?: string | null;
  totalWorkforceCount: number;
  preparedById: string;
  approvedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoqItemEntity {
  id: string;
  tenantId: string;
  projectId: string;
  itemNumber: string;
  description: string;
  uom: string;
  estimatedQuantity: number | string;
  unitRate: number | string;
  totalAmount: number | string;
  executedQuantity?: number | string;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalMbRecordEntity {
  id: string;
  tenantId: string;
  projectId: string;
  boqItemId: string;
  measurementDate: string;
  sheetNumber: string;
  description: string;
  totalQuantity: number | string;
  status: string;
  recordedById: string;
  verifiedById?: string | null;
  approvedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MATERIAL & PROCUREMENT TYPES
// ==========================================

export interface MaterialEntity {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: string;
  uom: string;
  hsnCode?: string | null;
  standardRate: number | string;
  safetyStock: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialIndentEntity {
  id: string;
  tenantId: string;
  projectId: string;
  indentNumber: string;
  requestedDate: string;
  requiredByDate: string;
  priority: string;
  status: string;
  remarks?: string | null;
  createdById: string;
  lines?: Array<{
    id: string;
    materialId: string;
    materialName?: string;
    requestedQuantity: number | string;
    uom: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderEntity {
  id: string;
  tenantId: string;
  projectId: string;
  vendorId: string;
  vendorName?: string;
  poNumber: string;
  poDate: string;
  deliveryDueDate: string;
  status: string;
  subtotalAmount: number | string;
  taxAmount: number | string;
  grossAmount: number | string;
  createdById: string;
  lines?: Array<{
    id: string;
    materialId: string;
    materialName?: string;
    quantity: number | string;
    unitPrice: number | string;
    totalAmount: number | string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptNoteEntity {
  id: string;
  tenantId: string;
  projectId: string;
  purchaseOrderId?: string | null;
  vendorId: string;
  grnNumber: string;
  receiptDate: string;
  status: string;
  challanNumber?: string | null;
  receivedById: string;
  lines?: Array<{
    id: string;
    materialId: string;
    materialName?: string;
    receivedQuantity: number | string;
    acceptedQuantity: number | string;
    rejectedQuantity: number | string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialIssueEntity {
  id: string;
  tenantId: string;
  projectId: string;
  storeId: string;
  issueNumber: string;
  issueDate: string;
  status: string;
  issuedTo?: string | null;
  issuedById: string;
  lines?: Array<{
    id: string;
    materialId: string;
    materialName?: string;
    issuedQuantity: number | string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface StoreStockBalanceEntity {
  id: string;
  tenantId: string;
  storeId: string;
  storeName?: string;
  materialId: string;
  materialName?: string;
  category?: string;
  uom?: string;
  onHandQuantity: number | string;
  reservedQuantity: number | string;
  availableQuantity: number | string;
  averageRate?: number | string;
  totalValue?: number | string;
  reorderLevel?: number;
  safetyStock?: number;
  isLowStock?: boolean;
}

// ==========================================
// FINANCE TYPES
// ==========================================

export interface ExpenseRecordEntity {
  id: string;
  tenantId: string;
  projectId: string;
  projectName?: string;
  claimNumber: string;
  claimDate: string;
  amount: number | string;
  taxAmount?: number | string;
  categoryName?: string;
  paidTo: string;
  paidAmount?: number | string;
  description: string;
  receiptUrl?: string | null;
  status: string;
  submittedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInvoiceEntity {
  id: string;
  tenantId: string;
  projectId: string;
  vendorId: string;
  vendorName?: string;
  invoiceNumber: string;
  vendorInvoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotalAmount: number | string;
  taxAmount: number | string;
  grossTotal: number | string;
  netPayable: number | string;
  paidAmount: number | string;
  outstandingBalance: number | string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RaBillEntity {
  id: string;
  tenantId: string;
  projectId: string;
  vendorId: string;
  vendorName?: string;
  billNumber: string;
  billSequence: number;
  billDate: string;
  grossAmount: number | string;
  totalDeductions: number | string;
  netPayable: number | string;
  paidAmount: number | string;
  outstandingBalance: number | string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentVoucherEntity {
  id: string;
  tenantId: string;
  voucherNumber: string;
  paymentDate: string;
  amount: number | string;
  paymentMode: string;
  paidTo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PEOPLE & ATTENDANCE TYPES
// ==========================================

export interface EmployeeEntity {
  id: string;
  tenantId: string;
  companyId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  departmentName?: string;
  status: string;
  joinedDate: string;
}

export interface AttendanceRecordEntity {
  id: string;
  tenantId: string;
  projectId?: string | null;
  employeeId: string;
  employeeName?: string;
  designation?: string;
  attendanceDate: string;
  status: string;
  firstPunchIn?: string | null;
  lastPunchOut?: string | null;
  totalWorkHours?: number | string | null;
  isRegularized: boolean;
}

export interface LabourContractorEntity {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  trade: string;
  contactPerson?: string | null;
  phone?: string | null;
  activeLabourCount: number;
  status: string;
}

// ==========================================
// EQUIPMENT TYPES
// ==========================================

export interface EquipmentEntity {
  id: string;
  tenantId: string;
  equipmentCode: string;
  name: string;
  category: string;
  make?: string | null;
  model?: string | null;
  status: string;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  meterReadingHours: number | string;
  fuelCapacityLiters?: number | null;
  hourlyOperatingCost: number | string;
}

export interface EquipmentOperatingLogEntity {
  id: string;
  tenantId: string;
  equipmentId: string;
  projectId: string;
  logDate: string;
  startReadingHours: number | string;
  endReadingHours: number | string;
  hoursOperated: number | string;
  operatorName?: string | null;
  fuelConsumedLiters?: number | string | null;
}

export interface EquipmentFuelLogEntity {
  id: string;
  tenantId: string;
  equipmentId: string;
  projectId: string;
  fuelDate: string;
  quantityLiters: number | string;
  ratePerLiter: number | string;
  totalCost: number | string;
  meterReadingAtFueling: number | string;
}

export interface MaintenanceWorkOrderEntity {
  id: string;
  tenantId: string;
  equipmentId: string;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  costEstimate?: number | string | null;
  actualCost?: number | string | null;
  scheduledDate: string;
  completedAt?: string | null;
}

// ==========================================
// QUALITY & SAFETY TYPES
// ==========================================

export interface NonConformanceReportEntity {
  id: string;
  tenantId: string;
  projectId: string;
  ncrNumber: string;
  title: string;
  description: string;
  location: string;
  category: string;
  severity: string;
  status: string;
  targetClosureDate: string;
  closedAt?: string | null;
  createdAt: string;
}

export interface SafetyIncidentEntity {
  id: string;
  tenantId: string;
  projectId: string;
  incidentNumber: string;
  incidentType: string;
  severity: string;
  occurredAt: string;
  location: string;
  description: string;
  status: string;
  createdAt: string;
}

// ==========================================
// DOCUMENTS & RFI TYPES
// ==========================================

export interface DocumentEntity {
  id: string;
  tenantId: string;
  projectId?: string | null;
  documentNumber: string;
  title: string;
  category: string;
  status: string;
  latestVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface DrawingEntity {
  id: string;
  tenantId: string;
  projectId: string;
  drawingNumber: string;
  title: string;
  discipline: string;
  revision: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RfiEntity {
  id: string;
  tenantId: string;
  projectId: string;
  rfiNumber: string;
  subject: string;
  discipline: string;
  technicalQuery: string;
  proposedSolution?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  officialResponse?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// APPROVALS TYPES
// ==========================================

export interface ApprovalRequestEntity {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  title: string;
  amount?: number | string | null;
  status: string;
  currentStepSequence: number;
  totalSteps: number;
  submittedById: string;
  submittedAt: string;
  completedAt?: string | null;
  steps?: Array<{
    id: string;
    sequence: number;
    stepName: string;
    status: string;
    approverId?: string | null;
    decidedAt?: string | null;
    decisionRemarks?: string | null;
  }>;
}

// ==========================================
// ALERTS & NOTIFICATIONS TYPES
// ==========================================

export interface AlertEntity {
  id: string;
  tenantId: string;
  projectId?: string | null;
  projectName?: string | null;
  alertType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  dueAt?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface NotificationDeliveryEntity {
  id: string;
  tenantId: string;
  channel: string;
  status: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  alert?: {
    id: string;
    title: string;
    message: string;
    severity: string;
  };
}

// ==========================================
// REPORTS & CONTROL TOWER TYPES
// ==========================================

export interface ControlTowerSummaryData {
  tenantId: string;
  projectId?: string;
  asOfDate: string;
  healthScore: number;
  status: 'HEALTHY' | 'ATTENTION_REQUIRED' | 'CRITICAL_RISK';
  metrics: {
    openAlerts: number;
    criticalAlerts: number;
    pendingApprovals: number;
    openNcrs: number;
    criticalSafetyIncidents: number;
    overdueRfis: number;
    lowStockItems: number;
    breakdownEquipment: number;
  };
  rankedSignals: Array<{ type: string; title: string; severity: string; referenceId?: string }>;
  executiveSummary: string;
}

export interface AIInsightEntity {
  id: string;
  tenantId: string;
  projectId?: string | null;
  featureKey: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  summary: string;
  evidence?: any;
  confidence?: number;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED' | 'EXPIRED';
  createdAt: string;
}

export interface ProjectSummaryReportData {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalContractValue: number | string;
  totalBudget: number | string;
  overallAverageProgress: number;
}

export interface BudgetVsActualReportData {
  totalBudget: number | string;
  totalActual: number | string;
  varianceAmount: number | string;
  variancePercent: number;
}

export interface MaterialStockReportDto {
  totalMaterials?: number;
  totalStockValue?: number | string;
  lowStockCount?: number;
  criticalItems?: any[];
}

export interface ManpowerAttendanceReportDto {
  date?: string;
  totalPresent?: number;
  totalAbsent?: number;
  totalHoursWorked?: number;
  contractorHeadcount?: Record<string, number>;
}

export interface EquipmentUtilizationReportDto {
  totalEquipment?: number;
  activeCount?: number;
  idleCount?: number;
  breakdownCount?: number;
  averageUtilizationPercent?: number;
}

export interface QualitySafetyReportDto {
  openNcrs?: number;
  resolvedNcrs?: number;
  openIncidents?: number;
  safetyScore?: number;
}

export type ProjectSummaryReportDto = ProjectSummaryReportData;
export type FinanceBudgetReportDto = BudgetVsActualReportData;
export type ControlTowerSummaryDto = ControlTowerSummaryData;
export type AiInsightDto = AIInsightEntity;
export type AlertDto = AlertEntity;
export type NotificationDto = NotificationDeliveryEntity;
export type ApprovalRequestDto = ApprovalRequestEntity;
export type EngineeringDocumentDto = DocumentEntity;
export type RfiDto = RfiEntity;

// --- Auth DTOs ---
export type LoginRequest = Record<string, any>;
export type LoginResponse = LoginResponseData;
export type RefreshResponse = Record<string, any>;
export type UserDto = AuthUser;

// --- Project DTOs ---
export type ProjectDto = Record<string, any>;
export type CreateProjectRequest = Record<string, any>;
export type UpdateProjectRequest = Record<string, any>;
export type WbsNodeDto = Record<string, any>;
export type CreateWbsNodeRequest = Record<string, any>;
export type TaskDto = Record<string, any>;
export type CreateTaskRequest = Record<string, any>;
export type TaskDependencyDto = Record<string, any>;
export type DprDto = Record<string, any>;
export type CreateDprRequest = Record<string, any>;
export type BoqItemDto = Record<string, any>;
export type CreateBoqItemRequest = Record<string, any>;
export type DigitalMbEntryDto = Record<string, any>;
export type CreateDigitalMbEntryRequest = Record<string, any>;

// --- Material DTOs ---
export type MaterialDto = Record<string, any>;
export type CreateMaterialRequest = Record<string, any>;
export type StoreDto = Record<string, any>;
export type CreateStoreRequest = Record<string, any>;
export type VendorDto = Record<string, any>;
export type CreateVendorRequest = Record<string, any>;
export type MaterialIndentDto = Record<string, any>;
export type CreateIndentRequest = Record<string, any>;
export type PurchaseOrderDto = Record<string, any>;
export type CreatePurchaseOrderRequest = Record<string, any>;
export type GoodsReceiptDto = Record<string, any>;
export type CreateGoodsReceiptRequest = Record<string, any>;
export type MaterialIssueDto = Record<string, any>;
export type CreateMaterialIssueRequest = Record<string, any>;
export type MaterialReturnDto = Record<string, any>;
export type CreateMaterialReturnRequest = Record<string, any>;
export type MaterialTransferDto = Record<string, any>;
export type CreateMaterialTransferRequest = Record<string, any>;
export type StockBalanceDto = Record<string, any>;
export type StockMovementDto = Record<string, any>;

// --- People DTOs ---
export type EmployeeDto = Record<string, any>;
export type CreateEmployeeRequest = Record<string, any>;
export type AttendanceRecordDto = Record<string, any>;
export type CreateAttendanceRequest = Record<string, any>;
export type LabourMusterDto = Record<string, any>;
export type CreateLabourMusterRequest = Record<string, any>;
export type ShiftDto = Record<string, any>;
export type CreateShiftRequest = Record<string, any>;
export type LeaveRequestDto = Record<string, any>;
export type CreateLeaveRequest = Record<string, any>;
export type ContractorDto = Record<string, any>;
export type CreateContractorRequest = Record<string, any>;
export type HolidayDto = Record<string, any>;
export type CreateHolidayRequest = Record<string, any>;

// --- Equipment DTOs ---
export type EquipmentDto = Record<string, any>;
export type CreateEquipmentRequest = Record<string, any>;
export type EquipmentAssignmentDto = Record<string, any>;
export type CreateEquipmentAssignmentRequest = Record<string, any>;
export type EquipmentOperatingLogDto = Record<string, any>;
export type CreateEquipmentLogRequest = Record<string, any>;
export type EquipmentFuelLogDto = Record<string, any>;
export type CreateFuelLogRequest = Record<string, any>;
export type EquipmentWorkOrderDto = Record<string, any>;
export type CreateEquipmentWorkOrderRequest = Record<string, any>;

// --- Finance DTOs ---
export type ExpenseDto = Record<string, any>;
export type CreateExpenseRequest = Record<string, any>;
export type InvoiceDto = Record<string, any>;
export type CreateInvoiceRequest = Record<string, any>;
export type RaBillDto = Record<string, any>;
export type CreateRaBillRequest = Record<string, any>;
export type PaymentVoucherDto = Record<string, any>;
export type CreatePaymentVoucherRequest = Record<string, any>;
export type AdvanceDto = Record<string, any>;
export type CreateAdvanceRequest = Record<string, any>;
export type ProjectCostSummaryDto = Record<string, any>;

// --- Quality & Safety DTOs ---
export type InspectionDto = Record<string, any>;
export type CreateInspectionRequest = Record<string, any>;
export type NcrDto = Record<string, any>;
export type CreateNcrRequest = Record<string, any>;
export type SafetyObservationDto = Record<string, any>;
export type CreateSafetyObservationRequest = Record<string, any>;
export type SafetyIncidentDto = Record<string, any>;
export type CreateSafetyIncidentRequest = Record<string, any>;

// --- Document & Approval DTOs ---
export type CreateDocumentRequest = Record<string, any>;
export type DocumentVersionDto = Record<string, any>;
export type RegisterDocumentVersionRequest = Record<string, any>;
export type TransmittalDto = Record<string, any>;
export type CreateTransmittalRequest = Record<string, any>;
export type CreateRfiRequest = Record<string, any>;
export type SubmitApprovalRequest = Record<string, any>;

// --- Tenant User Directory DTOs ---
export interface TenantUserRoleDto {
  id: string;
  name: string;
  displayName: string;
  scopeType: string;
}

export interface TenantUserInvitationDto {
  id: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface TenantUserDto {
  id: string;
  email: string;
  fullName: string;
  status: string;
  primaryRole: string;
  roleDisplayName: string;
  roles: TenantUserRoleDto[];
  department: string | null;
  assignedSite: string | null;
  invitation: TenantUserInvitationDto | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ListTenantUsersResponse {
  users: TenantUserDto[];
  total: number;
}


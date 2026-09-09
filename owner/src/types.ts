/**
 * DEZOBUILD Platform Owner Data Types
 * 
 * Defines data structures for owner.dezobuild.com SaaS administration,
 * tenant lifecycle management, billing, system health, and security telemetry.
 */

export type TenantStatus = "active" | "trialing" | "suspended" | "provisioning" | "delinquent";
export type SubscriptionTier = "Starter" | "Professional" | "Enterprise" | "Custom";
export type InvoiceStatus = "paid" | "open" | "overdue" | "void";
export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type HealthStatus = "healthy" | "degraded" | "outage" | "maintenance";

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  legalName: string;
  customDomain?: string;
  planTier: SubscriptionTier;
  status: TenantStatus;
  seatsAllocated: number;
  seatsUsed: number;
  mrr: number; // in INR
  activeSitesCount: number;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  region: string;
  createdAt: string;
  renewalDate: string;
}

export interface PlatformSubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  seatLimit: number;
  storageLimitGb: number;
  activeTenants: number;
  features: string[];
  recommended?: boolean;
}

export interface PlatformInvoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  plan: SubscriptionTier;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  gateway: "Razorpay Enterprise" | "Stripe International" | "Direct Wire Transfer";
}

export interface PlatformGlobalUser {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  tenantName: string;
  role: string;
  status: "active" | "invited" | "suspended";
  mfaEnabled: boolean;
  lastActive: string;
  authProvider: "Enterprise SAML / Okta" | "Google Workspace" | "Email & Password";
}

export interface PlatformEntitlement {
  tenantId: string;
  tenantName: string;
  planTier: SubscriptionTier;
  bim3dViewer: boolean;
  aiScheduleForecasting: boolean;
  tallyErpSync: boolean;
  biometricHardwareSync: boolean;
  droneSurveyOrthomosaic: boolean;
  customDomainSsl: boolean;
  storageQuotaGb: number;
  storageUsedGb: number;
}

export interface PlatformTelemetry {
  totalTenants: number;
  activeTenants: number;
  totalMrr: number;
  totalArr: number;
  activeUsers24h: number;
  apiRequests24h: number;
  p95LatencyMs: number;
  edgeErrorRate: number;
  storageTotalTb: number;
}

export interface SystemHealthService {
  id: string;
  name: string;
  category: "Database" | "Compute" | "Cache" | "Queue" | "Edge / CDN" | "Third-Party";
  status: HealthStatus;
  uptime30d: string;
  latencyMs: number;
  cpuPercent: number;
  memoryPercent: number;
  region: string;
  lastChecked: string;
}

export interface PlatformAuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  ipAddress: string;
  severity: "info" | "warning" | "critical";
  details: string;
}

export interface PlatformSupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  tenantName: string;
  title: string;
  requesterName: string;
  requesterEmail: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  assignedAdmin: string;
}

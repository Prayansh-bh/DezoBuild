/**
 * DEZOBUILD Platform Owner Product Configuration & Telemetry Defaults
 * 
 * Defines product catalog configurations (plans, feature definitions, service targets)
 * and cold-boot zero/empty states for owner.dezobuild.com SaaS administration.
 * 
 * Misleading simulated datasets, fake business metrics, and fabricated telemetry
 * are strictly removed in favor of clean production-ready disconnected states.
 */

import type {
  PlatformTenant,
  PlatformSubscriptionPlan,
  PlatformInvoice,
  PlatformGlobalUser,
  PlatformEntitlement,
  PlatformTelemetry,
  SystemHealthService,
  PlatformAuditLog,
  PlatformSupportTicket,
} from "../types";

/**
 * Platform Product Catalog - Subscription Plan Tiers (Product Configuration)
 */
export const MOCK_SUBSCRIPTION_PLANS: PlatformSubscriptionPlan[] = [
  {
    id: "plan-starter",
    tier: "Starter",
    tagline: "For boutique contractors & single-site builders",
    monthlyPrice: 49999,
    annualPrice: 499990,
    seatLimit: 25,
    storageLimitGb: 200,
    activeTenants: 0,
    features: [
      "Up to 3 Active Construction Sites",
      "Daily Progress Report (DPR) Mobile Logging",
      "Basic Material Indents & Store Receipts (GRN)",
      "Biometric Attendance Uploads",
      "Standard PDF Export Reports",
      "Email Support (24h SLA)",
    ],
  },
  {
    id: "plan-pro",
    tier: "Professional",
    tagline: "For growing general contractors & mid-scale developers",
    monthlyPrice: 149999,
    annualPrice: 1499990,
    seatLimit: 100,
    storageLimitGb: 1000,
    activeTenants: 0,
    recommended: true,
    features: [
      "Up to 15 Active Construction Sites",
      "Full WBS & Milestone Scheduling",
      "Vendor Purchase Orders & Two-Way Matching",
      "Cash Flow Projections & Retention Ledgers",
      "Equipment Hour-Meter & Fuel Telematics",
      "Tally Prime & Busy ERP Sync Connector",
      "Dedicated Slack Channel Support (4h SLA)",
    ],
  },
  {
    id: "plan-enterprise",
    tier: "Enterprise",
    tagline: "For large infrastructure conglomerates & EPC leaders",
    monthlyPrice: 399999,
    annualPrice: 3999990,
    seatLimit: 500,
    storageLimitGb: 5000,
    activeTenants: 0,
    features: [
      "Unlimited Multi-Metro Project Sites",
      "BIM 3D Model Viewer & Revision Compare",
      "AI Schedule Slippage & Risk Forecasts",
      "Custom Subdomain / White-label SSL",
      "Enterprise SAML SSO & Okta Integration",
      "Real-time Hardware Biometric Machine Sync",
      "Dedicated Customer Success Manager & 99.95% SLA",
      "Custom REST API & Webhooks Access",
    ],
  },
];

/**
 * Platform Product Catalog - Feature Gate Definitions (Product Configuration)
 */
export interface PlatformFeatureDefinition {
  key: string;
  name: string;
  category: "Core Engine" | "AI & Analytics" | "Integrations" | "Hardware & IoT" | "Security";
  description: string;
  includedInTiers: Array<"Starter" | "Professional" | "Enterprise">;
}

export const PLATFORM_FEATURE_CATALOG: PlatformFeatureDefinition[] = [
  {
    key: "bim3dViewer",
    name: "BIM 3D Model Viewer & Revision Compare",
    category: "Core Engine",
    description: "Multi-disciplinary IFC viewer with clash detection highlights and revision overlays.",
    includedInTiers: ["Enterprise"],
  },
  {
    key: "aiScheduleForecasting",
    name: "AI Schedule Slippage & Risk Predictor",
    category: "AI & Analytics",
    description: "Machine learning milestone variance model trained on daily DPR velocity and material lead times.",
    includedInTiers: ["Enterprise"],
  },
  {
    key: "tallyErpSync",
    name: "Tally Prime & SAP ERP Sync Gateway",
    category: "Integrations",
    description: "Two-way automated sync of vendor ledgers, retention balances, and TDS entries.",
    includedInTiers: ["Professional", "Enterprise"],
  },
  {
    key: "biometricHardwareSync",
    name: "Biometric Machine Hardware Sync",
    category: "Hardware & IoT",
    description: "Direct IP whitelist and MQTT broker bridge for on-site eSSL / Matrix turnstile devices.",
    includedInTiers: ["Professional", "Enterprise"],
  },
  {
    key: "droneSurveyOrthomosaic",
    name: "Drone Aerial Orthomosaic Volumetrics",
    category: "Core Engine",
    description: "GeoTIFF point-cloud earthwork cut/fill calculation models.",
    includedInTiers: ["Enterprise"],
  },
  {
    key: "customDomainSsl",
    name: "Custom Subdomain & Dedicated SSL",
    category: "Security",
    description: "White-label custom domain mapping with automated Cloudflare SSL certificate provisioning.",
    includedInTiers: ["Enterprise"],
  },
];

/**
 * Infrastructure Service Targets (Catalog of Platform Services - Disconnected State)
 */
export const MOCK_HEALTH_SERVICES: SystemHealthService[] = [
  {
    id: "svc-pg-primary",
    name: "PostgreSQL Multi-Tenant DB Cluster (Primary)",
    category: "Database",
    status: "not_configured" as any,
    uptime30d: "—",
    latencyMs: 0,
    cpuPercent: 0,
    memoryPercent: 0,
    region: "ap-south-1a",
    lastChecked: "Not Connected",
  },
  {
    id: "svc-pg-replica",
    name: "PostgreSQL Read Replica (Analytics Pool)",
    category: "Database",
    status: "not_configured" as any,
    uptime30d: "—",
    latencyMs: 0,
    cpuPercent: 0,
    memoryPercent: 0,
    region: "ap-south-1b",
    lastChecked: "Not Connected",
  },
  {
    id: "svc-redis-cache",
    name: "Redis Cache & Distributed Session Cluster",
    category: "Cache",
    status: "not_configured" as any,
    uptime30d: "—",
    latencyMs: 0,
    cpuPercent: 0,
    memoryPercent: 0,
    region: "ap-south-1a",
    lastChecked: "Not Connected",
  },
  {
    id: "svc-worker-dpr",
    name: "Background Worker: DPR Digest & Photo Pipeline",
    category: "Queue",
    status: "not_configured" as any,
    uptime30d: "—",
    latencyMs: 0,
    cpuPercent: 0,
    memoryPercent: 0,
    region: "ap-south-1a",
    lastChecked: "Not Connected",
  },
  {
    id: "svc-edge-cdn",
    name: "Cloudflare Edge SSL & BIM Mesh CDN",
    category: "Edge / CDN",
    status: "not_configured" as any,
    uptime30d: "—",
    latencyMs: 0,
    cpuPercent: 0,
    memoryPercent: 0,
    region: "Global Anycast",
    lastChecked: "Not Connected",
  },
  {
    id: "svc-auth-sso",
    name: "Auth0 / SAML Enterprise Identity Gateway",
    category: "Third-Party",
    status: "not_configured" as any,
    uptime30d: "—",
    latencyMs: 0,
    cpuPercent: 0,
    memoryPercent: 0,
    region: "ap-south-1",
    lastChecked: "Not Connected",
  },
];

/**
 * Cold-boot Empty Customer & Operational Datasets
 */
export const MOCK_TELEMETRY: PlatformTelemetry = {
  totalTenants: 0,
  activeTenants: 0,
  totalMrr: 0,
  totalArr: 0,
  activeUsers24h: 0,
  apiRequests24h: 0,
  p95LatencyMs: 0,
  edgeErrorRate: 0,
  storageTotalTb: 0,
};

export const MOCK_TENANTS: PlatformTenant[] = [];
export const MOCK_INVOICES: PlatformInvoice[] = [];
export const MOCK_GLOBAL_USERS: PlatformGlobalUser[] = [];
export const MOCK_ENTITLEMENTS: PlatformEntitlement[] = [];
export const MOCK_AUDIT_LOGS: PlatformAuditLog[] = [];
export const MOCK_SUPPORT_TICKETS: PlatformSupportTicket[] = [];

import React, { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  Crown,
  Database,
  ExternalLink,
  FileCheck2,
  HardHat,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Lock,
  LogOut,
  Menu,
  Plus,
  Radio,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Users,
  X,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { MOCK_TELEMETRY, MOCK_TENANTS } from "../mock/platform-data";
import { usePlatformAuth } from "../auth";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

export const OWNER_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Platform Overview", icon: LayoutDashboard },
  { id: "tenants", label: "Companies & Tenants", icon: Building2 },
  { id: "subscriptions", label: "Subscriptions & Plans", icon: Crown },
  { id: "billing", label: "Billing & Invoices", icon: CreditCard },
  { id: "users", label: "Users & Team Seats", icon: Users },
  { id: "entitlements", label: "Feature Access & Limits", icon: Sliders },
  { id: "analytics", label: "Platform Analytics", icon: LineChart },
  { id: "health", label: "System Health", icon: Activity },
  { id: "audit", label: "Global Audit Logs", icon: FileCheck2 },
  { id: "support", label: "Support & Operations", icon: HelpCircle },
  { id: "settings", label: "Platform Settings", icon: Settings },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex h-16 items-center gap-2.5 ${compact ? "px-1" : "border-b border-sidebar-border px-5"}`}
    >
      <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <HardHat className="size-[18px]" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-base font-extrabold leading-none tracking-tight text-sidebar-foreground">
            DEZO<span className="text-primary">BUILD</span>
          </p>
          <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-red-600 dark:text-red-400">
            OWNER
          </span>
        </div>
        {!compact && (
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-sidebar-muted">
            SaaS Platform Governance
          </p>
        )}
      </div>
    </div>
  );
}

interface OwnerShellProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export function OwnerShell({ activeTab, onTabChange, children }: OwnerShellProps) {
  const { user, logout } = usePlatformAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showBoundaryModal, setShowBoundaryModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredTenants = MOCK_TENANTS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeItem = OWNER_NAV_ITEMS.find((i) => i.id === activeTab) || OWNER_NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <Brand />

        {/* Super Admin / Control Hub Context Card */}
        <div className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 transition-colors hover:bg-sidebar-accent">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">
              Platform Console
            </span>
            <span className="rounded border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-600 dark:text-red-300">
              SUPER ADMIN
            </span>
          </div>
          <p className="mt-1.5 text-xs font-semibold truncate text-sidebar-foreground">
            SaaS Control Hub
          </p>
          <p className="mt-0.5 text-[11px] truncate text-sidebar-muted">
            {MOCK_TENANTS.length > 0 ? `ap-south-1 · ${MOCK_TENANTS.length} Active Tenants` : "Platform Control Plane · Ready"}
          </p>
        </div>

        {/* Governance Navigation Items */}
        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
          aria-label="Platform Governance Navigation"
        >
          {OWNER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`group flex h-9.5 w-full items-center gap-3 rounded-lg px-3 text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground font-semibold shadow-xs"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <Icon
                  className={`size-[17px] shrink-0 transition-colors ${
                    active ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"
                  }`}
                />
                <span className="truncate text-left flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      item.badgeColor || "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Admin Profile & Customer App Switcher */}
        <div className="border-t border-sidebar-border p-3 space-y-1.5">
          <button
            onClick={() => setShowBoundaryModal(true)}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-xs font-semibold text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors cursor-pointer"
          >
            <ExternalLink className="size-4" />
            <span>Open Customer Portal</span>
          </button>

          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30">
            <div className="grid size-8 place-items-center rounded-full bg-red-500/15 border border-red-500/25 font-bold text-red-600 dark:text-red-400 text-xs shrink-0">
              {user?.fullName
                ? user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "SA"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {user?.fullName || "Super Administrator"}
              </p>
              <p className="truncate text-[10px] text-sidebar-muted">
                {user?.email || "superadmin@dezobuild.com"}
              </p>
            </div>
            <button
              onClick={async () => {
                await logout();
              }}
              title="Terminate Platform Session (Logout)"
              className="p-1 rounded text-sidebar-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-overlay lg:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="h-full w-[82%] max-w-[310px] overflow-y-auto bg-sidebar p-4 text-sidebar-foreground border-r border-sidebar-border shadow-float flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between">
                <Brand compact />
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded p-1 text-sidebar-muted hover:text-sidebar-foreground"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <nav className="mt-6 space-y-1">
                {OWNER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="size-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Footer with User and Logout */}
            <div className="pt-4 border-t border-sidebar-border mt-6">
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30">
                <div className="grid size-8 place-items-center rounded-full bg-red-500/15 border border-red-500/25 font-bold text-red-600 dark:text-red-400 text-xs shrink-0">
                  {user?.fullName
                    ? user.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "SA"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-sidebar-foreground">
                    {user?.fullName || "Super Administrator"}
                  </p>
                  <p className="truncate text-[10px] text-sidebar-muted">
                    {user?.email || "superadmin@dezobuild.com"}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    setMobileMenuOpen(false);
                  }}
                  title="Terminate Platform Session (Logout)"
                  className="p-1 rounded text-sidebar-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="min-w-0 lg:col-start-2 flex flex-col min-h-screen">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-30 flex h-15 items-center border-b border-border/70 bg-card/80 px-4 backdrop-blur-md sm:px-6 lg:px-8 justify-between">
          <div className="flex items-center gap-3">
            <button
              className="mr-2 lg:hidden rounded-lg p-1 text-muted-foreground hover:text-foreground"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="lg:hidden">
              <Brand compact />
            </div>

            {/* Breadcrumb matching customer app */}
            <div className="hidden items-center text-xs lg:flex gap-1.5 font-medium">
              <span className="text-muted-foreground">DEZOBUILD Platform</span>
              <ChevronRight className="size-3.5 text-muted-foreground/60" />
              <span className="text-muted-foreground">SaaS Governance</span>
              <ChevronRight className="size-3.5 text-muted-foreground/60" />
              <span className="font-semibold text-foreground">{activeItem?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Infrastructure Monitoring Status Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-background/60 text-xs font-medium">
              <span className="size-2 rounded-full bg-muted-foreground/50"></span>
              <span className="text-muted-foreground">Monitoring:</span>
              <span className="text-muted-foreground font-semibold">Not Connected</span>
            </div>

            {/* Search Dialog Trigger */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="hidden h-8.5 w-60 items-center gap-2 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-muted-foreground transition-all hover:border-border hover:bg-background md:flex cursor-pointer"
            >
              <Search className="size-3.5 text-muted-foreground" />
              <span>Search tenants, plans…</span>
              <kbd className="ml-auto rounded border border-border bg-muted/50 px-1.5 text-[10px] font-semibold text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            {/* Provision Tenant Action Button */}
            <button
              onClick={() => onTabChange("tenants")}
              className="hidden sm:flex items-center gap-1.5 font-semibold text-xs h-8.5 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Provision Tenant</span>
            </button>

            {/* Theme Toggle (Light / Dark) */}
            <ThemeToggle />

            {/* Notifications Bell */}
            <button
              onClick={() => onTabChange("support")}
              aria-label="Support Tickets"
              className="relative grid size-8.5 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Bell className="size-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 mx-auto w-full max-w-[1560px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Global Tenant Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-float space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Search className="size-4 text-primary" />
                <span>Global Tenant Directory Lookup</span>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name, slug, domain, or admin email…"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              autoFocus
            />

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {filteredTenants.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No matching tenants found.</p>
              ) : (
                filteredTenants.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onTabChange("tenants");
                      setShowSearchModal(false);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{t.name}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          {t.planTier}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t.contactPerson} · {t.contactEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground tabular-nums">
                        ₹{(t.mrr / 1000).toLocaleString("en-IN")}k/mo
                      </span>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{t.seatsUsed}/{t.seatsAllocated} seats</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cross-Portal Boundary Alert Modal */}
      {showBoundaryModal && (
        <div
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowBoundaryModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-float space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Cross-Portal Navigation Boundary Notice</h3>
                <p className="text-xs leading-relaxed text-muted-foreground mt-1">
                  You are currently authenticated as <strong className="text-primary font-semibold">SUPER_ADMIN</strong> on the Platform Owner control plane (<code className="text-foreground font-mono text-[11px] font-semibold bg-muted px-1.5 py-0.5 rounded border border-border inline-block align-baseline mx-0.5">owner.dezobuild.com</code>).
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                <strong>Architecture Rule:</strong> Platform Owners do not manage daily field operations directly within <code className="text-primary font-semibold">app.dezobuild.com</code>. Customer construction workspaces are strictly isolated by tenant identity.
              </p>
              <p>
                To test customer workflows (indents, DPRs, WBS, petty cash), switch personas using the Development Persona Switcher on <code className="text-foreground">app.dezobuild.com</code>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowBoundaryModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground cursor-pointer"
              >
                Stay on Platform Owner
              </button>
              <a
                href="http://localhost:8081"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground flex items-center gap-1.5 shadow-sm"
              >
                <span>Open app.dezobuild.com</span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

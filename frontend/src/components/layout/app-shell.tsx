import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  HardHat,
  Menu,
  Plus,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CommandSearchDialog } from "@/components/command-search";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { ThemeToggle } from "./theme-toggle";
import { useMockStore } from "@/mock";
import { useCurrentUser } from "@/auth";
import {
  CustomerRole,
  ROLE_DEFINITIONS,
  getWorkspaceConfig,
  resolveNavigation,
  CANONICAL_NAV_ITEMS,
  type CustomerRoleType,
} from "@/authorization";

// Canonical navigation export for backward compatibility
export const navigation = Object.values(CANONICAL_NAV_ITEMS).filter(
  (item) => item.id !== "administration"
);
export const settingsNav = CANONICAL_NAV_ITEMS.ADMINISTRATION;

const NotifyContext = createContext<(message: string) => void>(() => {});
export const useNotify = () => useContext(NotifyContext);

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex h-16 items-center gap-2.5 ${compact ? "px-1" : "border-b border-sidebar-border px-5"}`}
    >
      <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <HardHat className="size-[18px]" />
      </div>
      <div>
        <p className="text-base font-extrabold leading-none tracking-tight text-sidebar-foreground">
          DEZO<span className="text-primary">BUILD</span>
        </p>
        {!compact && (
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-sidebar-muted">
            Connected Construction
          </p>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children, crumb }: { children: ReactNode; crumb: string }) {
  const { alerts } = useMockStore();
  const { user, availableUsers, switchUser, switchRole } = useCurrentUser();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [toast, setToast] = useState("");
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const openAlertsCount = alerts.filter((a) => a.status === "open").length;

  // Resolve dynamic role-aware navigation
  const { primaryItems, settingsItem } = resolveNavigation({
    role: user.role,
    permissions: user.customPermissions,
    tenantId: user.tenant.id,
    projectAssignments: user.assignedProjects.map((p) => p.projectId),
  });

  const currentRoleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS[CustomerRole.COMPANY_OWNER];
  const workspaceConfig = getWorkspaceConfig(user.role);

  // Active project context label
  const firstProject = user.assignedProjects[0];
  const activeContextLabel =
    firstProject != null
      ? firstProject.projectName
      : `${user.tenant.activeSitesCount} active metro sites`;

  return (
    <NotifyContext.Provider value={notify}>
      <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <Brand />

          {/* Company / Tenant & Role Context Banner */}
          <div className="mx-3 mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 transition-colors hover:bg-sidebar-accent">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">
                {user.tenant.name}
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${currentRoleMeta.badgeClass}`}
              >
                {currentRoleMeta.shortLabel}
              </span>
            </div>
            <p className="mt-1.5 text-xs font-semibold truncate text-sidebar-foreground">
              {workspaceConfig.identityTitle}
            </p>
            <p className="mt-0.5 text-[11px] truncate text-sidebar-muted">{activeContextLabel}</p>
          </div>

          {/* Dynamic Role-Aware Nav Items */}
          <nav
            className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
            aria-label="Primary navigation"
          >
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const badge =
                item.badgeKey === "alerts" && openAlertsCount > 0
                  ? String(openAlertsCount)
                  : undefined;

              return (
                <Link
                  key={item.id}
                  to={item.to as any}
                  className={`group flex h-9.5 w-full items-center gap-3 rounded-lg px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
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
                  <span className="truncate">{item.label}</span>
                  {badge && (
                    <span className="ml-auto rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 border border-rose-500/25">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer User Profile & Role Switcher */}
          <div className="border-t border-sidebar-border p-3 space-y-1">
            {settingsItem && (
              <Link
                to={settingsItem.to as any}
                className={`flex h-9 w-full items-center gap-3 rounded-lg px-3 text-xs font-medium transition-colors ${
                  pathname.startsWith(settingsItem.to)
                    ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <settingsItem.icon className="size-[17px]" /> {settingsItem.label}
              </Link>
            )}

            {/* Interactive User Card with Role Switch Trigger */}
            <div
              onClick={() => setRoleSwitcherOpen(true)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors border border-transparent hover:border-sidebar-border"
              title="Click to switch role or view mock identity"
            >
              <div className="grid size-8 place-items-center rounded-full bg-primary/15 border border-primary/25 font-bold text-primary text-xs shrink-0">
                {user.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-sidebar-foreground">
                  {user.name}
                </p>
                <p className="truncate text-[10px] text-sidebar-muted">{user.title}</p>
              </div>
              <ChevronRight className="size-3.5 text-sidebar-muted shrink-0" />
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenu && (
          <div
            className="fixed inset-0 z-50 bg-overlay lg:hidden"
            onClick={() => setMobileMenu(false)}
          >
            <aside
              className="h-full w-[82%] max-w-[310px] overflow-y-auto bg-sidebar p-4 text-sidebar-foreground border-r border-sidebar-border shadow-float"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Brand compact />
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close menu"
                    onClick={() => setMobileMenu(false)}
                  >
                    <X />
                  </Button>
                </div>
              </div>

              {/* Mobile Role Switch Button */}
              <div className="mt-4 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-sidebar-muted">
                    {user.tenant.name}
                  </span>
                  <button
                    onClick={() => {
                      setMobileMenu(false);
                      setRoleSwitcherOpen(true);
                    }}
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${currentRoleMeta.badgeClass}`}
                  >
                    {currentRoleMeta.shortLabel} ↻
                  </button>
                </div>
                <p className="mt-1 text-xs font-semibold text-sidebar-foreground">{user.name}</p>
                <p className="text-[10px] text-sidebar-muted">{user.title}</p>
              </div>

              <nav className="mt-4 space-y-1">
                {primaryItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.id}
                      to={item.to as any}
                      onClick={() => setMobileMenu(false)}
                      className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="size-5" />
                      {item.label}
                    </Link>
                  );
                })}
                {settingsItem && (
                  <Link
                    to={settingsItem.to as any}
                    onClick={() => setMobileMenu(false)}
                    className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                      pathname.startsWith(settingsItem.to)
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <settingsItem.icon className="size-5" />
                    {settingsItem.label}
                  </Link>
                )}
              </nav>
            </aside>
          </div>
        )}

        {/* Top Header & Main Content Area */}
        <div className="min-w-0 lg:col-start-2">
          <header className="sticky top-0 z-30 flex h-15 items-center border-b border-border/70 bg-card/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Menu />
            </Button>
            <div className="lg:hidden">
              <Brand compact />
            </div>

            {/* Breadcrumb with Tenant & Workspace Context */}
            <div className="hidden items-center text-xs lg:flex gap-1.5 font-medium">
              <span className="text-muted-foreground">{user.tenant.name}</span>
              <ChevronRight className="size-3.5 text-muted-foreground/60" />
              <span className="text-muted-foreground">{workspaceConfig.identityTitle}</span>
              <ChevronRight className="size-3.5 text-muted-foreground/60" />
              <span className="font-semibold text-foreground">{crumb}</span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {/* Active Role Indicator Pill */}
              <button
                onClick={() => setRoleSwitcherOpen(true)}
                className={`hidden md:inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors hover:opacity-80 ${currentRoleMeta.badgeClass}`}
                title="Active Customer Role (Click to switch)"
              >
                <UserCheck className="size-3.5" />
                <span>{currentRoleMeta.shortLabel}</span>
                <ChevronDown className="size-3 opacity-60" />
              </button>

              <button
                onClick={() => setSearchOpen(true)}
                className="hidden h-8.5 w-60 items-center gap-2 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-muted-foreground transition-all hover:border-border hover:bg-background md:flex"
              >
                <Search className="size-3.5 text-muted-foreground" />
                <span>Search projects, indents…</span>
                <kbd className="ml-auto rounded border border-border bg-muted/50 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
                  ⌘K
                </kbd>
              </button>

              <Button
                size="sm"
                className="hidden sm:flex items-center gap-1.5 font-semibold text-xs h-8.5 px-3.5 rounded-lg shadow-sm"
                onClick={() => setQuickAddOpen(true)}
              >
                <Plus className="size-3.5" /> Quick Add
              </Button>

              <ThemeToggle />

              <Link
                to={"/alerts" as any}
                aria-label="Notifications"
                className="relative grid size-8.5 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="size-4" />
                {openAlertsCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-card" />
                )}
              </Link>
            </div>
          </header>

          <main className="mx-auto max-w-[1560px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-5 border-t bg-card px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Mobile navigation"
        >
          {([
            {
              label: "Home",
              icon: primaryItems[0] != null ? primaryItems[0].icon : CANONICAL_NAV_ITEMS.DASHBOARD!.icon,
              to: primaryItems[0] != null ? primaryItems[0].to : "/",
            },
            {
              label: "Projects",
              icon: CANONICAL_NAV_ITEMS.PROJECTS!.icon,
              to: "/projects",
            },
            {
              label: "Add",
              icon: Plus,
              action: () => setQuickAddOpen(true),
            },
            {
              label: "Alerts",
              icon: Bell,
              to: "/alerts",
              badge: openAlertsCount > 0,
            },
            {
              label: "More",
              icon: Menu,
              action: () => setMobileMenu(true),
            },
          ] as const).map((item) => {
            const Icon = item.icon;
            const hasTo = "to" in item && item.to != null;
            const to = hasTo ? item.to : undefined;
            const action = "action" in item ? item.action : undefined;
            const badge = "badge" in item ? item.badge : false;
            const active = to != null ? (to === "/" ? pathname === "/" : pathname.startsWith(to)) : false;

            const content = (
              <>
                <span
                  className={`relative grid size-8 place-items-center rounded-md ${
                    item.label === "Add" ? "bg-primary text-primary-foreground shadow-sm" : ""
                  }`}
                >
                  <Icon className="size-[19px]" />
                  {badge && (
                    <span className="absolute right-1 top-1 size-2 rounded-full bg-danger ring-1 ring-card" />
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </>
            );

            const styles = `flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
              active ? "text-primary font-bold" : "text-muted-foreground"
            }`;

            return to != null ? (
              <Link key={item.label} to={to as any} className={styles}>
                {content}
              </Link>
            ) : (
              <button key={item.label} onClick={action} className={styles}>
                {content}
              </button>
            );
          })}
        </nav>

        {/* Development Role & Persona Switcher Modal */}
        <Dialog open={roleSwitcherOpen} onOpenChange={setRoleSwitcherOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <UserCheck className="size-5 text-primary" />
                  Development Persona Preview (QA Tool)
                </DialogTitle>
                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  QA / Simulation Only
                </span>
              </div>
              <DialogDescription className="text-xs">
                Switch authenticated customer persona to simulate role-based navigation, scoped data,
                and progressive disclosure across DEZOBUILD. Production authentication will automatically
                hydrate this identity from your enterprise SSO / tenant provider.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {availableUsers.map((mockUser) => {
                const roleMeta = ROLE_DEFINITIONS[mockUser.role];
                const isSelected = user.id === mockUser.id;
                return (
                  <div
                    key={mockUser.id}
                    onClick={() => {
                      switchUser(mockUser.id);
                      notify(`Switched workspace to ${roleMeta.title} (${mockUser.name})`);
                      setRoleSwitcherOpen(false);
                    }}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border hover:border-border/80 hover:bg-muted/40"
                    }`}
                  >
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 border border-primary/20 font-bold text-primary text-xs shrink-0 mt-0.5">
                      {mockUser.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{mockUser.name}</p>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${roleMeta.badgeClass}`}
                        >
                          {roleMeta.shortLabel}
                        </span>
                        {isSelected && (
                          <span className="ml-auto text-[10px] font-bold text-primary">Active</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {mockUser.title} · {mockUser.department}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        {roleMeta.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 border-t pt-2 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Platform Owner (SUPER_ADMIN) is scoped to <strong className="text-foreground">owner.dezobuild.com</strong></span>
              <span className="font-semibold text-primary">app.dezobuild.com</span>
            </div>
          </DialogContent>
        </Dialog>

        {/* Interactive Modals */}
        <QuickAddDialog isOpen={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
        <CommandSearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* Toast notifications */}
        {toast && (
          <div
            role="status"
            className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-float"
          >
            {toast}
          </div>
        )}
      </div>
    </NotifyContext.Provider>
  );
}

export function QuickAddButton() {
  const notify = useNotify();
  return (
    <Button onClick={() => notify("Quick add dialog ready")}>
      <Plus /> Quick add
    </Button>
  );
}

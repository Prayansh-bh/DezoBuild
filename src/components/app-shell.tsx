import { Button } from "@/components/ui/button";
import { useMockStore } from "@/mock";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  FileBarChart,
  FileText,
  HardHat,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Truck,
  Users,
  WalletCards,
  X,
  Search,
} from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CommandSearchDialog } from "./command-search";
import { QuickAddDialog } from "./quick-add-dialog";

export const navigation = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: Building2 },
  { label: "Materials", to: "/materials", icon: Boxes },
  { label: "Finance", to: "/finance", icon: WalletCards },
  { label: "People", to: "/people", icon: Users },
  { label: "Equipment", to: "/equipment", icon: Truck },
  { label: "Alerts", to: "/alerts", icon: Bell, badgeKey: "alerts" },
  { label: "Reports", to: "/reports", icon: FileBarChart },
  { label: "Documents", to: "/documents", icon: FileText },
];

export const settingsNav = { label: "Settings", to: "/settings", icon: Settings };

const NotifyContext = createContext<(message: string) => void>(() => {});
export const useNotify = () => useContext(NotifyContext);

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex h-16 items-center gap-2.5 ${compact ? "px-1" : "border-b border-sidebar-border px-5"}`}>
      <div className="grid size-8 place-items-center rounded-md bg-brand-mark text-brand-mark-foreground shadow-sm">
        <HardHat className="size-[19px]" />
      </div>
      <div>
        <p className="text-[17px] font-extrabold leading-none tracking-tight">
          DEZO<span className="text-brand-accent">BUILD</span>
        </p>
        {!compact && <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-sidebar-muted">Build with clarity</p>}
      </div>
    </div>
  );
}

export function AppShell({ children, crumb }: { children: ReactNode; crumb: string }) {
  const { alerts, companySettings } = useMockStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const openAlertsCount = alerts.filter((a) => a.status === "open").length;

  return (
    <NotifyContext.Provider value={notify}>
      <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <Brand />

          {/* Company / Portfolio Switcher */}
          <div className="mx-4 mt-3 rounded-md border border-sidebar-border bg-sidebar-accent/60 p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-sidebar-muted">
              Portfolio <ChevronDown className="size-3.5" />
            </div>
            <p className="mt-1.5 text-sm font-semibold truncate">{companySettings.companyName.split(" ")[0]} Infra Pvt. Ltd.</p>
            <p className="mt-0.5 text-xs text-sidebar-muted">8 active projects</p>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const badge = item.badgeKey === "alerts" && openAlertsCount > 0 ? String(openAlertsCount) : undefined;

              return (
                <Link
                  key={item.label}
                  to={item.to as any}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span>{item.label}</span>
                  {badge && (
                    <span className="ml-auto rounded-full bg-sidebar-danger px-2 py-0.5 text-[10px] font-bold text-sidebar-danger-foreground">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer User Profile & Settings */}
          <div className="border-t border-sidebar-border p-3">
            <Link
              to={settingsNav.to as any}
              className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                pathname.startsWith(settingsNav.to)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <settingsNav.icon className="size-[18px]" /> Settings
            </Link>
            <div className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors">
              <div className="grid size-9 place-items-center rounded-full bg-sidebar-primary font-bold text-sidebar-primary-foreground text-xs shadow-inner">
                AK
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Arjun Kapoor</p>
                <p className="text-xs text-sidebar-muted">Company Owner</p>
              </div>
              <ChevronRight className="ml-auto size-4 text-sidebar-muted" />
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenu && (
          <div className="fixed inset-0 z-50 bg-overlay lg:hidden" onClick={() => setMobileMenu(false)}>
            <aside
              className="h-full w-[82%] max-w-[310px] overflow-y-auto bg-sidebar p-4 text-sidebar-foreground"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Brand compact />
                <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMobileMenu(false)}>
                  <X />
                </Button>
              </div>
              <nav className="mt-6 space-y-1">
                {[...navigation, settingsNav].map((item) => {
                  const Icon = item.icon;
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.label}
                      to={item.to as any}
                      onClick={() => setMobileMenu(false)}
                      className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
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
              </nav>
            </aside>
          </div>
        )}

        {/* Top Header & Main Content Area */}
        <div className="min-w-0 lg:col-start-2">
          <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-card/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
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
            <div className="hidden items-center text-sm lg:flex">
              <span className="text-muted-foreground">Workspace</span>
              <ChevronRight className="mx-2 size-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">{crumb}</span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden h-9 w-60 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 md:flex"
              >
                <Search className="size-4" />
                Search anything…
                <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">⌘K</kbd>
              </button>

              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/5"
                onClick={() => setQuickAddOpen(true)}
              >
                <Plus className="size-4" /> Quick Add
              </Button>

              <Link
                to={"/alerts" as any}
                aria-label="Notifications"
                className="relative grid size-9 place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="size-[18px]" />
                {openAlertsCount > 0 && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-card" />
                )}
              </Link>

              <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-foreground">Mon, 7 Sep</p>
                <p className="text-[11px] text-muted-foreground">11:12 AM IST</p>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1560px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
        </div>

        {/* Floating Quick Add Button for Mobile */}
        <div className="fixed bottom-20 right-4 z-40 lg:hidden">
          <Button
            size="lg"
            className="h-12 gap-2 rounded-full shadow-float px-5"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="size-5" /> Quick Add
          </Button>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-5 border-t bg-card px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Mobile navigation"
        >
          {[
            { label: "Home", icon: LayoutDashboard, to: "/" },
            { label: "Projects", icon: Building2, to: "/projects" },
            { label: "Add", icon: Plus, action: () => setQuickAddOpen(true) },
            { label: "Alerts", icon: Bell, to: "/alerts", badge: openAlertsCount > 0 },
            { label: "More", icon: Menu, action: () => setMobileMenu(true) },
          ].map((item) => {
            const active = item.to ? (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)) : false;
            const content = (
              <>
                <span
                  className={`relative grid size-8 place-items-center rounded-md ${
                    item.label === "Add" ? "bg-primary text-primary-foreground shadow-sm" : ""
                  }`}
                >
                  <item.icon className="size-[19px]" />
                  {item.badge && <span className="absolute right-1 top-1 size-2 rounded-full bg-danger ring-1 ring-card" />}
                </span>
                <span className="truncate">{item.label}</span>
              </>
            );

            const styles = `flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
              active ? "text-primary font-bold" : "text-muted-foreground"
            }`;

            return item.to ? (
              <Link key={item.label} to={item.to as any} className={styles}>
                {content}
              </Link>
            ) : (
              <button key={item.label} onClick={item.action} className={styles}>
                {content}
              </button>
            );
          })}
        </nav>

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

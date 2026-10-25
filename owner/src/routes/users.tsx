import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatusBadge } from "../components/shared/status-badge";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_GLOBAL_USERS } from "../mock/platform-data";
import type { PlatformGlobalUser } from "../types";

export function UsersView() {
  const users = MOCK_GLOBAL_USERS;
  const [search, setSearch] = useState("");
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [userActionNotice, setUserActionNotice] = useState<string | null>(null);

  const handleToggleStatus = (user: PlatformGlobalUser) => {
    setUserActionNotice(
      `Global user mutation for "${user.email}" requires tenant-level administrative session. Platform Owner cannot directly mutate tenant users without tenant delegation.`
    );
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.tenantName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Identity & Seat Allocation"
        title="Global Users & Seat Governance"
        subtitle="Tenant user directory, MFA posture enforcement, SSO integrations, and seat allocation quotas."
        actions={
          <button
            onClick={() => setMfaDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted shadow-panel cursor-pointer"
          >
            <Lock className="size-3.5 text-amber-500" />
            <span>Enforce Enterprise MFA</span>
          </button>
        }
      />

      {/* MFA Policy Dialog */}
      {mfaDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setMfaDialogOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-float space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-base font-bold text-foreground">
                <Lock className="size-4.5 text-amber-500" />
                <span>Enterprise MFA Enforcement</span>
              </div>
              <button
                onClick={() => setMfaDialogOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Enterprise MFA Policy Endpoint Not Configured</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Global root MFA policy push is not enabled in this cluster. Tenant organizations independently enforce MFA policies from their respective Company Administration settings.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setMfaDialogOpen(false)}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Action Notice Dialog */}
      {userActionNotice && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setUserActionNotice(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-float space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-base font-bold text-foreground">
                <AlertCircle className="size-4.5 text-primary" />
                <span>Tenant Isolation Policy Notice</span>
              </div>
              <button
                onClick={() => setUserActionNotice(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {userActionNotice}
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setUserActionNotice(null)}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user name, email, or tenant organization…"
          className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-panel"
        />
      </div>

      {/* Users Table or Empty State */}
      {filtered.length > 0 ? (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="p-3.5 font-semibold">User Identity</th>
                  <th className="p-3.5 font-semibold">Tenant Organization</th>
                  <th className="p-3.5 font-semibold">Customer Role</th>
                  <th className="p-3.5 font-semibold">Authentication Method</th>
                  <th className="p-3.5 font-semibold">MFA Posture</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold">Last Active</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-foreground">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-foreground">{u.tenantName}</td>
                    <td className="p-3.5">
                      <span className="rounded bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-muted-foreground">{u.authProvider}</td>
                    <td className="p-3.5">
                      {u.mfaEnabled ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="size-3.5" /> Enforced
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <ShieldAlert className="size-3.5" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="p-3.5 text-muted-foreground tabular-nums">{u.lastActive}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                          u.status === "active"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                        }`}
                      >
                        {u.status === "active" ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No platform users available"
          description="Customer accounts registered under tenant organizations will appear in this centralized identity governance directory."
        />
      )}
    </div>
  );
}

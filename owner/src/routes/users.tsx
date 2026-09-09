import React, { useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatusBadge } from "../components/shared/status-badge";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_GLOBAL_USERS } from "../mock/platform-data";
import type { PlatformGlobalUser } from "../types";

export function UsersView() {
  const [users, setUsers] = useState<PlatformGlobalUser[]>(MOCK_GLOBAL_USERS);
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(
      users.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === "active" ? "suspended" : "active";
          showToast(`Updated user ${u.email} to ${newStatus}`);
          return { ...u, status: newStatus };
        }
        return u;
      })
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-float flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        eyebrow="Identity & Seat Allocation"
        title="Global Users & Seat Governance"
        subtitle="Tenant user directory, MFA posture enforcement, SSO integrations, and seat allocation quotas."
        actions={
          <button
            onClick={() => showToast("MFA Policy enforced across all Enterprise tenants")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted shadow-panel cursor-pointer"
          >
            <Lock className="size-3.5 text-amber-500" />
            <span>Enforce Enterprise MFA</span>
          </button>
        }
      />

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
                        onClick={() => handleToggleStatus(u.id)}
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

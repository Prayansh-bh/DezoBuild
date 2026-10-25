import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Filter,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Search,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "../components/shared/page-header";
import { StatGrid, type StatItem } from "../components/shared/stat-grid";
import { StatusBadge } from "../components/shared/status-badge";
import { EmptyState } from "../components/shared/empty-state";
import { MOCK_SUPPORT_TICKETS } from "../mock/platform-data";
import type { PlatformSupportTicket } from "../types";

export function SupportView() {
  const [tickets, setTickets] = useState<PlatformSupportTicket[]>(MOCK_SUPPORT_TICKETS);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleResolve = (ticketId: string) => {
    setTickets(
      tickets.map((t) => (t.id === ticketId ? { ...t, status: "resolved" } : t))
    );
    showToast(`Ticket marked as resolved.`);
  };

  const filtered = tickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchesPriority =
      filterPriority === "all" || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const openCount = tickets.filter((t) => t.status !== "resolved").length;
  const criticalCount = tickets.filter((t) => t.priority === "critical" && t.status !== "resolved").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  const statItems: StatItem[] = [
    {
      label: "Active Support Tickets",
      value: openCount.toString(),
      hint: criticalCount > 0 ? `${criticalCount} critical SLA escalations` : "No active ticket escalations",
      tone: criticalCount > 0 ? "critical" : "neutral",
      icon: <LifeBuoy className="size-5" />,
    },
    {
      label: "Critical Escalations",
      value: criticalCount.toString(),
      hint: "Target SLA < 15 mins",
      tone: criticalCount > 0 ? "critical" : "neutral",
      icon: <ShieldAlert className="size-5" />,
    },
    {
      label: "Average First Response",
      value: "—",
      hint: "SLA telemetry pending",
      tone: "neutral",
      icon: <Clock className="size-5" />,
    },
    {
      label: "Tickets Resolved",
      value: resolvedCount.toString(),
      hint: "Resolved support cases",
      tone: "neutral",
      icon: <CheckCircle2 className="size-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-float flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="size-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        eyebrow="Platform Operations"
        title="Enterprise Tenant Support & SLA Queue"
        subtitle="SLA tracking, integration debugging, hardware provisioning requests, and tenant support escalation queue."
      />

      {/* KPI Overview */}
      <StatGrid items={statItems} columns={4} />

      {/* Search & Priority Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket ID, title, or tenant organization…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-panel"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(["all", "critical", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                filterPriority === p
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List or Empty State */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-xl border border-border/80 bg-card p-4 shadow-panel flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <span className="font-mono text-[11px] font-bold text-muted-foreground shrink-0">{ticket.ticketNumber}</span>
                  <StatusBadge status={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                  <span className="text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-none">{ticket.tenantName}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground">{ticket.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Raised by <strong className="text-foreground">{ticket.requesterName}</strong> ({ticket.requesterEmail}) · {ticket.createdAt}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right text-xs">
                  <span className="text-muted-foreground block text-[11px]">Assigned Engineer:</span>
                  <span className="font-semibold text-foreground">{ticket.assignedAdmin}</span>
                </div>
                {ticket.status !== "resolved" && (
                  <button
                    onClick={() => handleResolve(ticket.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Resolve</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={LifeBuoy}
          title="No support tickets yet"
          description="Enterprise customer inquiries, SLA escalation tickets, and telemetry assistance requests will appear in this queue."
        />
      )}
    </div>
  );
}

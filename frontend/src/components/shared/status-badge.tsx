import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type StatusTone = "critical" | "attention" | "healthy" | "neutral" | "info";

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  const toneClasses: Record<StatusTone, string> = {
    critical:
      "bg-rose-50/90 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
    attention:
      "bg-amber-50/90 text-amber-800 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
    healthy:
      "bg-emerald-50/90 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
    neutral:
      "bg-slate-100/80 text-slate-700 border-slate-200/70 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60",
    info: "bg-sky-50/90 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50",
  };

  const dotClasses: Record<StatusTone, string> = {
    critical: "bg-rose-500",
    attention: "bg-amber-500",
    healthy: "bg-emerald-500",
    neutral: "bg-slate-400",
    info: "bg-sky-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap tracking-tight transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", dotClasses[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}

export function HealthBadge({ health }: { health: "critical" | "attention" | "healthy" }) {
  const map: Record<string, { label: string; tone: StatusTone }> = {
    critical: { label: "Critical", tone: "critical" },
    attention: { label: "Attention", tone: "attention" },
    healthy: { label: "On track", tone: "healthy" },
  };

  const item = map[health] || { label: health, tone: "neutral" };
  return <StatusPill tone={item.tone}>{item.label}</StatusPill>;
}

export function WorkflowBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: StatusTone }> = {
    active: { label: "Active", tone: "healthy" },
    planning: { label: "Planning", tone: "info" },
    completed: { label: "Completed", tone: "healthy" },
    archived: { label: "Archived", tone: "neutral" },
    draft: { label: "Draft", tone: "neutral" },
    submitted: { label: "Submitted", tone: "info" },
    pending_approval: { label: "Pending Approval", tone: "attention" },
    approved: { label: "Approved", tone: "healthy" },
    rejected: { label: "Rejected", tone: "critical" },
    paid: { label: "Paid", tone: "healthy" },
    overdue: { label: "Overdue", tone: "critical" },
    pending: { label: "Pending", tone: "attention" },
    issued: { label: "Issued", tone: "info" },
    in_transit: { label: "In Transit", tone: "attention" },
    received: { label: "Received", tone: "healthy" },
    partially_received: { label: "Partially Received", tone: "attention" },
    running: { label: "Running", tone: "healthy" },
    idle: { label: "Idle", tone: "attention" },
    breakdown: { label: "Breakdown", tone: "critical" },
    maintenance: { label: "Maintenance", tone: "attention" },
    open: { label: "Open", tone: "critical" },
    acknowledged: { label: "Acknowledged", tone: "attention" },
    assigned: { label: "Assigned", tone: "info" },
    resolved: { label: "Resolved", tone: "healthy" },
    in_progress: { label: "In Progress", tone: "info" },
    delayed: { label: "Delayed", tone: "critical" },
    not_started: { label: "Not Started", tone: "neutral" },
    understrength: { label: "Understrength", tone: "attention" },
  };

  const item = map[status] || { label: status.replace(/_/g, " "), tone: "neutral" };
  return <StatusPill tone={item.tone}>{item.label}</StatusPill>;
}

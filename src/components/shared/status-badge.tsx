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
    critical: "bg-danger-soft text-danger border-danger/20",
    attention: "bg-warning-soft text-warning border-warning/20",
    healthy: "bg-success-soft text-success border-success/20",
    neutral: "bg-muted text-muted-foreground border-border",
    info: "bg-accent text-accent-foreground border-accent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
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

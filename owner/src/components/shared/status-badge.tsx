import React from "react";
import { cn } from "../../lib/utils";

export type StatusTone =
  | "active"
  | "paid"
  | "healthy"
  | "trialing"
  | "open"
  | "in_progress"
  | "resolved"
  | "suspended"
  | "delinquent"
  | "overdue"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "warning";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  healthy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  trialing: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  open: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  delinquent: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  suspended: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  overdue: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalizedKey = status.toLowerCase().replace(/\s+/g, "_");
  const style = STATUS_STYLES[normalizedKey] || "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        style,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      <span>{status}</span>
    </span>
  );
}

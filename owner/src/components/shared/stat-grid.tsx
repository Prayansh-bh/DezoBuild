import React, { type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface StatItem {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "critical" | "attention" | "healthy" | "neutral" | "info" | "default";
  icon?: ReactNode;
}

export function StatGrid({
  items,
  columns = 4,
  className,
}: {
  items: StatItem[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  }[columns];

  return (
    <div className={cn("grid gap-4", colClass, className)}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="group relative overflow-hidden rounded-xl border border-border/80 bg-card p-4.5 shadow-panel transition-all hover:border-border hover:shadow-float"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {item.tone && item.tone !== "neutral" && (
                <span
                  className={cn(
                    "size-2 rounded-full",
                    item.tone === "healthy" && "bg-emerald-500",
                    item.tone === "attention" && "bg-amber-500",
                    item.tone === "critical" && "bg-rose-500",
                    item.tone === "info" && "bg-sky-500",
                  )}
                />
              )}
              <p className="text-[13px] font-medium text-muted-foreground">{item.label}</p>
            </div>
            {item.icon && (
              <div className="text-muted-foreground/70 transition-colors group-hover:text-primary">
                {item.icon}
              </div>
            )}
          </div>
          <p className="mt-2.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">{item.value}</p>
          {item.hint && <p className="mt-1 text-xs text-muted-foreground/90">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}

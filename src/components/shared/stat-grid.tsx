import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface StatItem {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "critical" | "attention" | "healthy" | "neutral" | "info";
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
    <div className={cn("grid gap-3.5", colClass, className)}>
      {items.map((item, idx) => (
        <div key={idx} className="rounded-lg border bg-card p-4.5 shadow-panel transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {item.tone && item.tone !== "neutral" && (
                <span className={cn("size-2 rounded-full", `dot-${item.tone}`)} />
              )}
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            </div>
            {item.icon && <div className="text-muted-foreground">{item.icon}</div>}
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground">{item.value}</p>
          {item.hint && <p className="mt-1 text-[11px] font-medium text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}

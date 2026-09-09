import React from "react";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void } | React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  const renderAction = () => {
    if (action) {
      if (typeof action === "object" && action !== null && "label" in action) {
        return (
          <div className="mt-5">
            <button
              type="button"
              onClick={(action as { label: string; onClick?: () => void }).onClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 cursor-pointer"
            >
              {(action as { label: string }).label}
            </button>
          </div>
        );
      }
      return <div className="mt-5">{action}</div>;
    }
    if (actionLabel && onAction) {
      return (
        <div className="mt-5">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 cursor-pointer"
          >
            {actionLabel}
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-12 text-center shadow-panel">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">{description}</p>
      {renderAction()}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

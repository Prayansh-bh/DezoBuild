import { Button } from "@/components/ui/button";
import { HardHat, Inbox } from "lucide-react";
import type { ElementType, ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ElementType | undefined;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void } | ReactNode | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  children?: ReactNode | undefined;
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
            <Button onClick={(action as { label: string; onClick?: () => void }).onClick}>
              {(action as { label: string }).label}
            </Button>
          </div>
        );
      }
      return <div className="mt-5">{action}</div>;
    }
    if (actionLabel && onAction) {
      return (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {renderAction()}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function ConstructionEmptyState({
  title = "No site records found",
  description = "No items match your active filters or query. Try adjusting your filter parameters.",
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <EmptyState
      icon={HardHat}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}

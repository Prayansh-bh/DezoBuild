import React from "react";
import { AlertCircle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// 1. FORM SECTION
export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  className,
  collapsible,
  defaultExpanded = true,
  badge,
}: FormSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div className={cn("space-y-4 pt-2 first:pt-0", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        {collapsible && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
        )}
      </div>
      {(!collapsible || expanded) && (
        <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">{children}</div>
      )}
    </div>
  );
}

// 2. FORM ROW (1-Column Default, Responsive 2/3 Columns)
export interface FormRowProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FormRow({ children, columns = 1, className }: FormRowProps) {
  const colStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return <div className={cn("grid gap-4 items-start", colStyles, className)}>{children}</div>;
}

// 3. FORM FIELD (Label, Required Asterisk, Input Wrapper, Inline Error & Help)
export interface FormFieldProps {
  id?: string;
  label?: string;
  required?: boolean;
  optional?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  required,
  optional,
  help,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id} className="text-xs font-medium text-foreground leading-none">
            {label}
            {required && <span className="text-destructive ml-0.5 font-bold">*</span>}
          </Label>
          {optional && (
            <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
          )}
        </div>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-destructive font-medium mt-1">
          <AlertCircle className="size-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && help && (
        <p className="text-[11px] text-muted-foreground leading-normal mt-1">{help}</p>
      )}
    </div>
  );
}

// 4. FIELD GROUP (Sub-area Card / Background)
export function FieldGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3", className)}>
      {children}
    </div>
  );
}

// 5. FORM ACTIONS (Bottom Action Bar with Cancel, Save, Saving indicator)
export interface FormActionsProps {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  isDirty?: boolean;
  disabled?: boolean;
  className?: string;
  extraActions?: React.ReactNode;
  sticky?: boolean;
}

export function FormActions({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel = "Save Changes",
  isSubmitting = false,
  isDirty,
  disabled = false,
  className,
  extraActions,
  sticky = false,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 pt-5 mt-6 border-t border-border/60",
        sticky &&
          "sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 sm:mx-0 sm:px-0 border-t shadow-sm z-10",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {extraActions}
        {isDirty !== undefined && isDirty && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            Unsaved changes
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs font-semibold"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={disabled || isSubmitting}
          className="h-9 px-5 text-xs font-semibold shadow-sm min-w-[100px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  );
}

// 6. FORM HELP & ERROR ATOMS
export function FormHelp({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground flex items-center gap-1.5", className)}>
      <HelpCircle className="size-3.5 shrink-0 text-muted-foreground/80" />
      <span>{children}</span>
    </p>
  );
}

export function FormError({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-center gap-2",
        className
      )}
    >
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

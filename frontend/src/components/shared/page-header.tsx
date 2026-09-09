import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            className="mb-2.5 flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.label} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50" />}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : eyebrow ? (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{eyebrow}</span>
          </div>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

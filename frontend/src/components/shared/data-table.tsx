import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = "No records found matching criteria",
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const startIdx = (currentPage - 1) * pageSize;
  const pageData = data.slice(startIdx, startIdx + pageSize);

  if (data.length === 0) {
    return <EmptyState title="No Records" description={emptyMessage} />;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName || col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map((item, idx) => (
              <TableRow
                key={item.id ?? idx}
                onClick={() => onRowClick && onRowClick(item)}
                className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render
                      ? col.render(item)
                      : ((item as Record<string, unknown>)[col.key] as ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
          <p>
            Showing <span className="font-semibold text-foreground">{startIdx + 1}</span> to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(startIdx + pageSize, data.length)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{data.length}</span> results
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2.5"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" /> Previous
            </Button>
            <span className="px-2 font-mono font-medium">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2.5"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

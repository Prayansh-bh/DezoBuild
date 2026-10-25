import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocumentItem } from "@/mock/types";
import { Download, FileText, Loader2, Tag, User } from "lucide-react";
import { downloadCsv } from "@/lib/export-utils";

export function DocumentViewerDialog({
  document,
  isOpen,
  onClose,
}: {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  if (!document) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      const headers = [
        "Document ID",
        "Document Name",
        "Project Name",
        "Category",
        "Type",
        "Revision",
        "Format",
        "File Size",
        "Uploaded By",
        "Updated Date",
        "Tags",
      ];
      const rows = [
        [
          document.id,
          document.name,
          document.projectName,
          document.category,
          document.type,
          document.version,
          document.fileExtension,
          document.size,
          document.uploadedBy,
          document.updatedDate,
          document.tags.join("; "),
        ],
      ];
      const baseName = document.name.replace(/\.[^/.]+$/, "");
      downloadCsv(`Document_${baseName}_Metadata`, headers, rows);
      setTimeout(() => {
        setIsDownloading(false);
        onClose();
      }, 400);
    } catch (err) {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <FileText className="size-4" />
            <span>
              {document.type} · {document.version}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold">{document.name}</DialogTitle>
          <DialogDescription>
            {document.projectName} · Updated on {document.updatedDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-8 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
              <FileText className="size-8" />
            </div>
            <p className="mt-3 font-semibold">{document.name}</p>
            <p className="text-xs text-muted-foreground">
              Format: {document.fileExtension} · Size: {document.size}
            </p>
            <Button
              size="sm"
              className="mt-4 gap-2 cursor-pointer"
              disabled={isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {isDownloading ? "Downloading…" : "Download Document"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-md border p-3">
              <span className="text-muted-foreground">Category</span>
              <p className="mt-1 font-semibold">{document.category}</p>
            </div>
            <div className="rounded-md border p-3">
              <span className="text-muted-foreground">Uploaded By</span>
              <p className="mt-1 flex items-center gap-1 font-semibold">
                <User className="size-3.5 text-muted-foreground" /> {document.uploadedBy}
              </p>
            </div>
          </div>

          {document.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Tag className="size-3.5 text-muted-foreground" />
              {document.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

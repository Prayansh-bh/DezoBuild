import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DprPhoto } from "@/mock/types";
import { Camera, Clock } from "lucide-react";

export function PhotoGalleryDialog({
  photo,
  isOpen,
  onClose,
}: {
  photo: DprPhoto | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!photo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Camera className="size-4" />
            <span>Site Inspection Photo</span>
          </div>
          <DialogTitle className="text-base font-bold">{photo.caption}</DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <Clock className="size-3.5" /> Captured at {photo.timestamp}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 overflow-hidden rounded-lg border bg-black/90">
          <img
            src={photo.url}
            alt={photo.caption}
            className="max-h-[500px] w-full object-contain"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMockStore } from "@/mock";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  Building2,
  FileText,
  Search,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";

export function CommandSearchDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { projects, materials, alerts, equipment, documents } = useMockStore();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const q = query.toLowerCase().trim();

  const filteredProjects = projects.filter(
    (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
  );

  const filteredMaterials = materials.filter(
    (m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
  );

  const filteredAlerts = alerts.filter(
    (a) => a.title.toLowerCase().includes(q) || a.projectName.toLowerCase().includes(q)
  );

  const filteredDocs = documents.filter(
    (d) => d.name.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q))
  );

  const handleSelect = (to: string) => {
    onClose();
    // Use navigate with string path
    navigate({ to: to as any });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-hidden max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search DEZOBUILD</DialogTitle>
        </DialogHeader>

        <div className="flex items-center border-b px-4">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, materials, alerts, drawings, equipment…"
            className="border-none shadow-none focus-visible:ring-0 text-base h-12"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-4 text-sm">
          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Projects
              </p>
              {filteredProjects.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(`/projects/${p.id}`)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className="size-4 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.location} · {p.progress}% completed</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">{p.code}</span>
                </button>
              ))}
            </div>
          )}

          {/* Materials */}
          {filteredMaterials.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Materials & Inventory
              </p>
              {filteredMaterials.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelect("/materials")}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Boxes className="size-4 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">Stock: {m.currentStock} {m.unit} · {m.category}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">₹{m.unitRate}/{m.unit}</span>
                </button>
              ))}
            </div>
          )}

          {/* Alerts */}
          {filteredAlerts.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Actionable Alerts
              </p>
              {filteredAlerts.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelect("/alerts")}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="size-4 text-danger shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.projectName}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-danger uppercase shrink-0">{a.severity}</span>
                </button>
              ))}
            </div>
          )}

          {/* Documents */}
          {filteredDocs.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Drawings & Documents
              </p>
              {filteredDocs.slice(0, 3).map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleSelect("/documents")}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.projectName} · {d.version}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{d.size}</span>
                </button>
              ))}
            </div>
          )}

          {/* Static Shortcuts */}
          <div>
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Direct Workspaces
            </p>
            <div className="grid grid-cols-2 gap-1 px-1">
              {[
                { label: "Finance & Expenses", to: "/finance", icon: WalletCards },
                { label: "People & Attendance", to: "/people", icon: Users },
                { label: "Plant & Equipment", to: "/equipment", icon: Truck },
                { label: "Reports & Analytics", to: "/reports", icon: FileText },
              ].map((ws) => (
                <button
                  key={ws.to}
                  onClick={() => handleSelect(ws.to)}
                  className="flex items-center gap-2 rounded-md p-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ws.icon className="size-4 text-primary" />
                  {ws.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

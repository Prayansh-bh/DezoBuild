import { AppShell, useNotify } from "@/components/app-shell";
import { DocumentViewerDialog } from "@/components/shared/document-viewer";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatGrid } from "@/components/shared/stat-grid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockStore, useMockStore } from "@/mock";
import type { DocumentItem } from "@/mock/types";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileCode,
  FileText,
  FolderOpen,
  Grid,
  HardHat,
  LayoutList,
  Plus,
  Search,
  Tag,
  Upload,
  User,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/documents/")({
  head: () => ({
    meta: [
      { title: "Document Management & GFC Drawings | DEZOBUILD" },
      { name: "description", content: "Store, version, and preview construction contracts, structural GFC drawings, and compliance approvals in DEZOBUILD." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { documents, projects } = useMockStore();
  const notify = useNotify();

  const [activeCategory, setActiveCategory] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Dialog States
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Upload Form State
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<DocumentItem["type"]>("Drawing");
  const [docCategory, setDocCategory] = useState("Structural Drawings");
  const [docProjectId, setDocProjectId] = useState(projects[0]?.id || "");
  const [docVersion, setDocVersion] = useState("v1.0 (GFC)");
  const [docTags, setDocTags] = useState("GFC, Tower A, Structural");

  const filteredDocs = documents.filter((d) => {
    if (activeCategory !== "all" && d.type.toLowerCase() !== activeCategory.toLowerCase()) return false;
    if (projectFilter !== "all" && d.projectId !== projectFilter) return false;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.projectName.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === docProjectId) ?? projects[0];
    if (!proj) return;

    mockStore.addDocument({
      name: docName || "Untitled Document",
      type: docType,
      category: docCategory,
      projectId: proj.id,
      projectName: proj.name,
      size: "4.2 MB",
      fileExtension: "PDF",
      version: docVersion,
      uploadedBy: "Arjun Kapoor (Owner)",
      tags: docTags.split(",").map((t) => t.trim()).filter(Boolean),
      status: "active",
    });

    notify(`Document "${docName}" uploaded and indexed successfully.`);
    setUploadOpen(false);
    setDocName("");
  };

  return (
    <AppShell crumb="Documents">
      <PageHeader
        title="Document Management & Drawings"
        subtitle="Secure repository for structural GFC drawings, contract rate agreements, soil reports, municipal NOCs, and drone logs."
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5 font-semibold">
            <Upload className="size-4" /> Upload Document / Drawing
          </Button>
        }
      />

      {/* KPI Stats */}
      <StatGrid
        columns={4}
        items={[
          {
            label: "Total Stored Documents",
            value: documents.length,
            hint: "Across 8 portfolio sites",
            icon: <FolderOpen className="size-4" />,
          },
          {
            label: "GFC Engineering Drawings",
            value: documents.filter((d) => d.type === "Drawing").length,
            hint: "Version-controlled revisions",
            icon: <FileCode className="size-4" />,
          },
          {
            label: "Contracts & PO Agreements",
            value: documents.filter((d) => d.type === "Contract").length,
            hint: "Legal & commercial records",
            icon: <FileCheck className="size-4" />,
          },
          {
            label: "Storage Space Utilized",
            value: "64.5 GB",
            hint: "Of 200 GB Enterprise quota",
            icon: <HardHat className="size-4" />,
          },
        ]}
        className="mb-6"
      />

      {/* Controls & Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="bg-card border shadow-sm flex-wrap h-auto">
              <TabsTrigger value="all">All Documents ({documents.length})</TabsTrigger>
              <TabsTrigger value="drawing">Drawings ({documents.filter((d) => d.type === "Drawing").length})</TabsTrigger>
              <TabsTrigger value="contract">Contracts ({documents.filter((d) => d.type === "Contract").length})</TabsTrigger>
              <TabsTrigger value="report">Reports ({documents.filter((d) => d.type === "Report").length})</TabsTrigger>
              <TabsTrigger value="approval">Approvals ({documents.filter((d) => d.type === "Approval").length})</TabsTrigger>
              <TabsTrigger value="photo">Photos ({documents.filter((d) => d.type === "Photo").length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("table")}
            >
              <LayoutList className="size-3.5" />
            </Button>
          </div>
        </div>

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search document name, tag, project, version…"
          filters={
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          }
          onReset={() => {
            setSearch("");
            setProjectFilter("all");
            setActiveCategory("all");
          }}
        />
      </div>

      {/* Documents Grid / Table View */}
      {filteredDocs.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-12 text-center">
          <FileText className="size-10 text-muted-foreground" />
          <h3 className="mt-3 text-base font-bold">No Documents Found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try clearing filters or search with another keyword.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="group flex flex-col justify-between rounded-lg border bg-card p-5 shadow-panel hover:shadow-float transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">
                    {doc.type}
                  </span>
                  <span className="font-mono text-xs font-bold text-muted-foreground">{doc.version}</span>
                </div>

                <h4 className="mt-2.5 font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                  {doc.name}
                </h4>

                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 shrink-0" /> {doc.projectName}
                  </p>
                  <p>Category: <strong>{doc.category}</strong> · {doc.size}</p>
                </div>

                {doc.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {doc.tags.map((tag) => (
                      <span key={tag} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span className="truncate">Updated: {doc.updatedDate}</span>
                <span className="font-semibold text-primary flex items-center gap-1">
                  <Eye className="size-3.5" /> Preview
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border bg-card shadow-panel">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 uppercase font-bold text-muted-foreground border-b">
              <tr>
                <th className="px-4 py-3">Document Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Project Site</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">File Size</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDocs.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3.5 font-bold text-foreground">{doc.name}</td>
                  <td className="px-4 py-3.5">
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">{doc.type}</span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-primary">{doc.projectName}</td>
                  <td className="px-4 py-3.5 font-mono font-bold">{doc.version}</td>
                  <td className="px-4 py-3.5 font-mono">{doc.size}</td>
                  <td className="px-4 py-3.5">{doc.uploadedBy}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{doc.updatedDate}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-primary">Preview →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewerDialog document={selectedDoc} isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} />

      {/* Upload Document Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document / GFC Drawing</DialogTitle>
            <DialogDescription>Attach drawing revisions, contracts, test reports, or permits.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Document Title *</Label>
              <Input
                placeholder="e.g. Orion Heights Structural Drawing R8"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Document Type</Label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentItem["type"])}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                >
                  <option>Drawing</option>
                  <option>Contract</option>
                  <option>Report</option>
                  <option>Approval</option>
                  <option>Compliance</option>
                  <option>Photo</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Version String</Label>
                <Input value={docVersion} onChange={(e) => setDocVersion(e.target.value)} className="h-9 font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Project Site</Label>
              <select
                value={docProjectId}
                onChange={(e) => setDocProjectId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Tags (comma separated)</Label>
              <Input
                placeholder="e.g. GFC, Tower A, Structural, Rebar"
                value={docTags}
                onChange={(e) => setDocTags(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Upload & Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

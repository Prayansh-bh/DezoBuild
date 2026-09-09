export interface DocumentItemDto {
  id: string;
  name: string;
  type: "Drawing" | "Report" | "Contract" | "Approval" | "Compliance" | "Photo";
  category:
    | "Structural Drawings"
    | "Geotechnical & Survey"
    | "Vendor Contracts & POs"
    | "Statutory & Municipal"
    | "Quality & Safety"
    | "Site Photos & Drone Logs";
  projectId: string;
  projectName: string;
  size: string;
  fileExtension: string;
  version: string;
  updatedDate: string;
  uploadedBy: string;
  tags: string[];
  status: "active" | "archived";
}

export interface DocumentsServiceContract {
  findAll(projectId?: string): Promise<DocumentItemDto[]>;
  findById(id: string): Promise<DocumentItemDto | null>;
  upload(doc: Omit<DocumentItemDto, "id" | "updatedDate">): Promise<DocumentItemDto>;
}

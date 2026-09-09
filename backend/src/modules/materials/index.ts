export interface MaterialItemDto {
  id: string;
  itemCode: string;
  name: string;
  category:
    | "Steel & Rebar"
    | "Cement & Concrete"
    | "Aggregates & Sand"
    | "Masonry & AAC Blocks"
    | "Plumbing & Sanitary"
    | "Electrical & Conduits"
    | "Finishing & Paints";
  specification: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  safetyStock: number;
  allocatedStock: number;
  unitRate: number;
  totalStockValue: number;
  primarySupplier: string;
  warehouseLocation: string;
  status: "healthy" | "attention" | "critical";
  lastRestockedDate: string;
}

export interface MaterialsServiceContract {
  findAllItems(): Promise<MaterialItemDto[]>;
  findItemById(id: string): Promise<MaterialItemDto | null>;
  createIndent(indentData: unknown): Promise<unknown>;
  createPurchaseOrder(poData: unknown): Promise<unknown>;
  recordGrn(grnData: unknown): Promise<unknown>;
  issueMaterial(issueData: unknown): Promise<unknown>;
}

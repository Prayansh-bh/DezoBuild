export interface EquipmentAssetDto {
  id: string;
  assetCode: string;
  name: string;
  category:
    | "Earthmoving & Excavation"
    | "Lifting & Cranes"
    | "Concrete & Compaction"
    | "Transport & Haulage"
    | "Power & Generators"
    | "Pumping & Dewatering";
  model: string;
  manufacturer: string;
  yearOfManufacture: number;
  ownership: "Owned" | "Leased" | "Hired";
  assignedProjectId: string;
  assignedProjectName: string;
  status: "operational" | "under_maintenance" | "idle" | "breakdown";
  totalHoursRun: number;
  fuelType: "Diesel" | "Electric" | "Petrol";
  fitnessCertificateExpiry: string;
  insuranceExpiry: string;
  pncExpiry: string;
}

export interface EquipmentServiceContract {
  findAll(): Promise<EquipmentAssetDto[]>;
  findById(id: string): Promise<EquipmentAssetDto | null>;
  logFuelUsage(fuelData: unknown): Promise<unknown>;
  createMaintenanceTicket(ticketData: unknown): Promise<unknown>;
}

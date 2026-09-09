export interface ProjectDto {
  id: string;
  code: string;
  name: string;
  clientName: string;
  location: string;
  city: string;
  state: string;
  status: "planning" | "active" | "on_hold" | "completed";
  startDate: string;
  targetEndDate: string;
  contractValue: number;
  estimatedBudget: number;
  actualCost: number;
  progressPercent: number;
  plannedProgress: number;
  builtUpAreaSqFt: number;
  projectType:
    | "Residential High-Rise"
    | "Commercial Tech Park"
    | "Infrastructure Metro"
    | "Luxury Villa Community";
}

export interface ProjectsServiceContract {
  findAll(): Promise<ProjectDto[]>;
  findById(id: string): Promise<ProjectDto | null>;
  create(project: Omit<ProjectDto, "id">): Promise<ProjectDto>;
  update(id: string, updates: Partial<ProjectDto>): Promise<ProjectDto>;
}

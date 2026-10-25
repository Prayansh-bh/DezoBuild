import type { ProjectStatus } from '../constants/project.constants';

export interface ProjectMemberSummary {
  id: string;
  userId: string;
  projectRole: string;
  isLead: boolean;
  joinedAt: Date;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
}

export interface ProjectEntity {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  projectType: string | null;
  location: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: ProjectStatus;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  estimatedBudget: number | null;
  contractValue: number | null;
  currency: string;
  siteAreaSqft: number | null;
  builtUpAreaSqft: number | null;
  createdAt: Date;
  updatedAt: Date;
  company?: {
    id: string;
    code: string;
    name: string;
  };
  members?: ProjectMemberSummary[];
  _count?: {
    members: number;
    stores: number;
  };
}

export interface CreateProjectParams {
  id?: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  projectType?: string | null;
  location?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  status?: ProjectStatus;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  estimatedBudget?: number | null;
  contractValue?: number | null;
  currency?: string;
  siteAreaSqft?: number | null;
  builtUpAreaSqft?: number | null;
}

export interface UpdateProjectParams {
  name?: string;
  description?: string | null;
  projectType?: string | null;
  location?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  estimatedBudget?: number | null;
  contractValue?: number | null;
  currency?: string;
  siteAreaSqft?: number | null;
  builtUpAreaSqft?: number | null;
}

export interface ProjectFilterParams {
  companyId?: string;
  status?: ProjectStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IProjectRepository {
  findById(tenantId: string, projectId: string): Promise<ProjectEntity | null>;
  findByCode(tenantId: string, code: string): Promise<ProjectEntity | null>;
  findMany(tenantId: string, filters?: ProjectFilterParams): Promise<ProjectEntity[]>;
  findUserAccessibleProjects(
    tenantId: string,
    userId: string,
    filters?: ProjectFilterParams
  ): Promise<ProjectEntity[]>;
  create(params: CreateProjectParams): Promise<ProjectEntity>;
  update(tenantId: string, projectId: string, params: UpdateProjectParams): Promise<ProjectEntity>;
  updateStatus(
    tenantId: string,
    projectId: string,
    status: ProjectStatus,
    extraUpdates?: Partial<{ actualStartDate: Date | null; actualEndDate: Date | null }>
  ): Promise<ProjectEntity>;
  countActive(tenantId: string): Promise<number>;
  countByTenant(tenantId: string, filters?: ProjectFilterParams): Promise<number>;
}

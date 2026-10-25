import type { WbsStatus } from '../constants/wbs.constants';

export interface WbsNodeEntity {
  id: string;
  tenantId: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  level: number;
  sequence: number;
  status: WbsStatus;
  weightagePct: number | null;
  progressPct: number;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  children?: WbsNodeEntity[];
  _count?: {
    children?: number;
    tasks?: number;
  };
}

export interface CreateWbsNodeParams {
  id?: string;
  tenantId: string;
  projectId: string;
  parentId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  level: number;
  sequence?: number;
  status?: WbsStatus;
  weightagePct?: number | null;
  progressPct?: number;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
}

export interface UpdateWbsNodeParams {
  name?: string;
  description?: string | null;
  parentId?: string | null;
  level?: number;
  sequence?: number;
  status?: WbsStatus;
  weightagePct?: number | null;
  progressPct?: number;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
}

export interface IWbsRepository {
  findById(tenantId: string, projectId: string, nodeId: string): Promise<WbsNodeEntity | null>;
  findByCode(projectId: string, code: string): Promise<WbsNodeEntity | null>;
  findAllByProject(tenantId: string, projectId: string): Promise<WbsNodeEntity[]>;
  findChildren(projectId: string, parentId: string): Promise<WbsNodeEntity[]>;
  create(params: CreateWbsNodeParams): Promise<WbsNodeEntity>;
  update(tenantId: string, projectId: string, nodeId: string, params: UpdateWbsNodeParams): Promise<WbsNodeEntity>;
  delete(tenantId: string, projectId: string, nodeId: string): Promise<void>;
  countChildren(projectId: string, nodeId: string): Promise<number>;
  countTasks(projectId: string, nodeId: string): Promise<number>;
}

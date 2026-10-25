import { apiClient } from "../client";
import type {
  ProjectDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  WbsNodeDto,
  CreateWbsNodeRequest,
  TaskDto,
  CreateTaskRequest,
  TaskDependencyDto,
  DprDto,
  CreateDprRequest,
  BoqItemDto,
  CreateBoqItemRequest,
  DigitalMbEntryDto,
  CreateDigitalMbEntryRequest,
  PaginatedResponse,
} from "../types";

export const projectsApi = {
  list: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<PaginatedResponse<ProjectDto> | ProjectDto[]> => {
    return apiClient.get<PaginatedResponse<ProjectDto> | ProjectDto[]>("/projects", { params });
  },

  getById: async (id: string): Promise<ProjectDto> => {
    return apiClient.get<ProjectDto>(`/projects/${id}`);
  },

  create: async (data: CreateProjectRequest): Promise<ProjectDto> => {
    let payload = { ...data };
    if (!payload["companyId"]) {
      try {
        const companies = await apiClient.get<Array<{ id: string }>>("/companies");
        if (companies && companies.length > 0 && companies[0]?.id) {
          payload["companyId"] = companies[0].id;
        }
      } catch {
        // Continue with original payload
      }
    }
    return apiClient.post<ProjectDto>("/projects", payload);
  },

  update: async (id: string, data: UpdateProjectRequest): Promise<ProjectDto> => {
    return apiClient.patch<ProjectDto>(`/projects/${id}`, data);
  },

  transitionStatus: async (id: string, status: string, reason?: string): Promise<ProjectDto> => {
    return apiClient.post<ProjectDto>(`/projects/${id}/status`, { status, reason });
  },

  // WBS
  getWbs: async (projectId: string): Promise<WbsNodeDto[]> => {
    return apiClient.get<WbsNodeDto[]>(`/projects/${projectId}/wbs`);
  },

  createWbsNode: async (projectId: string, data: CreateWbsNodeRequest): Promise<WbsNodeDto> => {
    return apiClient.post<WbsNodeDto>(`/projects/${projectId}/wbs`, data);
  },

  // Tasks
  getTasks: async (projectId: string, params?: { wbsNodeId?: string; status?: string }): Promise<TaskDto[]> => {
    return apiClient.get<TaskDto[]>(`/projects/${projectId}/tasks`, { params });
  },

  createTask: async (projectId: string, data: CreateTaskRequest): Promise<TaskDto> => {
    return apiClient.post<TaskDto>(`/projects/${projectId}/tasks`, data);
  },

  updateTask: async (projectId: string, taskId: string, data: Partial<CreateTaskRequest>): Promise<TaskDto> => {
    return apiClient.patch<TaskDto>(`/projects/${projectId}/tasks/${taskId}`, data);
  },

  getTaskDependencies: async (projectId: string, taskId: string): Promise<TaskDependencyDto[]> => {
    return apiClient.get<TaskDependencyDto[]>(`/projects/${projectId}/tasks/${taskId}/dependencies`);
  },

  addTaskDependency: async (projectId: string, taskId: string, dependencyTaskId: string, type = "FINISH_TO_START"): Promise<TaskDependencyDto> => {
    return apiClient.post<TaskDependencyDto>(`/projects/${projectId}/tasks/${taskId}/dependencies`, { dependencyTaskId, type });
  },

  // DPR
  getDprs: async (projectId: string, params?: { date?: string; status?: string }): Promise<DprDto[]> => {
    return apiClient.get<DprDto[]>(`/projects/${projectId}/dpr`, { params });
  },

  getDprById: async (projectId: string, dprId: string): Promise<DprDto> => {
    return apiClient.get<DprDto>(`/projects/${projectId}/dpr/${dprId}`);
  },

  createDpr: async (projectId: string, data: CreateDprRequest): Promise<DprDto> => {
    return apiClient.post<DprDto>(`/projects/${projectId}/dpr`, data);
  },

  submitDpr: async (projectId: string, dprId: string): Promise<DprDto> => {
    return apiClient.post<DprDto>(`/projects/${projectId}/dpr/${dprId}/submit`);
  },

  approveDpr: async (projectId: string, dprId: string, notes?: string): Promise<DprDto> => {
    return apiClient.post<DprDto>(`/projects/${projectId}/dpr/${dprId}/approve`, { notes });
  },

  // BOQ
  getBoqItems: async (projectId: string): Promise<BoqItemDto[]> => {
    return apiClient.get<BoqItemDto[]>(`/projects/${projectId}/boq`);
  },

  createBoqItem: async (projectId: string, data: CreateBoqItemRequest): Promise<BoqItemDto> => {
    return apiClient.post<BoqItemDto>(`/projects/${projectId}/boq`, data);
  },

  updateBoqItem: async (projectId: string, itemId: string, data: Partial<CreateBoqItemRequest>): Promise<BoqItemDto> => {
    return apiClient.patch<BoqItemDto>(`/projects/${projectId}/boq/${itemId}`, data);
  },

  // Digital MB
  getDigitalMbEntries: async (projectId: string): Promise<DigitalMbEntryDto[]> => {
    return apiClient.get<DigitalMbEntryDto[]>(`/projects/${projectId}/mb`);
  },

  createDigitalMbEntry: async (projectId: string, data: CreateDigitalMbEntryRequest): Promise<DigitalMbEntryDto> => {
    return apiClient.post<DigitalMbEntryDto>(`/projects/${projectId}/mb`, data);
  },

  verifyDigitalMbEntry: async (projectId: string, entryId: string, remarks?: string): Promise<DigitalMbEntryDto> => {
    return apiClient.post<DigitalMbEntryDto>(`/projects/${projectId}/mb/${entryId}/verify`, { remarks });
  },
};

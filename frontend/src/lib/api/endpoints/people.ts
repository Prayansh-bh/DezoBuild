import { apiClient } from "../client";
import type {
  EmployeeDto,
  CreateEmployeeRequest,
  AttendanceRecordDto,
  CreateAttendanceRequest,
  LabourMusterDto,
  CreateLabourMusterRequest,
  ShiftDto,
  CreateShiftRequest,
  LeaveRequestDto,
  CreateLeaveRequest,
  ContractorDto,
  CreateContractorRequest,
  HolidayDto,
  CreateHolidayRequest,
  PaginatedResponse,
} from "../types";

export const peopleApi = {
  // Employees
  listEmployees: async (params?: { departmentId?: string; status?: string; search?: string }): Promise<EmployeeDto[]> => {
    return apiClient.get<EmployeeDto[]>("/people/employees", { params });
  },

  getEmployeeById: async (id: string): Promise<EmployeeDto> => {
    return apiClient.get<EmployeeDto>(`/people/employees/${id}`);
  },

  createEmployee: async (data: CreateEmployeeRequest): Promise<EmployeeDto> => {
    return apiClient.post<EmployeeDto>("/people/employees", data);
  },

  updateEmployee: async (id: string, data: Partial<CreateEmployeeRequest>): Promise<EmployeeDto> => {
    return apiClient.put<EmployeeDto>(`/people/employees/${id}`, data);
  },

  updateEmployeeStatus: async (id: string, status: string): Promise<EmployeeDto> => {
    return apiClient.patch<EmployeeDto>(`/people/employees/${id}/status`, { status });
  },

  // Attendance
  listAttendance: async (params?: { date?: string; employeeId?: string; projectId?: string }): Promise<AttendanceRecordDto[]> => {
    return apiClient.get<AttendanceRecordDto[]>("/people/attendance", { params });
  },

  recordPunch: async (data: { employeeId: string; type: "IN" | "OUT"; timestamp?: string; location?: any }): Promise<any> => {
    return apiClient.post("/people/attendance/punch", data);
  },

  createManualAttendance: async (data: CreateAttendanceRequest): Promise<AttendanceRecordDto> => {
    return apiClient.post<AttendanceRecordDto>("/people/attendance/manual", data);
  },

  // Shifts
  listShifts: async (): Promise<ShiftDto[]> => {
    return apiClient.get<ShiftDto[]>("/people/shifts");
  },

  createShift: async (data: CreateShiftRequest): Promise<ShiftDto> => {
    return apiClient.post<ShiftDto>("/people/shifts", data);
  },

  // Labour Contractors & Musters
  listContractors: async (): Promise<ContractorDto[]> => {
    return apiClient.get<ContractorDto[]>("/people/contractors");
  },

  createContractor: async (data: CreateContractorRequest): Promise<ContractorDto> => {
    return apiClient.post<ContractorDto>("/people/contractors", data);
  },

  listMusters: async (params?: { projectId?: string; date?: string }): Promise<LabourMusterDto[]> => {
    return apiClient.get<LabourMusterDto[]>("/people/musters", { params });
  },

  createMuster: async (data: CreateLabourMusterRequest): Promise<LabourMusterDto> => {
    return apiClient.post<LabourMusterDto>("/people/musters", data);
  },

  approveMuster: async (id: string, notes?: string): Promise<LabourMusterDto> => {
    return apiClient.post<LabourMusterDto>(`/people/musters/${id}/approve`, { notes });
  },

  // Leaves
  listLeaves: async (params?: { employeeId?: string; status?: string }): Promise<LeaveRequestDto[]> => {
    return apiClient.get<LeaveRequestDto[]>("/people/leaves", { params });
  },

  createLeave: async (data: CreateLeaveRequest): Promise<LeaveRequestDto> => {
    return apiClient.post<LeaveRequestDto>("/people/leaves", data);
  },

  approveLeave: async (id: string): Promise<LeaveRequestDto> => {
    return apiClient.post<LeaveRequestDto>(`/people/leaves/${id}/approve`);
  },

  // Holidays
  listHolidays: async (params?: { year?: number }): Promise<HolidayDto[]> => {
    return apiClient.get<HolidayDto[]>("/people/holidays", { params });
  },

  createHoliday: async (data: CreateHolidayRequest): Promise<HolidayDto> => {
    return apiClient.post<HolidayDto>("/people/holidays", data);
  },
};

export interface EmployeeDto {
  id: string;
  empCode: string;
  name: string;
  role: string;
  department: string;
  assignedProjectId: string;
  assignedProjectName: string;
  phone: string;
  email: string;
  joinDate: string;
  status: "active" | "on_leave" | "transferred" | "inactive";
  bloodGroup: string;
  emergencyContact: string;
}

export interface AttendanceRecordDto {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  ownStaffPresent: number;
  contractLabourPresent: number;
  totalPresent: number;
  recordedBy: string;
  shift:
    | "General Day (08:00 - 17:00)"
    | "Overtime / Extended (17:00 - 21:00)"
    | "Night Shift (21:00 - 05:00)";
  status: "submitted" | "approved" | "disputed";
}

export interface PeopleServiceContract {
  findAllEmployees(): Promise<EmployeeDto[]>;
  getAttendanceSummary(projectId: string, date: string): Promise<AttendanceRecordDto | null>;
  recordAttendance(record: Omit<AttendanceRecordDto, "id">): Promise<AttendanceRecordDto>;
}

import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { EmployeeRepository } from './repositories/employee.repository.js';
import { ShiftRepository } from './repositories/shift.repository.js';
import { AttendanceRepository } from './repositories/attendance.repository.js';
import { RegularizationRepository } from './repositories/regularization.repository.js';
import { ContractorRepository } from './repositories/contractor.repository.js';
import { MusterRepository } from './repositories/muster.repository.js';
import { LeaveRepository } from './repositories/leave.repository.js';
import { HolidayRepository } from './repositories/holiday.repository.js';
import { PeopleAuditRepository } from './repositories/people-audit.repository.js';

import { EmployeeService } from './services/employee.service.js';
import { ShiftService } from './services/shift.service.js';
import { AttendanceService } from './services/attendance.service.js';
import { RegularizationService } from './services/regularization.service.js';
import { ContractorService } from './services/contractor.service.js';
import { MusterService } from './services/muster.service.js';
import { LeaveService } from './services/leave.service.js';
import { HolidayService } from './services/holiday.service.js';

import { EmployeesController } from './controllers/employees.controller.js';
import { ShiftsController } from './controllers/shifts.controller.js';
import { AttendanceController } from './controllers/attendance.controller.js';
import { RegularizationsController } from './controllers/regularizations.controller.js';
import { ContractorsController } from './controllers/contractors.controller.js';
import { MustersController } from './controllers/musters.controller.js';
import { LeavesController } from './controllers/leaves.controller.js';
import { HolidaysController } from './controllers/holidays.controller.js';

export function registerPeopleRoutes(
  router: HttpRouter,
  customControllers?: {
    employeesController?: EmployeesController;
    shiftsController?: ShiftsController;
    attendanceController?: AttendanceController;
    regularizationsController?: RegularizationsController;
    contractorsController?: ContractorsController;
    mustersController?: MustersController;
    leavesController?: LeavesController;
    holidaysController?: HolidaysController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const auditRepo = new PeopleAuditRepository(prisma);
  const employeeRepo = new EmployeeRepository(prisma);
  const shiftRepo = new ShiftRepository(prisma);
  const attendanceRepo = new AttendanceRepository(prisma);
  const regularizationRepo = new RegularizationRepository(prisma);
  const contractorRepo = new ContractorRepository(prisma);
  const musterRepo = new MusterRepository(prisma);
  const leaveRepo = new LeaveRepository(prisma);
  const holidayRepo = new HolidayRepository(prisma);

  // Services
  const employeeService = new EmployeeService(prisma, employeeRepo, auditRepo);
  const shiftService = new ShiftService(prisma, shiftRepo, auditRepo);
  const attendanceService = new AttendanceService(prisma, attendanceRepo, employeeRepo, shiftRepo, holidayRepo, auditRepo);
  const regularizationService = new RegularizationService(prisma, regularizationRepo, attendanceRepo, employeeRepo, auditRepo);
  const contractorService = new ContractorService(prisma, contractorRepo, auditRepo);
  const musterService = new MusterService(prisma, musterRepo, contractorRepo, auditRepo);
  const leaveService = new LeaveService(prisma, leaveRepo, employeeRepo, attendanceRepo, auditRepo);
  const holidayService = new HolidayService(prisma, holidayRepo, auditRepo);

  // Controllers
  const employeesController = customControllers?.employeesController || new EmployeesController(employeeService);
  const shiftsController = customControllers?.shiftsController || new ShiftsController(shiftService);
  const attendanceController = customControllers?.attendanceController || new AttendanceController(attendanceService);
  const regularizationsController = customControllers?.regularizationsController || new RegularizationsController(regularizationService);
  const contractorsController = customControllers?.contractorsController || new ContractorsController(contractorService);
  const mustersController = customControllers?.mustersController || new MustersController(musterService);
  const leavesController = customControllers?.leavesController || new LeavesController(leaveService);
  const holidaysController = customControllers?.holidaysController || new HolidaysController(holidayService);

  // ==========================================
  // 1. EMPLOYEES
  // ==========================================
  router.get(`${prefix}/people/employees`, async (req) => employeesController.listEmployees(req));
  router.post(`${prefix}/people/employees`, async (req) => employeesController.createEmployee(req));
  router.get(`${prefix}/people/employees/:id`, async (req) => employeesController.getEmployee(req));
  router.put(`${prefix}/people/employees/:id`, async (req) => employeesController.updateEmployee(req));
  router.patch(`${prefix}/people/employees/:id/status`, async (req) => employeesController.updateEmployeeStatus(req));

  // ==========================================
  // 2. SHIFTS
  // ==========================================
  router.get(`${prefix}/people/shifts`, async (req) => shiftsController.listShifts(req));
  router.post(`${prefix}/people/shifts`, async (req) => shiftsController.createShift(req));

  // ==========================================
  // 3. ATTENDANCE & PUNCHES
  // ==========================================
  router.get(`${prefix}/people/attendance`, async (req) => attendanceController.listAttendance(req));
  router.post(`${prefix}/people/attendance/punch`, async (req) => attendanceController.recordPunch(req));
  router.post(`${prefix}/people/attendance/manual`, async (req) => attendanceController.createManualAttendance(req));
  router.post(`${prefix}/people/attendance/import`, async (req) => attendanceController.importAttendance(req));
  router.post(`${prefix}/people/attendance/biometric-sync`, async (req) => attendanceController.biometricSync(req));

  // ==========================================
  // 4. REGULARIZATION
  // ==========================================
  router.post(`${prefix}/people/regularizations`, async (req) => regularizationsController.createRegularization(req));
  router.post(`${prefix}/people/regularizations/:id/approve`, async (req) => regularizationsController.approveRegularization(req));
  router.post(`${prefix}/people/regularizations/:id/reject`, async (req) => regularizationsController.rejectRegularization(req));

  // ==========================================
  // 5. LABOUR CONTRACTORS
  // ==========================================
  router.get(`${prefix}/people/contractors`, async (req) => contractorsController.listContractors(req));
  router.post(`${prefix}/people/contractors`, async (req) => contractorsController.createContractor(req));

  // ==========================================
  // 6. MUSTERS
  // ==========================================
  router.get(`${prefix}/people/musters`, async (req) => mustersController.listMusters(req));
  router.post(`${prefix}/people/musters`, async (req) => mustersController.createMuster(req));
  router.post(`${prefix}/people/musters/:id/approve`, async (req) => mustersController.approveMuster(req));

  // ==========================================
  // 7. LEAVE
  // ==========================================
  router.get(`${prefix}/people/leaves`, async (req) => leavesController.listLeaves(req));
  router.post(`${prefix}/people/leaves`, async (req) => leavesController.createLeave(req));
  router.post(`${prefix}/people/leaves/:id/approve`, async (req) => leavesController.approveLeave(req));

  // ==========================================
  // 8. HOLIDAYS
  // ==========================================
  router.get(`${prefix}/people/holidays`, async (req) => holidaysController.listHolidays(req));
  router.post(`${prefix}/people/holidays`, async (req) => holidaysController.createHoliday(req));
}

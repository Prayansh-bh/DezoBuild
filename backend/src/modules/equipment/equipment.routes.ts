import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { EquipmentRepository } from './repositories/equipment.repository.js';
import { AssignmentRepository } from './repositories/assignment.repository.js';
import { OperatingLogRepository } from './repositories/operating-log.repository.js';
import { FuelLogRepository } from './repositories/fuel-log.repository.js';
import { MaintenanceScheduleRepository } from './repositories/maintenance-schedule.repository.js';
import { WorkOrderRepository } from './repositories/work-order.repository.js';
import { EquipmentAuditRepository } from './repositories/equipment-audit.repository.js';

import { EquipmentService } from './services/equipment.service.js';
import { AssignmentService } from './services/assignment.service.js';
import { OperatingLogService } from './services/operating-log.service.js';
import { FuelLogService } from './services/fuel-log.service.js';
import { MaintenanceService } from './services/maintenance.service.js';

import { EquipmentController } from './controllers/equipment.controller.js';
import { AssignmentsController } from './controllers/assignments.controller.js';
import { OperatingLogsController } from './controllers/operating-logs.controller.js';
import { FuelLogsController } from './controllers/fuel-logs.controller.js';
import { SchedulesController } from './controllers/schedules.controller.js';
import { WorkOrdersController } from './controllers/work-orders.controller.js';

export function registerEquipmentRoutes(
  router: HttpRouter,
  customControllers?: {
    equipmentController?: EquipmentController;
    assignmentsController?: AssignmentsController;
    operatingLogsController?: OperatingLogsController;
    fuelLogsController?: FuelLogsController;
    schedulesController?: SchedulesController;
    workOrdersController?: WorkOrdersController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const auditRepo = new EquipmentAuditRepository(prisma);
  const equipmentRepo = new EquipmentRepository(prisma);
  const assignmentRepo = new AssignmentRepository(prisma);
  const operatingLogRepo = new OperatingLogRepository(prisma);
  const fuelLogRepo = new FuelLogRepository(prisma);
  const scheduleRepo = new MaintenanceScheduleRepository(prisma);
  const workOrderRepo = new WorkOrderRepository(prisma);

  // Services
  const equipmentService = new EquipmentService(prisma, equipmentRepo, auditRepo);
  const assignmentService = new AssignmentService(prisma, equipmentRepo, assignmentRepo, auditRepo);
  const operatingLogService = new OperatingLogService(prisma, equipmentRepo, operatingLogRepo, auditRepo);
  const fuelLogService = new FuelLogService(prisma, equipmentRepo, fuelLogRepo, auditRepo);
  const maintenanceService = new MaintenanceService(prisma, equipmentRepo, scheduleRepo, workOrderRepo, auditRepo);

  // Controllers
  const equipmentController = customControllers?.equipmentController || new EquipmentController(equipmentService);
  const assignmentsController = customControllers?.assignmentsController || new AssignmentsController(assignmentService);
  const operatingLogsController = customControllers?.operatingLogsController || new OperatingLogsController(operatingLogService);
  const fuelLogsController = customControllers?.fuelLogsController || new FuelLogsController(fuelLogService);
  const schedulesController = customControllers?.schedulesController || new SchedulesController(maintenanceService);
  const workOrdersController = customControllers?.workOrdersController || new WorkOrdersController(maintenanceService);

  // ==========================================
  // 1. MAINTENANCE WORK ORDERS (Specific prefix first)
  // ==========================================
  router.get(`${prefix}/equipment/work-orders`, async (req) => workOrdersController.listWorkOrders(req));
  router.post(`${prefix}/equipment/work-orders`, async (req) => workOrdersController.createWorkOrder(req));
  router.get(`${prefix}/equipment/work-orders/:id`, async (req) => workOrdersController.getWorkOrder(req));
  router.post(`${prefix}/equipment/work-orders/:id/complete`, async (req) => workOrdersController.completeWorkOrder(req));

  // ==========================================
  // 2. ASSIGNMENT RETURN & LOG CORRECTION (Global entity routes)
  // ==========================================
  router.post(`${prefix}/equipment/assignments/:id/return`, async (req) => assignmentsController.returnAssignment(req));
  router.post(`${prefix}/equipment/operating-logs/:id/correct`, async (req) => operatingLogsController.correctOperatingLog(req));

  // ==========================================
  // 3. EQUIPMENT COLLECTION
  // ==========================================
  router.get(`${prefix}/equipment`, async (req) => equipmentController.listEquipment(req));
  router.post(`${prefix}/equipment`, async (req) => equipmentController.createEquipment(req));

  // ==========================================
  // 4. SUB-RESOURCES (Nested under equipment id)
  // ==========================================
  router.get(`${prefix}/equipment/:id/assignments`, async (req) => assignmentsController.listAssignments(req));
  router.post(`${prefix}/equipment/:id/assignments`, async (req) => assignmentsController.createAssignment(req));

  router.get(`${prefix}/equipment/:id/operating-logs`, async (req) => operatingLogsController.listOperatingLogs(req));
  router.post(`${prefix}/equipment/:id/operating-logs`, async (req) => operatingLogsController.createOperatingLog(req));

  router.get(`${prefix}/equipment/:id/fuel-logs`, async (req) => fuelLogsController.listFuelLogs(req));
  router.post(`${prefix}/equipment/:id/fuel-logs`, async (req) => fuelLogsController.createFuelLog(req));

  router.get(`${prefix}/equipment/:id/schedules`, async (req) => schedulesController.listSchedules(req));
  router.post(`${prefix}/equipment/:id/schedules`, async (req) => schedulesController.createSchedule(req));

  // ==========================================
  // 5. EQUIPMENT SINGLE ENTITY
  // ==========================================
  router.patch(`${prefix}/equipment/:id/status`, async (req) => equipmentController.updateEquipmentStatus(req));
  router.put(`${prefix}/equipment/:id`, async (req) => equipmentController.updateEquipment(req));
  router.get(`${prefix}/equipment/:id`, async (req) => equipmentController.getEquipment(req));
}

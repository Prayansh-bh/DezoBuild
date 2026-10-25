import type { HttpRouter } from '../../common/http/router.js';
import { DatabaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';

import { FinanceSequenceRepository } from './repositories/finance-sequence.repository.js';
import { FinanceAuditRepository } from './repositories/finance-audit.repository.js';
import { ExpenseRepository } from './repositories/expense.repository.js';
import { InvoiceRepository } from './repositories/invoice.repository.js';
import { RaBillRepository } from './repositories/ra-bill.repository.js';
import { PaymentRepository } from './repositories/payment.repository.js';
import { AdvanceRepository } from './repositories/advance.repository.js';
import { RetentionRepository } from './repositories/retention.repository.js';

import { ExpenseService } from './services/expense.service.js';
import { InvoiceService } from './services/invoice.service.js';
import { RaBillService } from './services/ra-bill.service.js';
import { PaymentService } from './services/payment.service.js';
import { AdvanceService } from './services/advance.service.js';
import { PayableService } from './services/payable.service.js';
import { ProjectCostService } from './services/project-cost.service.js';

import { ExpensesController } from './controllers/expenses.controller.js';
import { InvoicesController } from './controllers/invoices.controller.js';
import { RaBillsController } from './controllers/ra-bills.controller.js';
import { PayablesController } from './controllers/payables.controller.js';
import { PaymentsController } from './controllers/payments.controller.js';
import { AdvancesController } from './controllers/advances.controller.js';
import { ProjectCostController } from './controllers/project-cost.controller.js';

export function registerFinanceRoutes(
  router: HttpRouter,
  customControllers?: {
    expensesController?: ExpensesController;
    invoicesController?: InvoicesController;
    raBillsController?: RaBillsController;
    payablesController?: PayablesController;
    paymentsController?: PaymentsController;
    advancesController?: AdvancesController;
    projectCostController?: ProjectCostController;
  }
): void {
  const prefix = appConfig.app.apiPrefix;
  const prisma = DatabaseService.getInstance().getClient();

  // Repositories
  const sequenceRepo = new FinanceSequenceRepository(prisma);
  const auditRepo = new FinanceAuditRepository(prisma);
  const expenseRepo = new ExpenseRepository(prisma);
  const invoiceRepo = new InvoiceRepository(prisma);
  const raBillRepo = new RaBillRepository(prisma);
  const paymentRepo = new PaymentRepository(prisma);
  const advanceRepo = new AdvanceRepository(prisma);
  const retentionRepo = new RetentionRepository(prisma);

  // Services
  const expenseService = new ExpenseService(prisma, expenseRepo, sequenceRepo, auditRepo);
  const invoiceService = new InvoiceService(prisma, invoiceRepo, advanceRepo, retentionRepo, sequenceRepo, auditRepo);
  const raBillService = new RaBillService(prisma, raBillRepo, advanceRepo, retentionRepo, sequenceRepo, auditRepo);
  const paymentService = new PaymentService(prisma, paymentRepo, sequenceRepo, auditRepo);
  const advanceService = new AdvanceService(prisma, advanceRepo, sequenceRepo, auditRepo);
  const payableService = new PayableService(prisma);
  const projectCostService = new ProjectCostService(prisma);

  // Controllers
  const expensesController = customControllers?.expensesController || new ExpensesController(expenseService);
  const invoicesController = customControllers?.invoicesController || new InvoicesController(invoiceService);
  const raBillsController = customControllers?.raBillsController || new RaBillsController(raBillService);
  const payablesController = customControllers?.payablesController || new PayablesController(payableService);
  const paymentsController = customControllers?.paymentsController || new PaymentsController(paymentService);
  const advancesController = customControllers?.advancesController || new AdvancesController(advanceService);
  const projectCostController = customControllers?.projectCostController || new ProjectCostController(projectCostService);

  // ==========================================
  // 1. EXPENSES & CLAIMS
  // ==========================================
  router.get(`${prefix}/finance/expense-categories`, async (req) => expensesController.listCategories(req));
  router.post(`${prefix}/finance/expense-categories`, async (req) => expensesController.createCategory(req));

  router.get(`${prefix}/finance/expenses`, async (req) => expensesController.listExpenses(req));
  router.post(`${prefix}/finance/expenses`, async (req) => expensesController.createExpense(req));
  router.get(`${prefix}/finance/expenses/:id`, async (req) => expensesController.getExpense(req));
  router.post(`${prefix}/finance/expenses/:id/submit`, async (req) => expensesController.submitExpense(req));
  router.post(`${prefix}/finance/expenses/:id/approve`, async (req) => expensesController.approveExpense(req));
  router.post(`${prefix}/finance/expenses/:id/reject`, async (req) => expensesController.rejectExpense(req));

  // ==========================================
  // 2. VENDOR INVOICES
  // ==========================================
  router.get(`${prefix}/finance/invoices`, async (req) => invoicesController.listInvoices(req));
  router.post(`${prefix}/finance/invoices`, async (req) => invoicesController.createInvoice(req));
  router.get(`${prefix}/finance/invoices/:id`, async (req) => invoicesController.getInvoice(req));
  router.post(`${prefix}/finance/invoices/:id/verify`, async (req) => invoicesController.verifyInvoice(req));
  router.post(`${prefix}/finance/invoices/:id/approve`, async (req) => invoicesController.approveInvoice(req));

  // ==========================================
  // 3. COMMERCIAL PAYABLES VIEW
  // ==========================================
  router.get(`${prefix}/finance/payables`, async (req) => payablesController.listPayables(req));

  // ==========================================
  // 4. PAYMENT VOUCHERS & DISBURSEMENT
  // ==========================================
  router.get(`${prefix}/finance/payments`, async (req) => paymentsController.listPayments(req));
  router.post(`${prefix}/finance/payments`, async (req) => paymentsController.createPayment(req));
  router.get(`${prefix}/finance/payments/:id`, async (req) => paymentsController.getPayment(req));
  router.post(`${prefix}/finance/payments/:id/approve`, async (req) => paymentsController.approvePayment(req));
  router.post(`${prefix}/finance/payments/:id/disburse`, async (req) => paymentsController.disbursePayment(req));

  // ==========================================
  // 5. ADVANCES & RECOVERY
  // ==========================================
  router.get(`${prefix}/finance/advances`, async (req) => advancesController.listAdvances(req));
  router.post(`${prefix}/finance/advances`, async (req) => advancesController.createAdvance(req));
  router.get(`${prefix}/finance/advances/:id`, async (req) => advancesController.getAdvance(req));

  // ==========================================
  // 6. CONTRACTOR RA BILLS
  // ==========================================
  router.get(`${prefix}/finance/ra-bills`, async (req) => raBillsController.listRaBills(req));
  router.post(`${prefix}/finance/ra-bills`, async (req) => raBillsController.createRaBill(req));
  router.get(`${prefix}/finance/ra-bills/:id`, async (req) => raBillsController.getRaBill(req));
  router.post(`${prefix}/finance/ra-bills/:id/verify`, async (req) => raBillsController.verifyRaBill(req));
  router.post(`${prefix}/finance/ra-bills/:id/approve`, async (req) => raBillsController.approveRaBill(req));

  // ==========================================
  // 7. PROJECT FINANCIAL & COST SUMMARY
  // ==========================================
  router.get(`${prefix}/finance/projects/:projectId/summary`, async (req) => projectCostController.getProjectCostSummary(req));
}

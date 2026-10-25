export * from './constants/finance.constants.js';
export * from './dto/expense.dto.js';
export * from './dto/invoice.dto.js';
export * from './dto/ra-bill.dto.js';
export * from './dto/payment.dto.js';
export * from './dto/advance.dto.js';
export * from './dto/payable.dto.js';
export * from './dto/project-cost.dto.js';

export * from './repositories/finance-sequence.repository.js';
export * from './repositories/finance-audit.repository.js';
export * from './repositories/expense.repository.js';
export * from './repositories/invoice.repository.js';
export * from './repositories/ra-bill.repository.js';
export * from './repositories/payment.repository.js';
export * from './repositories/advance.repository.js';
export * from './repositories/retention.repository.js';

export * from './services/expense.service.js';
export * from './services/invoice.service.js';
export * from './services/ra-bill.service.js';
export * from './services/payment.service.js';
export * from './services/advance.service.js';
export * from './services/payable.service.js';
export * from './services/project-cost.service.js';

export * from './controllers/expenses.controller.js';
export * from './controllers/invoices.controller.js';
export * from './controllers/ra-bills.controller.js';
export * from './controllers/payables.controller.js';
export * from './controllers/payments.controller.js';
export * from './controllers/advances.controller.js';
export * from './controllers/project-cost.controller.js';

export * from './finance.routes.js';
export * from './helpers/context.helper.js';

export interface ExpenseRecordDto {
  id: string;
  expenseNumber: string;
  projectId: string;
  projectName: string;
  category:
    | "Material Purchase"
    | "Contractor Advance"
    | "Labour Wages"
    | "Equipment Hire & Fuel"
    | "Site Overheads & Admin"
    | "Consultant Fees"
    | "Statutory & Permits";
  amount: number;
  paidTo: string;
  paymentMode: "Bank NEFT/RTGS" | "Cheque" | "UPI / Corporate Card" | "Petty Cash";
  invoiceNumber?: string;
  date: string;
  status: "approved" | "pending_approval" | "paid" | "rejected";
  approvedBy?: string;
  description: string;
}

export interface FinanceServiceContract {
  findAllExpenses(projectId?: string): Promise<ExpenseRecordDto[]>;
  recordExpense(expense: Omit<ExpenseRecordDto, "id">): Promise<ExpenseRecordDto>;
  recordPayment(paymentData: unknown): Promise<unknown>;
}

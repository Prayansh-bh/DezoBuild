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

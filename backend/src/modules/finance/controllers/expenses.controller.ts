import type { IncomingMessage } from 'node:http';
import { ExpenseService } from '../services/expense.service.js';
import {
  createExpenseCategorySchema,
  createExpenseClaimSchema,
  listExpensesQuerySchema,
} from '../dto/expense.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildFinanceContext } from '../helpers/context.helper.js';

export class ExpensesController {
  constructor(private readonly expenseService: ExpenseService) {}

  public async listExpenses(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listExpensesQuerySchema, req.query || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.expenseService.listClaims(context, query);
    return createSuccessResponse(result, 'Expense claims retrieved successfully');
  }

  public async createExpense(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:expense:create');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createExpenseClaimSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.expenseService.createClaim(context, dto);
    return createSuccessResponse(result, 'Expense claim created successfully');
  }

  public async getExpense(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildFinanceContext(principal, req);

    const result = await this.expenseService.getClaimById(context, id);
    return createSuccessResponse(result, 'Expense claim retrieved successfully');
  }

  public async submitExpense(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:expense:create');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildFinanceContext(principal, req);

    const result = await this.expenseService.submitClaim(context, id);
    return createSuccessResponse(result, 'Expense claim submitted successfully');
  }

  public async approveExpense(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:expense:approve');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const remarks = (req.body as any)?.remarks;
    const context = buildFinanceContext(principal, req);

    const result = await this.expenseService.approveClaim(context, id, remarks);
    return createSuccessResponse(result, 'Expense claim approved successfully');
  }

  public async rejectExpense(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:expense:approve');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const rejectionReason = (req.body as any)?.rejectionReason || 'Rejected by approver';
    const context = buildFinanceContext(principal, req);

    const result = await this.expenseService.rejectClaim(context, id, rejectionReason);
    return createSuccessResponse(result, 'Expense claim rejected successfully');
  }

  public async listCategories(
    req: IncomingMessage
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const context = buildFinanceContext(principal, req);

    const result = await this.expenseService.listCategories(context);
    return createSuccessResponse(result, 'Expense categories retrieved successfully');
  }

  public async createCategory(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:expense:create');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createExpenseCategorySchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.expenseService.createCategory(context, dto);
    return createSuccessResponse(result, 'Expense category created successfully');
  }
}

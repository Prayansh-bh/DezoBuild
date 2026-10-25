import type { IncomingMessage } from 'node:http';
import { PaymentService } from '../services/payment.service.js';
import {
  createPaymentVoucherSchema,
  approvePaymentVoucherSchema,
  disbursePaymentVoucherSchema,
  listPaymentVouchersQuerySchema,
} from '../dto/payment.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildFinanceContext } from '../helpers/context.helper.js';

export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  public async listPayments(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listPaymentVouchersQuerySchema, req.query || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.paymentService.listVouchers(context, query);
    return createSuccessResponse(result, 'Payment vouchers retrieved successfully');
  }

  public async createPayment(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:payment:create');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createPaymentVoucherSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.paymentService.createVoucher(context, dto);
    return createSuccessResponse(result, 'Payment voucher created successfully');
  }

  public async getPayment(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildFinanceContext(principal, req);

    const result = await this.paymentService.getVoucherById(context, id);
    return createSuccessResponse(result, 'Payment voucher retrieved successfully');
  }

  public async approvePayment(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:payment:create');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(approvePaymentVoucherSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.paymentService.approveVoucher(context, id, dto);
    return createSuccessResponse(result, 'Payment voucher approved successfully');
  }

  public async disbursePayment(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:payment:disburse');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(disbursePaymentVoucherSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.paymentService.disburseVoucher(context, id, dto);
    return createSuccessResponse(result, 'Payment voucher disbursed successfully');
  }
}

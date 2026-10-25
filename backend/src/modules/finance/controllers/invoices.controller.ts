import type { IncomingMessage } from 'node:http';
import { InvoiceService } from '../services/invoice.service.js';
import {
  createVendorInvoiceSchema,
  verifyVendorInvoiceSchema,
  approveVendorInvoiceSchema,
  listVendorInvoicesQuerySchema,
} from '../dto/invoice.dto.js';
import { requireAuth } from '../../auth/auth.guard.js';
import { RbacGuard } from '../../rbac/guards/rbac.guard.js';
import { EntitlementGuard } from '../../subscriptions/guards/entitlement.guard.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { buildFinanceContext } from '../helpers/context.helper.js';

export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  public async listInvoices(
    req: IncomingMessage & { query?: Record<string, string> }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const query = DtoValidator.validate(listVendorInvoicesQuerySchema, req.query || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.invoiceService.listInvoices(context, query);
    return createSuccessResponse(result, 'Vendor invoices retrieved successfully');
  }

  public async createInvoice(
    req: IncomingMessage & { body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:bill:create');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const dto = DtoValidator.validate(createVendorInvoiceSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.invoiceService.createInvoice(context, dto);
    return createSuccessResponse(result, 'Vendor invoice created successfully');
  }

  public async getInvoice(
    req: IncomingMessage & { params?: { id?: string } }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:view');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const context = buildFinanceContext(principal, req);

    const result = await this.invoiceService.getInvoiceById(context, id);
    return createSuccessResponse(result, 'Vendor invoice retrieved successfully');
  }

  public async verifyInvoice(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:bill:verify');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(verifyVendorInvoiceSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.invoiceService.verifyInvoice(context, id, dto);
    return createSuccessResponse(result, 'Vendor invoice verified successfully');
  }

  public async approveInvoice(
    req: IncomingMessage & { params?: { id?: string }; body?: unknown }
  ): Promise<ApiResponse<unknown>> {
    await RbacGuard.requirePermission(req, 'finance:bill:approve');
    await EntitlementGuard.requireFeature(req, 'finance:commercial');

    const principal = await requireAuth(req);
    const id = req.params?.id || '';
    const dto = DtoValidator.validate(approveVendorInvoiceSchema, req.body || {});
    const context = buildFinanceContext(principal, req);

    const result = await this.invoiceService.approveInvoice(context, id, dto);
    return createSuccessResponse(result, 'Vendor invoice approved successfully');
  }
}

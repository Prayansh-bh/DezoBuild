import type { IncomingMessage } from 'node:http';
import { WebhookService } from '../services/webhook.service.js';
import { webhookPayloadSchema } from '../dto/integration.dto.js';
import { INTEGRATION_HEADERS } from '../constants/integration.constants.js';
import { DtoValidator } from '../../../common/validation/validator.js';
import { createSuccessResponse, type ApiResponse } from '../../../common/dto/api-response.dto.js';
import { BadRequestError } from '../../../common/errors/app-error.js';

export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  public async handleInboundWebhook(
    req: IncomingMessage & { params?: { providerKey?: string }; body?: unknown }
  ): Promise<ApiResponse<any>> {
    const providerKey = req.params?.providerKey!;
    const dto = DtoValidator.validate(webhookPayloadSchema, req.body || {});

    const signature = req.headers[INTEGRATION_HEADERS.SIGNATURE] as string | undefined;
    const timestamp = req.headers[INTEGRATION_HEADERS.TIMESTAMP] as string | undefined;
    const rawPayload = JSON.stringify(req.body || {});

    const result = await this.webhookService.ingestWebhook(
      providerKey,
      dto,
      rawPayload,
      signature,
      timestamp
    );

    if (!result.accepted) {
      throw new BadRequestError(result.message);
    }

    return createSuccessResponse(result, result.message);
  }
}

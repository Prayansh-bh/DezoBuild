import crypto from 'node:crypto';
import type { WebhookVerificationContext, WebhookVerificationResult } from './integration-provider.interface.js';

export class WebhookVerifier {
  public static verifyHmacSha256(
    context: WebhookVerificationContext,
    secret: string,
    toleranceSeconds: number = 300
  ): WebhookVerificationResult {
    if (!context.signature) {
      return { valid: false, reason: 'Missing webhook signature header' };
    }

    if (context.timestamp) {
      const parsedTime = Number(context.timestamp);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parsedTime) > toleranceSeconds) {
        return { valid: false, reason: 'Webhook signature timestamp expired (replay attack protection)' };
      }
    }

    const payloadToSign = context.timestamp
      ? `${context.timestamp}.${context.rawPayload}`
      : context.rawPayload;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadToSign)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(context.signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return { valid: false, reason: 'Invalid webhook cryptographic signature' };
    }

    return { valid: true };
  }
}

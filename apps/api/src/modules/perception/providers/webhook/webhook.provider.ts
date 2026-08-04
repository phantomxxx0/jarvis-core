import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PerceptionProvider } from '../../contracts/perception-provider.interface';
import {
  PerceptionEvent,
  PerceptionSourceType,
} from '../../contracts/perception-event.interface';
import { PerceptionManagerService } from '../../perception-manager.service';
import { SignatureValidator } from './signature-validators/signature-validator.interface';
import { HmacValidator } from './signature-validators/hmac.validator';

@Injectable()
export class WebhookProvider implements PerceptionProvider {
  public readonly name = 'WebhookProvider';
  public readonly sourceType: PerceptionSourceType = 'WEBHOOK';
  private readonly logger = new Logger(WebhookProvider.name);

  private readonly validators = new Map<string, SignatureValidator>();

  constructor(private readonly perceptionManager: PerceptionManagerService) {
    // Register default validators
    this.validators.set('github', new HmacValidator('sha256', 'sha256='));
    this.validators.set('stripe', new HmacValidator('sha256'));
    this.validators.set('generic-sha256', new HmacValidator('sha256'));
  }

  isHealthy(): boolean {
    return true; // Push provider is always healthy
  }

  async processWebhook(
    sourceId: string,
    payload: unknown,
    rawBody?: Buffer,
    signature?: string,
    validatorType?: string,
    secret?: string,
  ): Promise<void> {
    // 1. Signature Verification
    if (validatorType && signature && secret) {
      if (!rawBody) {
        throw new Error('Raw body is required for signature verification');
      }

      const validator = this.validators.get(validatorType);
      if (!validator) {
        throw new Error(`Unsupported validator type: ${validatorType}`);
      }

      const isValid = validator.validate(rawBody, signature, secret);
      if (!isValid) {
        this.logger.warn(
          `Invalid signature detected for webhook source: ${sourceId}`,
        );
        throw new Error('Invalid webhook signature');
      }
    }

    // 2. Ingest Event
    const event: PerceptionEvent = {
      id: randomUUID(),
      sourceType: this.sourceType,
      sourceId,
      timestamp: new Date(),
      payload,
    };

    await this.perceptionManager.ingestEvent(event);
  }
}

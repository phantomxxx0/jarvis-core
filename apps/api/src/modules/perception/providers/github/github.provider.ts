import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PerceptionProvider } from '../../contracts/perception-provider.interface';
import {
  PerceptionEvent,
  PerceptionSourceType,
} from '../../contracts/perception-event.interface';
import { PerceptionManagerService } from '../../perception-manager.service';
import { HmacValidator } from '../webhook/signature-validators/hmac.validator';

@Injectable()
export class GithubProvider implements PerceptionProvider {
  public readonly name = 'GithubProvider';
  public readonly sourceType: PerceptionSourceType = 'GITHUB';
  private readonly logger = new Logger(GithubProvider.name);

  private readonly validator = new HmacValidator('sha256', 'sha256=');

  constructor(private readonly perceptionManager: PerceptionManagerService) {}

  isHealthy(): boolean {
    return true;
  }

  async processGithubEvent(
    eventAction: string,
    payload: unknown,
    rawBody?: Buffer,
    signature?: string,
    secret?: string,
  ): Promise<void> {
    if (signature && secret && rawBody) {
      if (!this.validator.validate(rawBody, signature, secret)) {
        this.logger.warn(
          `Invalid signature detected for GitHub event: ${eventAction}`,
        );
        throw new Error('Invalid GitHub signature');
      }
    }

    const event: PerceptionEvent = {
      id: randomUUID(),
      sourceType: this.sourceType,
      sourceId: `github-${eventAction}`,
      timestamp: new Date(),
      payload,
    };

    await this.perceptionManager.ingestEvent(event);
  }
}

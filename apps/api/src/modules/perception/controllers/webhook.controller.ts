import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookProvider } from '../providers/webhook/webhook.provider';
import { ConfigService } from '@nestjs/config';

@Controller('perception/webhook')
export class WebhookController {
  constructor(
    private readonly webhookProvider: WebhookProvider,
    private readonly configService: ConfigService,
  ) {}

  @Post(':sourceId')
  async handleWebhook(
    @Param('sourceId') sourceId: string,
    @Req() request: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, string>,
  ) {
    try {
      // Determine if a specific validator is needed based on headers
      let validatorType: string | undefined;
      let signature: string | undefined;
      let secret: string | undefined;

      // GitHub heuristic
      if (headers['x-hub-signature-256']) {
        validatorType = 'github';
        signature = headers['x-hub-signature-256'];
        secret = this.configService.get<string>(`WEBHOOK_SECRET_GITHUB`);
      }
      // Stripe heuristic
      else if (headers['stripe-signature']) {
        validatorType = 'stripe';
        signature = headers['stripe-signature'];
        secret = this.configService.get<string>(`WEBHOOK_SECRET_STRIPE`);
      }
      // Generic HMAC
      else if (headers['x-signature']) {
        validatorType = 'generic-sha256';
        signature = headers['x-signature'];
        secret = this.configService.get<string>(
          `WEBHOOK_SECRET_${sourceId.toUpperCase()}`,
        );
      }

      await this.webhookProvider.processWebhook(
        sourceId,
        request.body,
        request.rawBody,
        signature,
        validatorType,
        secret,
      );

      return { status: 'received' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('signature')) {
        throw new UnauthorizedException(msg);
      }
      throw new BadRequestException(msg);
    }
  }
}

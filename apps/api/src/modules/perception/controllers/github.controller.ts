import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { GithubProvider } from '../providers/github/github.provider';
import { ConfigService } from '@nestjs/config';

@Controller('perception/github')
export class GithubController {
  constructor(
    private readonly githubProvider: GithubProvider,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handleGithubWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-github-event') githubEvent: string,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    try {
      const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');

      await this.githubProvider.processGithubEvent(
        githubEvent || 'unknown',
        request.body,
        request.rawBody,
        signature,
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

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const expectedKey = this.configService.get<string>('JARVIS_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('JARVIS_API_KEY is not configured on the server');
    }

    try {
      const tokenBuf = Buffer.from(token);
      const expectedBuf = Buffer.from(expectedKey);

      if (tokenBuf.length !== expectedBuf.length || !timingSafeEqual(tokenBuf, expectedBuf)) {
        throw new UnauthorizedException('Invalid API Key');
      }
    } catch {
      throw new UnauthorizedException('Invalid API Key');
    }

    // Attach a system service user to the request so downstream components have an identity
    (request as any).user = {
      id: 'system-service-account',
      email: 'service@jarvis.local',
      role: 'system',
    };

    return true;
  }
}

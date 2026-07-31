import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuditEvent } from './enums/audit-event.enum';

interface LoginSuccessData {
  userId: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
}

interface LoginFailureData {
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
}

interface LogoutData {
  sessionId: string;
}

interface LogoutAllData {
  userId: string;
}

interface RefreshTokenReuseData {
  userId: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectPinoLogger(AuditService.name)
    private readonly logger: PinoLogger,
  ) {}

  loginSuccess(data: LoginSuccessData): void {
    this.log(AuditEvent.LoginSuccess, data);
  }

  loginFailure(data: LoginFailureData): void {
    this.log(AuditEvent.LoginFailure, data);
  }

  refreshTokenReuse(data: RefreshTokenReuseData): void {
    this.log(AuditEvent.RefreshTokenReuseDetected, data);
  }

  logout(data: LogoutData): void {
    this.log(AuditEvent.Logout, data);
  }

  logoutAll(data: LogoutAllData): void {
    this.log(AuditEvent.LogoutAll, data);
  }

  private log<T extends object>(event: AuditEvent, data: T): void {
    this.logger.info({
      event,
      ...data,
    });
  }
}

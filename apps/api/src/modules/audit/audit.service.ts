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

interface AccountLockedData {
  userId: string;
  email: string;
  lockoutUntil: Date | null;
}

interface PasswordChangedData {
  userId: string;
  email: string;
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

interface AuthorizationDecisionData {
  principalId: string;
  permission: string;
  resourceType: string | null;
  resourceId: string | null;
  requestId: string;
  allowed: boolean;
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

  accountLocked(data: AccountLockedData): void {
    this.log(AuditEvent.AccountLocked, data);
  }

  passwordChanged(data: PasswordChangedData): void {
    this.log(AuditEvent.PasswordChanged, data);
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

  /**
   * Records a single authorization decision (allow or deny). Called by
   * AuthorizationService.can() on every evaluation — this is the append-only
   * trail governance depends on. Never called conditionally; every check
   * gets logged regardless of outcome.
   */
  authorizationDecision(data: AuthorizationDecisionData): void {
    this.log(
      data.allowed
        ? AuditEvent.AuthorizationAllow
        : AuditEvent.AuthorizationDeny,
      data,
    );
  }

  private log<T extends object>(event: AuditEvent, data: T): void {
    this.logger.info({
      event,
      ...data,
    });
  }
}

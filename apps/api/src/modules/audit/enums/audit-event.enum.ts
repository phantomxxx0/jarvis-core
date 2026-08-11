export enum AuditEvent {
  LoginSuccess = 'LOGIN_SUCCESS',
  LoginFailure = 'LOGIN_FAILURE',
  AccountLocked = 'ACCOUNT_LOCKED',
  PasswordChanged = 'PASSWORD_CHANGED',
  Logout = 'LOGOUT',
  LogoutAll = 'LOGOUT_ALL',
  RefreshTokenReuseDetected = 'REFRESH_TOKEN_REUSE_DETECTED',
  AuthorizationAllow = 'AUTHORIZATION_ALLOW',
  AuthorizationDeny = 'AUTHORIZATION_DENY',
}

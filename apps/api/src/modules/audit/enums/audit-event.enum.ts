export enum AuditEvent {
  LoginSuccess = 'LOGIN_SUCCESS',
  LoginFailure = 'LOGIN_FAILURE',
  AccountLocked = 'ACCOUNT_LOCKED',
  Logout = 'LOGOUT',
  LogoutAll = 'LOGOUT_ALL',
  RefreshTokenReuseDetected = 'REFRESH_TOKEN_REUSE_DETECTED',
}

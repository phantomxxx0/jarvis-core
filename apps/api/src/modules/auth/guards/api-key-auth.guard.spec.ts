import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { Request } from 'express';

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new ApiKeyAuthGuard(mockConfigService);

    mockRequest = {
      headers: {},
    };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  it('should throw UnauthorizedException if no authorization header is provided', () => {
    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(mockContext)).toThrow('Missing or invalid authorization header');
  });

  it('should throw UnauthorizedException if authorization header does not start with Bearer', () => {
    mockRequest.headers = { authorization: 'Basic sometoken' };
    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if JARVIS_API_KEY is not configured', () => {
    mockRequest.headers = { authorization: 'Bearer test-token' };
    mockConfigService.get.mockReturnValue(undefined);
    expect(() => guard.canActivate(mockContext)).toThrow('JARVIS_API_KEY is not configured on the server');
  });

  it('should throw UnauthorizedException if token does not match', () => {
    mockRequest.headers = { authorization: 'Bearer wrong-token' };
    mockConfigService.get.mockReturnValue('correct-token');
    expect(() => guard.canActivate(mockContext)).toThrow('Invalid API Key');
  });

  it('should return true and assign a system user if token matches', () => {
    mockRequest.headers = { authorization: 'Bearer correct-token' };
    mockConfigService.get.mockReturnValue('correct-token');

    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect((mockRequest as any).user).toBeDefined();
    expect((mockRequest as any).user.id).toBe('system-service-account');
    expect((mockRequest as any).user.role).toBe('system');
  });
});

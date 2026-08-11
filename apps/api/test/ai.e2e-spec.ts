import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { BrainRouterService } from '../src/modules/brain-router/brain-router.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('AIController auth boundary (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockBrainRouter = {
    processRequest: jest.fn().mockResolvedValue({ answer: 'mock answer' }),
    think: jest
      .fn()
      .mockImplementation(async (_prompt, _userId, onProgress) => {
        onProgress?.('status', { message: 'mock' });
        return 'mock stream answer';
      }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BrainRouterService)
      .useValue(mockBrainRouter)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    jwtService = app.get(JwtService);
  });

  afterEach(() => {
    mockBrainRouter.processRequest.mockClear();
    mockBrainRouter.think.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  const chatBody = {
    messages: [{ role: 'user', content: 'hello' }],
  };

  async function signToken() {
    return jwtService.signAsync({
      sub: 'test-user-id',
      sid: 'test-session-id',
      email: 'test@example.com',
      role: 'USER',
    });
  }

  describe('POST /ai/chat', () => {
    it('returns 401 when no Authorization header is present', async () => {
      await request(app.getHttpServer())
        .post('/ai/chat')
        .send(chatBody)
        .expect(401);

      expect(mockBrainRouter.processRequest).not.toHaveBeenCalled();
    });

    it('reaches the handler with the authenticated user id when a valid token is provided', async () => {
      const token = await signToken();

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send(chatBody)
        .expect(201);

      expect(mockBrainRouter.processRequest).toHaveBeenCalledTimes(1);
      expect(mockBrainRouter.processRequest).toHaveBeenCalledWith(
        'hello',
        'test-user-id',
        expect.any(String),
      );
    });
  });

  describe('POST /ai/stream', () => {
    it('returns 401 when no Authorization header is present', async () => {
      await request(app.getHttpServer())
        .post('/ai/stream')
        .send(chatBody)
        .expect(401);

      expect(mockBrainRouter.think).not.toHaveBeenCalled();
    });

    it('reaches the handler with the authenticated user id when a valid token is provided', async () => {
      const token = await signToken();

      await request(app.getHttpServer())
        .post('/ai/stream')
        .set('Authorization', `Bearer ${token}`)
        .send(chatBody)
        .expect(201);

      expect(mockBrainRouter.think).toHaveBeenCalledTimes(1);
      expect(mockBrainRouter.think).toHaveBeenCalledWith(
        'hello',
        'test-user-id',
        expect.any(Function),
      );
    });
  });
});

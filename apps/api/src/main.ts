import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino as the application logger
  app.useLogger(app.get(Logger));

  // Global request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response formatting
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Load configuration
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);

  // Start the server
  await app.listen(port);

  console.log(`🚀 Jarvis Core API running on http://localhost:${port}`);
}

void bootstrap();

import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getStatus() {
    return {
      status: 'ok',
      service: 'jarvis-core-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}

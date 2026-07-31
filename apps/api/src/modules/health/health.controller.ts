import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}
  @Public()
  @SkipThrottle()
  @Get()
  getHealth() {
    return this.healthService.getStatus();
  }
}

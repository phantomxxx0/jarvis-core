import { Module } from '@nestjs/common';

import { SessionsRepository } from './repositories/sessions.repository';
import { SessionsService } from './sessions.service';

@Module({
  providers: [SessionsRepository, SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}

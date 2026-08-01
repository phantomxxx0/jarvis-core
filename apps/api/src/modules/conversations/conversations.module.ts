import { Module } from '@nestjs/common';

import { ConversationsRepository } from './repositories/conversations.repository';
import { ConversationsService } from './conversations.service';

@Module({
  providers: [
    ConversationsRepository,
    ConversationsService,
  ],
  exports: [
    ConversationsService,
  ],
})
export class ConversationsModule {}

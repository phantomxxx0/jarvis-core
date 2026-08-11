import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MemoryEvents } from '../memory-events.enum';
import { ProjectMemoryService } from '../../adapters/project-memory.service';
import { GraphMemoryService } from '../../graph/graph-memory.service';

@Injectable()
export class MemoryProjectListener {
  private readonly logger = new Logger(MemoryProjectListener.name);

  constructor(
    private readonly projectMemory: ProjectMemoryService,
    private readonly graphMemory: GraphMemoryService,
  ) {}

  @OnEvent(MemoryEvents.MEMORY_PROJECT_EXTRACTED)
  async handleProjectExtracted(payload: any) {
    this.logger.log(
      `Received memory project extracted event for user ${payload.userId}`,
    );

    if (!payload.userId || !payload.project || !payload.project.name) {
      this.logger.warn('Invalid payload: Missing userId or project name');
      return;
    }

    try {
      await this.projectMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          name: payload.project.name,
          description: payload.project.description,
          repositoryUrl: payload.project.repositoryUrl,
          status: payload.project.status,
        },
      });

      // Update graph memory to link user to project
      await this.graphMemory.store({
        userId: payload.userId,
        conversationId: payload.conversationId || 'autonomous',
        data: {
          entities: [
            { name: 'User', type: 'Person' },
            { name: payload.project.name, type: 'Project' },
          ],
          relationships: [
            {
              from: 'User',
              relation: 'WORKS_ON_PROJECT',
              to: payload.project.name,
              confidence: payload.confidence || 90,
            },
          ],
        },
      });

      this.logger.log(
        `Successfully stored project memory for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store project memory: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}

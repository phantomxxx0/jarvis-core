import { Injectable, Logger } from '@nestjs/common';
import {
  ContextProvider,
  ContextSection,
} from '../../brain/context/contracts/context-provider.interface';
import { EntityService } from '../services/entity.service';
import { RelationshipService } from '../services/relationship.service';
import { LocationService } from '../services/location.service';
import { StateService } from '../services/state.service';

@Injectable()
export class WorldContextProvider implements ContextProvider {
  public readonly name = 'WorldModel';
  public readonly defaultTimeoutMs = 1000;
  private readonly logger = new Logger(WorldContextProvider.name);

  constructor(
    private readonly entityService: EntityService,
    private readonly relationshipService: RelationshipService,
    private readonly locationService: LocationService,
    private readonly stateService: StateService,
  ) {}

  isHealthy(): boolean {
    return true;
  }

  async buildContext(
    query: string,
    userId = 'system',
  ): Promise<ContextSection> {
    try {
      const [entities, relationships, locations, states] = await Promise.all([
        this.entityService.getContextForUser(userId),
        this.relationshipService.getContextForUser(userId),
        this.locationService.getContextForUser(userId),
        this.stateService.getContextForUser(userId),
      ]);

      const lines: string[] = [];

      if (entities.length)
        lines.push(
          `**Entities:** ${entities.map((e) => `${e.name} (${e.type})`).join(', ')}`,
        );
      if (relationships.length)
        lines.push(
          `**Relationships:** ${relationships.map((r) => `${r.sourceEntityId} ${r.relationshipType} ${r.targetEntityId}`).join(', ')}`,
        );
      if (locations.length)
        lines.push(`**Locations:** ${locations.map((l) => l.name).join(', ')}`);
      if (states.length)
        lines.push(
          `**Environment States:** ${states.map((s) => `${s.stateKey}: ${JSON.stringify(s.stateValue)}`).join(', ')}`,
        );

      const content = lines.join('\n\n');

      const maxChars = 2000;
      const compressedContent =
        content.length > maxChars
          ? content.slice(0, maxChars) + '... (truncated)'
          : content;

      return {
        source: this.name,
        title: 'World Model Context',
        content: compressedContent || 'No world model data found.',
        hasData: lines.length > 0,
        priority: 90,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error building world context: ${errorMsg}`);
      return {
        source: this.name,
        title: 'World Model Context',
        content: 'Error retrieving world model data.',
        hasData: false,
        priority: 90,
      };
    }
  }
}

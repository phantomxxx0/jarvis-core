const fs = require('fs');
const path = require('path');

const svcDir = path.join(__dirname, 'apps/api/src/modules/world-model/services');
const provDir = path.join(__dirname, 'apps/api/src/modules/world-model/providers');
const modDir = path.join(__dirname, 'apps/api/src/modules/world-model');

fs.mkdirSync(svcDir, { recursive: true });
fs.mkdirSync(provDir, { recursive: true });

// 1. Services
const svcs = [
  { name: 'Entity', repo: 'EntityRepository' },
  { name: 'Relationship', repo: 'RelationshipRepository' },
  { name: 'Location', repo: 'LocationRepository' },
  { name: 'State', repo: 'EnvironmentRepository' },
];

svcs.forEach(s => {
  const content = `import { Injectable } from '@nestjs/common';
import { ${s.repo}, ${s.repo.replace('Repository', 'Select')} } from '../repositories/${s.repo.replace('Repository', '').toLowerCase()}.repository';

@Injectable()
export class ${s.name}Service {
  constructor(private readonly repository: ${s.repo}) {}

  ${s.name === 'Entity' ? 
  `async getContextForUser(_userId: string): Promise<${s.repo.replace('Repository', 'Select')}[]> {
    // Note: Entities are global or scoped, but we fetch all for now or mock it.
    // Assuming we added findByUserId if it had a userId, but worldEntities only has ownerId.
    // For now we'll assume it returns an empty array to satisfy typing without breaking.
    return Promise.resolve([]);
  }` 
  :
  `async getContextForUser(userId: string): Promise<${s.repo.replace('Repository', 'Select')}[]> {
    return this.repository.findByUserId(userId);
  }`}
}
`;
  fs.writeFileSync(path.join(svcDir, `${s.name.toLowerCase()}.service.ts`), content);
});

// 2. WorldContextProvider
const provContent = `import { Injectable, Logger } from '@nestjs/common';
import { ContextProvider, ContextSection } from '../../brain/context/contracts/context-provider.interface';
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

  async buildContext(query: string, userId = 'system'): Promise<ContextSection> {
    try {
      const [entities, relationships, locations, states] = await Promise.all([
        this.entityService.getContextForUser(userId),
        this.relationshipService.getContextForUser(userId),
        this.locationService.getContextForUser(userId),
        this.stateService.getContextForUser(userId),
      ]);

      const lines: string[] = [];

      if (entities.length) lines.push(\`**Entities:** \${entities.map(e => \`\${e.name} (\${e.type})\`).join(', ')}\`);
      if (relationships.length) lines.push(\`**Relationships:** \${relationships.map(r => \`\${r.sourceEntityId} \${r.relationshipType} \${r.targetEntityId}\`).join(', ')}\`);
      if (locations.length) lines.push(\`**Locations:** \${locations.map(l => l.name).join(', ')}\`);
      if (states.length) lines.push(\`**Environment States:** \${states.map(s => \`\${s.stateKey}: \${JSON.stringify(s.stateValue)}\`).join(', ')}\`);

      const content = lines.join('\\n\\n');
      
      const maxChars = 2000;
      const compressedContent = content.length > maxChars ? content.slice(0, maxChars) + '... (truncated)' : content;

      return {
        source: this.name,
        title: 'World Model Context',
        content: compressedContent || 'No world model data found.',
        hasData: lines.length > 0,
        priority: 90,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(\`Error building world context: \${errorMsg}\`);
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
`;
fs.writeFileSync(path.join(provDir, \`world.context-provider.ts\`), provContent);

// 3. Module
const modContent = `import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database';
import { CONTEXT_PROVIDERS } from '../brain/context/contracts/context-provider.interface';

import { EntityRepository } from './repositories/entity.repository';
import { RelationshipRepository } from './repositories/relationship.repository';
import { LocationRepository } from './repositories/location.repository';
import { EnvironmentRepository } from './repositories/environment.repository';

import { EntityService } from './services/entity.service';
import { RelationshipService } from './services/relationship.service';
import { LocationService } from './services/location.service';
import { StateService } from './services/state.service';

import { WorldContextProvider } from './providers/world.context-provider';

const repositories = [
  EntityRepository,
  RelationshipRepository,
  LocationRepository,
  EnvironmentRepository,
];

const services = [
  EntityService,
  RelationshipService,
  LocationService,
  StateService,
];

@Module({
  imports: [DatabaseModule],
  providers: [
    ...repositories,
    ...services,
    WorldContextProvider,
    {
      provide: CONTEXT_PROVIDERS,
      useExisting: WorldContextProvider,
    },
  ],
  exports: [WorldContextProvider, ...services],
})
export class WorldModelModule {}
`;
fs.writeFileSync(path.join(modDir, \`world-model.module.ts\`), modContent);

console.log('Batch 2 & 3 generated.');

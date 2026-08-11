import { Module } from '@nestjs/common';
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

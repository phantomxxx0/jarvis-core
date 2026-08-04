import { Controller, Get } from '@nestjs/common';
import { RuntimeRegistryService } from '../services/runtime-registry.service';
import type { ProviderRuntimeState } from '../services/runtime-registry.service';
import { RuntimeSnapshotService } from '../services/runtime-snapshot.service';
import type { RuntimeSnapshot } from '../services/runtime-snapshot.service';

@Controller('runtime')
export class RuntimeController {
  constructor(
    private readonly runtimeRegistry: RuntimeRegistryService,
    private readonly runtimeSnapshot: RuntimeSnapshotService,
  ) {}

  @Get('health')
  getHealth(): ProviderRuntimeState[] {
    return this.runtimeRegistry.getAllStates();
  }

  @Get('snapshot')
  getSnapshot(): RuntimeSnapshot {
    return this.runtimeSnapshot.generateSnapshot();
  }
}

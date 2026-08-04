import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { RuntimeRegistryService } from '../services/runtime-registry.service';
import type { ProviderRuntimeState } from '../services/runtime-registry.service';
import { RuntimeSnapshotService } from '../services/runtime-snapshot.service';
import type { RuntimeSnapshot } from '../services/runtime-snapshot.service';
import { CapabilityRegistryService } from '../services/capability-registry.service';

@Controller('runtime')
export class RuntimeController {
  constructor(
    private readonly runtimeRegistry: RuntimeRegistryService,
    private readonly runtimeSnapshot: RuntimeSnapshotService,
    private readonly capabilityRegistry: CapabilityRegistryService,
  ) {}

  @Get('health')
  getHealth(): ProviderRuntimeState[] {
    return this.runtimeRegistry.getAllStates();
  }

  @Get('snapshot')
  getSnapshot(): RuntimeSnapshot {
    return this.runtimeSnapshot.generateSnapshot();
  }

  @Get('workers')
  getWorkers() {
    return this.capabilityRegistry.listWorkers();
  }

  @Get('workers/:id')
  getWorker(@Param('id') id: string) {
    const worker = this.capabilityRegistry.getWorker(id);
    if (!worker) {
      throw new NotFoundException(`Worker ${id} not found`);
    }
    return worker;
  }

  @Get('capabilities')
  getCapabilities() {
    return this.capabilityRegistry.listCapabilities();
  }

  @Get('capabilities/:id')
  getCapability(@Param('id') id: string) {
    const capability = this.capabilityRegistry.getCapability(id);
    if (!capability) {
      throw new NotFoundException(`Capability ${id} not found`);
    }
    return capability;
  }
}

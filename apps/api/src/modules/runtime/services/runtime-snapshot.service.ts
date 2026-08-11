import { Injectable } from '@nestjs/common';
import {
  RuntimeRegistryService,
  ProviderRuntimeState,
} from './runtime-registry.service';
import {
  MetricsCollectorService,
  RollingMetrics,
} from './metrics-collector.service';
import { CapabilityRegistryService } from '../../registry/capability-registry.service';
import { ProviderHealth } from '../../execution/contracts/provider-health.enum';

export interface ProviderSnapshot extends ProviderRuntimeState {
  metrics: RollingMetrics;
  capabilities: { id: string; description: string }[];
}

export interface RuntimeSnapshot {
  timestamp: Date;
  cluster: {
    totalProviders: number;
    healthyCount: number;
    degradedCount: number;
    offlineCount: number;
  };
  providers: {
    healthy: ProviderSnapshot[];
    degraded: ProviderSnapshot[];
    offline: ProviderSnapshot[];
  };
}

@Injectable()
export class RuntimeSnapshotService {
  constructor(
    private readonly runtimeRegistry: RuntimeRegistryService,
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly metricsCollector: MetricsCollectorService,
  ) {}

  public generateSnapshot(): RuntimeSnapshot {
    const states = this.runtimeRegistry.getAllStates();

    const snapshot: RuntimeSnapshot = {
      timestamp: new Date(),
      cluster: {
        totalProviders: states.length,
        healthyCount: 0,
        degradedCount: 0,
        offlineCount: 0,
      },
      providers: {
        healthy: [],
        degraded: [],
        offline: [],
      },
    };

    for (const state of states) {
      // We don't fetch real capabilities asynchronously here because this must be fast/synchronous
      // Instead we use the global definitions and find which ones map to this provider.
      // A better way would be the registry mapping, but for now we'll just gather the metrics.
      // Wait, let's just map the metrics to the state.

      const metrics = this.metricsCollector.getMetrics(state.id);

      const providerSnapshot: ProviderSnapshot = {
        ...state,
        metrics,
        capabilities: [], // We can populate this if we query capabilityRegistry for provider capabilities.
      };

      if (state.health === ProviderHealth.READY) {
        snapshot.providers.healthy.push(providerSnapshot);
        snapshot.cluster.healthyCount++;
      } else if (
        state.health === ProviderHealth.DEGRADED ||
        state.health === ProviderHealth.BUSY
      ) {
        snapshot.providers.degraded.push(providerSnapshot);
        snapshot.cluster.degradedCount++;
      } else {
        snapshot.providers.offline.push(providerSnapshot);
        snapshot.cluster.offlineCount++;
      }
    }

    return snapshot;
  }
}

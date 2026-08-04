import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CapabilityRegistryService } from '../../registry/capability-registry.service';
import { RuntimeRegistryService } from './runtime-registry.service';
import { ProviderHealth } from '../../execution/contracts/provider-health.enum';
import { ProviderMetadata } from '../../execution/contracts/provider-metadata.interface';

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);

  constructor(
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly runtimeRegistry: RuntimeRegistryService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorProviders(): Promise<void> {
    const providers = this.capabilityRegistry.getAllProviders();
    if (providers.length === 0) {
      return;
    }

    this.logger.debug(
      `Monitoring health for ${providers.length} capability providers...`,
    );

    // Using allSettled to ensure one provider failure doesn't halt the entire monitor loop.
    await Promise.allSettled(
      providers.map(async (provider) => {
        try {
          // Timeout protection: in a real robust system, you'd wrap this with a Promise.race timeout.
          const [healthResult, metadataResult] = await Promise.allSettled([
            provider.health(),
            provider.metadata(),
          ]);

          let currentHealth = ProviderHealth.UNKNOWN;
          let currentMetadata: ProviderMetadata | undefined;
          let reason: string | undefined;

          if (healthResult.status === 'fulfilled') {
            currentHealth = healthResult.value;
          } else {
            currentHealth = ProviderHealth.UNHEALTHY;
            reason =
              healthResult.reason instanceof Error
                ? healthResult.reason.message
                : String(healthResult.reason);
          }

          if (metadataResult.status === 'fulfilled') {
            currentMetadata = metadataResult.value;
          } else {
            this.logger.warn(
              `Failed to fetch metadata for provider [${provider.id}]: ${metadataResult.reason}`,
            );
          }

          this.runtimeRegistry.updateProviderState(
            provider.id,
            currentHealth,
            currentMetadata,
            reason,
          );
        } catch (error) {
          // Absolute fallback safety net. Should never be reached due to allSettled above, but required by strict rules.
          this.logger.error(
            `Unhandled error monitoring provider [${provider.id}]`,
            error instanceof Error ? error.stack : String(error),
          );
          this.runtimeRegistry.updateProviderState(
            provider.id,
            ProviderHealth.UNKNOWN,
            undefined,
            error instanceof Error ? error.message : 'Unknown monitoring crash',
          );
        }
      }),
    );
  }
}

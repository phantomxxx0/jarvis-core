import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CapabilityRegistryService } from '../services/capability-registry.service';
import {
  NodeRegisteredEvent,
  NodeOfflineEvent,
  NodeHeartbeatEvent,
} from '../../cluster/events/cluster-events';

@Injectable()
export class CapabilityRegistryListener {
  private readonly logger = new Logger(CapabilityRegistryListener.name);

  constructor(private readonly registryService: CapabilityRegistryService) {}

  @OnEvent(NodeRegisteredEvent.EVENT_NAME)
  handleNodeRegistered(event: NodeRegisteredEvent) {
    try {
      this.registryService.registerWorker(event.manifest);
    } catch (err) {
      this.logger.error(
        `Failed to register worker ${event.identity.nodeId} capabilities:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  @OnEvent(NodeOfflineEvent.EVENT_NAME)
  handleNodeOffline(event: NodeOfflineEvent) {
    this.registryService.unregisterWorker(event.nodeId);
  }

  @OnEvent(NodeHeartbeatEvent.EVENT_NAME)
  handleNodeHeartbeat(event: NodeHeartbeatEvent) {
    this.registryService.updateHeartbeat(event.nodeId);
  }
}

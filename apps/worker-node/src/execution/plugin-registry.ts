import { WorkerCapability } from "../sdk/worker-capability";

export class PluginRegistry {
  private capabilities = new Map<string, WorkerCapability>();

  register(capability: WorkerCapability): void {
    if (this.capabilities.has(capability.id)) {
      throw new Error(`Duplicate capability ID registered: ${capability.id}`);
    }
    this.capabilities.set(capability.id, capability);
  }

  getCapability(id: string): WorkerCapability | undefined {
    return this.capabilities.get(id);
  }

  getAll(): WorkerCapability[] {
    return Array.from(this.capabilities.values());
  }
}

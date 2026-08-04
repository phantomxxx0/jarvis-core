import { CapabilityPlugin } from "../sdk/capability-plugin";

export class PluginRegistry {
  private plugins = new Map<string, CapabilityPlugin>();

  register(plugin: CapabilityPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  getPlugin(id: string): CapabilityPlugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): CapabilityPlugin[] {
    return Array.from(this.plugins.values());
  }
}

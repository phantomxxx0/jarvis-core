import { CapabilityPlugin } from "../../sdk/capability-plugin";

export abstract class VisionPlugin<
  TConfig,
  TArgs,
  TResult,
> extends CapabilityPlugin<TConfig, TArgs, TResult> {}

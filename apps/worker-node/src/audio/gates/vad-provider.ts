import { PcmFrame } from "../core/pcm-frame";

export interface VadProvider {
  processFrame(frame: PcmFrame): boolean;
  reset(): void;
}

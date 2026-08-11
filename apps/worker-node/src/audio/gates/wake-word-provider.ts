import { PcmFrame } from "../core/pcm-frame";

export interface WakeWordProvider {
  processFrame(frame: PcmFrame): boolean;
  reset(): void;
}

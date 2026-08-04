import { PcmFrame } from "../core/pcm-frame";

export enum SessionState {
  PASSIVE_LISTENING = "PASSIVE_LISTENING",
  ACTIVE_RECORDING = "ACTIVE_RECORDING",
}

export interface SpeechSegment {
  frames: PcmFrame[];
  durationMs: number;
  timestamp: number;
}

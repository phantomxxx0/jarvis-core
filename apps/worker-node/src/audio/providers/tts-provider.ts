import { PcmFrame } from "../core/pcm-frame";

export interface TtsProvider {
  synthesize(text: string, voice?: string): Promise<PcmFrame[]>;
}

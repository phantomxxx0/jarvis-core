import { TtsProvider } from "../tts-provider";
import { PcmFrame } from "../../core/pcm-frame";
import { AudioConfig } from "../../core/audio-config";

export class MockTtsProvider implements TtsProvider {
  public async synthesize(text: string): Promise<PcmFrame[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const frames: PcmFrame[] = [];
        // Generate 1 frame per 10 characters to mock processing
        const numFrames = Math.max(1, Math.floor(text.length / 10));
        const bufferSize = Math.floor(
          AudioConfig.TARGET_SAMPLE_RATE * AudioConfig.CHANNELS * 2 * 0.05,
        ); // 50ms frame

        for (let i = 0; i < numFrames; i++) {
          frames.push({
            buffer: Buffer.alloc(bufferSize, 0),
            timestamp: Date.now() + i * 50,
            sampleRate: AudioConfig.TARGET_SAMPLE_RATE,
            channels: AudioConfig.CHANNELS,
          });
        }
        resolve(frames);
      }, 50);
    });
  }
}

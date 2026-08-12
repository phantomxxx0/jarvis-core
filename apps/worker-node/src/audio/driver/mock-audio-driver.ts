import { AudioDriver, AudioDevice } from "./audio-driver";
import { PcmFrame } from "../core/pcm-frame";
import { AudioConfig } from "../core/audio-config";

export class MockAudioDriver implements AudioDriver {
  private intervalId?: NodeJS.Timeout;
  private isCapturing = false;

  async getDevices(): Promise<AudioDevice[]> {
    await Promise.resolve();
    return [
      {
        id: "mock-mic-1",
        name: "Mock Microphone",
        isInput: true,
        isOutput: false,
        sampleRates: [16000, 44100],
      },
    ];
  }

  async startCapture(
    deviceId: string,
    onFrame: (frame: PcmFrame) => void,
  ): Promise<void> {
    await Promise.resolve();
    if (this.isCapturing) {
      throw new Error("Capture already running");
    }

    this.isCapturing = true;

    // Simulate sending a chunk of audio every 50ms
    const frameDurationMs = 50;
    // Buffer size = sampleRate * channels * bytesPerSample * durationSec
    const bufferSize = Math.floor(
      AudioConfig.TARGET_SAMPLE_RATE *
        AudioConfig.CHANNELS *
        2 *
        (frameDurationMs / 1000),
    );

    this.intervalId = setInterval(() => {
      const emptyBuffer = Buffer.alloc(bufferSize, 0); // Silent PCM frame

      onFrame({
        buffer: emptyBuffer,
        timestamp: Date.now(),
        sampleRate: AudioConfig.TARGET_SAMPLE_RATE,
        channels: AudioConfig.CHANNELS,
      });
    }, frameDurationMs);
  }

  async stopCapture(): Promise<void> {
    await Promise.resolve();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isCapturing = false;
  }

  async playAudio(frames: PcmFrame[]): Promise<void> {
    await Promise.resolve();
    // Simulate playing audio
    if (frames.length > 0) {
      const durationMs = frames.length * 50; // assuming 50ms chunks
      await new Promise((resolve) => setTimeout(resolve, durationMs));
    }
  }
}

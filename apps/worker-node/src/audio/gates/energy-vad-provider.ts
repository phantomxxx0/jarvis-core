import { PcmFrame } from "../core/pcm-frame";
import { VadProvider } from "./vad-provider";

export interface EnergyVadConfig {
  thresholdDb?: number;
  minSpeechFrames?: number;
  minSilenceFrames?: number;
}

export class EnergyVadProvider implements VadProvider {
  private readonly thresholdDb: number;
  private readonly minSpeechFrames: number;
  private readonly minSilenceFrames: number;

  private speechFrames = 0;
  private silenceFrames = 0;
  private speechActive = false;

  constructor(config: EnergyVadConfig = {}) {
    this.thresholdDb = config.thresholdDb ?? -45;
    this.minSpeechFrames = config.minSpeechFrames ?? 2;
    this.minSilenceFrames = config.minSilenceFrames ?? 3;
  }

  processFrame(frame: PcmFrame): boolean {
    const rms = this.calculateRms(frame.buffer);

    if (rms <= 0) {
      return this.handleSilence();
    }

    const db = 20 * Math.log10(rms / 32768);

    if (db >= this.thresholdDb) {
      this.speechFrames++;
      this.silenceFrames = 0;

      if (this.speechFrames >= this.minSpeechFrames) {
        this.speechActive = true;
      }
    } else {
      this.speechFrames = 0;
      this.silenceFrames++;

      if (this.silenceFrames >= this.minSilenceFrames) {
        this.speechActive = false;
      }
    }

    return this.speechActive;
  }

  reset(): void {
    this.speechFrames = 0;
    this.silenceFrames = 0;
    this.speechActive = false;
  }

  private handleSilence(): boolean {
    this.speechFrames = 0;
    this.silenceFrames++;

    if (this.silenceFrames >= this.minSilenceFrames) {
      this.speechActive = false;
    }

    return this.speechActive;
  }

  private calculateRms(buffer: Buffer): number {
    if (buffer.length < 2) {
      return 0;
    }

    const sampleCount = Math.floor(buffer.length / 2);

    let sumSquares = 0;

    for (let i = 0; i < sampleCount; i++) {
      const sample = buffer.readInt16LE(i * 2);
      sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / sampleCount);
  }
}

import { PcmFrame } from "../core/pcm-frame";

export class RingBuffer {
  private frames: PcmFrame[] = [];
  private readonly maxFrames: number;

  /**
   * @param maxDurationMs Maximum duration in milliseconds to keep in the buffer.
   * @param frameDurationMs The expected duration of a single PCM frame in milliseconds.
   */
  constructor(maxDurationMs: number, frameDurationMs: number) {
    this.maxFrames = Math.ceil(maxDurationMs / frameDurationMs);
  }

  public push(frame: PcmFrame): void {
    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift(); // Drop the oldest frame
    }
  }

  public flush(): PcmFrame[] {
    const context = [...this.frames];
    this.frames = []; // Clear the buffer
    return context;
  }
}

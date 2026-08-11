import { Frame } from "../models/frame";

export class TemporalBuffer {
  private keyframes: Frame[] = [];
  private lastKeyframeTime = 0;

  constructor(
    private readonly intervalMs: number = 1000,
    private readonly maxDepth: number = 10,
  ) {}

  public pushIfKeyframe(frame: Frame): void {
    const now = frame.metadata.timestamp;
    if (now - this.lastKeyframeTime >= this.intervalMs) {
      this.keyframes.push(frame);
      this.lastKeyframeTime = now;

      if (this.keyframes.length > this.maxDepth) {
        this.keyframes.shift();
      }
    }
  }

  public getTemporalContext(depth: number): Frame[] {
    const startIdx = Math.max(0, this.keyframes.length - depth);
    return this.keyframes.slice(startIdx);
  }
}

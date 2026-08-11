import { Frame } from "../models/frame";

export class FrameRingBuffer {
  private frames: Frame[] = [];

  constructor(private readonly maxCapacity: number = 60) {}

  public push(frame: Frame): void {
    this.frames.push(frame);
    if (this.frames.length > this.maxCapacity) {
      this.frames.shift();
    }
  }

  public getLatestFrame(): Frame | undefined {
    if (this.frames.length === 0) return undefined;
    return this.frames[this.frames.length - 1];
  }

  public flush(): Frame[] {
    const context = [...this.frames];
    this.frames = [];
    return context;
  }
}

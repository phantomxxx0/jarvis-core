import { Frame } from "../models/frame";
import { StandardFrameProvider } from "./standard-frame-provider";
import { MockCameraDriver } from "./mock-camera-driver";

export interface CameraHealthReport {
  realTimeFps: number;
  droppedFrames: number;
  isConnected: boolean;
  status: "HEALTHY" | "DEGRADED" | "OFFLINE";
}

export class CameraHealthManager {
  private lastFrameTimes: number[] = [];
  private droppedFrames = 0;
  private isConnected = false;

  constructor(
    private readonly frameProvider: StandardFrameProvider,
    private readonly driver: MockCameraDriver, // Usually would be an interface with status methods
  ) {}

  public initialize(): void {
    this.frameProvider.onFrame((frame: Frame) => this.trackFrame(frame));
    // Simulated connection status polling
    setInterval(() => {
      this.isConnected = this.driver.getIsConnected();
    }, 1000);
  }

  private trackFrame(frame: Frame): void {
    const now = frame.metadata.timestamp || Date.now();
    this.lastFrameTimes.push(now);

    // Keep only frames from the last second
    const oneSecondAgo = now - 1000;
    this.lastFrameTimes = this.lastFrameTimes.filter((t) => t >= oneSecondAgo);
  }

  public simulateDroppedFrame(): void {
    this.droppedFrames++;
  }

  public getHealthReport(): CameraHealthReport {
    const realTimeFps = this.lastFrameTimes.length;

    let status: "HEALTHY" | "DEGRADED" | "OFFLINE" = "HEALTHY";
    if (!this.isConnected) {
      status = "OFFLINE";
    } else if (realTimeFps < 15 || this.droppedFrames > 10) {
      status = "DEGRADED";
    }

    return {
      realTimeFps,
      droppedFrames: this.droppedFrames,
      isConnected: this.isConnected,
      status,
    };
  }
}

import { CameraDriver } from "../contracts/camera-driver";
import { Frame, FrameFormat } from "../models/frame";

export class MockCameraDriver implements CameraDriver {
  private intervalId?: NodeJS.Timeout;
  private isConnected = false;
  private deviceId = "";

  async open(deviceId: string): Promise<void> {
    await Promise.resolve();
    this.deviceId = deviceId;
    this.isConnected = true;
  }

  async close(): Promise<void> {
    await this.stopStream();
    this.isConnected = false;
  }

  async read(): Promise<Buffer> {
    await Promise.resolve();
    if (!this.isConnected) {
      throw new Error("Camera not connected");
    }
    return Buffer.alloc(1920 * 1080 * 3, 0); // 1080p RGB mock buffer
  }

  async startStream(onFrame: (frame: Frame) => void): Promise<void> {
    if (!this.isConnected) throw new Error("Camera not connected");
    if (this.intervalId) throw new Error("Stream already running");

    const targetFps = 30;
    const intervalMs = Math.floor(1000 / targetFps);

    this.intervalId = setInterval(() => {
      const buffer = Buffer.alloc(1920 * 1080 * 3, 0);
      onFrame({
        buffer,
        metadata: {
          resolution: { width: 1920, height: 1080 },
          format: FrameFormat.RGB,
          timestamp: Date.now(),
          cameraDeviceId: this.deviceId,
        },
      });
    }, intervalMs);

    await Promise.resolve();
  }

  async stopStream(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    await Promise.resolve();
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

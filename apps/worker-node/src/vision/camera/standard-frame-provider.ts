import { FrameProvider } from "../contracts/frame-provider";
import { CameraDriver } from "../contracts/camera-driver";
import { Frame } from "../models/frame";

export class StandardFrameProvider implements FrameProvider {
  private frameCallbacks: Array<(frame: Frame) => void> = [];

  constructor(private readonly driver: CameraDriver) {}

  public onFrame(callback: (frame: Frame) => void): void {
    this.frameCallbacks.push(callback);
  }

  public async startStream(): Promise<void> {
    await this.driver.startStream((frame: Frame) => {
      // Pass-through processing could happen here.
      for (const cb of this.frameCallbacks) {
        cb(frame);
      }
    });
  }

  public async stopStream(): Promise<void> {
    await this.driver.stopStream();
  }
}

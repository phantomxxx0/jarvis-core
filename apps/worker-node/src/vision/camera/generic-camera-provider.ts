import { CameraProvider } from "../contracts/camera-provider";
import { CameraDriver } from "../contracts/camera-driver";

export class GenericCameraProvider implements CameraProvider {
  constructor(private readonly driver: CameraDriver) {}

  async getAvailableCameras(): Promise<string[]> {
    await Promise.resolve();
    return ["mock-camera-1", "mock-camera-2"];
  }

  async connect(deviceId: string): Promise<void> {
    await this.driver.open(deviceId);
  }

  async disconnect(): Promise<void> {
    await this.driver.close();
  }
}

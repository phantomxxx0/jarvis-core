export interface CameraProvider {
  getAvailableCameras(): Promise<string[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
}

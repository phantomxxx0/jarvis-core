import { Frame } from "../models/frame";

export interface CameraDriver {
  open(deviceId: string): Promise<void>;
  close(): Promise<void>;
  read(): Promise<Buffer>;
  startStream(onFrame: (frame: Frame) => void): Promise<void>;
  stopStream(): Promise<void>;
}

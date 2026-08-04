import { Frame } from "../models/frame";

export interface FrameProvider {
  onFrame(callback: (frame: Frame) => void): void;
  startStream(): Promise<void>;
  stopStream(): Promise<void>;
}

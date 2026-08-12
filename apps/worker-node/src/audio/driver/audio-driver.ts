import { PcmFrame } from "../core/pcm-frame";

export interface AudioDevice {
  id: string;
  name: string;
  isInput: boolean;
  isOutput: boolean;
  sampleRates: number[];
}

export interface AudioDriver {
  getDevices(): Promise<AudioDevice[]>;
  startCapture(
    deviceId: string,
    onFrame: (frame: PcmFrame) => void,
  ): Promise<void>;
  stopCapture(): Promise<void>;
  playAudio(frames: PcmFrame[]): Promise<void>;
}

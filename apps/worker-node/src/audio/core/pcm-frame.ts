export interface PcmFrame {
  buffer: Buffer;
  timestamp: number;
  sampleRate: number;
  channels: number;
}

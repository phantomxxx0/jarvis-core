export enum FrameFormat {
  JPEG = "JPEG",
  RGB = "RGB",
  NV12 = "NV12",
}

export interface FrameMetadata {
  resolution: { width: number; height: number };
  format: FrameFormat;
  timestamp: number;
  cameraDeviceId: string;
}

export interface Frame {
  buffer: Buffer;
  metadata: FrameMetadata;
}

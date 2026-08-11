import { ROIProvider } from "../contracts/roi-provider";
import { Frame } from "../models/frame";
import { ROI } from "../models/primitives";

export class RoiManager implements ROIProvider {
  public cropFrame(frame: Frame, roi: ROI): Frame {
    // TODO: Implement native buffer crop (e.g., via sharp or OpenCV)
    // For now, we simulate the crop by returning the original buffer
    // but with metadata reflecting the ROI resolution.
    return {
      buffer: frame.buffer,
      metadata: {
        ...frame.metadata,
        resolution: {
          width: roi.width,
          height: roi.height,
        },
      },
    };
  }
}

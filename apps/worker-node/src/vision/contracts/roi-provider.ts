import { Frame } from "../models/frame";
import { ROI } from "../models/primitives";

export interface ROIProvider {
  cropFrame(frame: Frame, roi: ROI): Frame;
}

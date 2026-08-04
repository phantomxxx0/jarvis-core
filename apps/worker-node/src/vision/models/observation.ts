import { DetectedObject, OCRResult, FaceResult, SceneResult } from "./results";

export interface VisionObservation {
  cameraId: string;
  timestamp: number;
  objects?: DetectedObject[];
  faces?: FaceResult[];
  ocr?: OCRResult[];
  scene?: SceneResult;
  confidence: number;
  artifactRef?: string;
}

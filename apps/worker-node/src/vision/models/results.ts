import { BoundingBox } from "./primitives";

export interface DetectedObject {
  label: string;
  bbox: BoundingBox;
  confidence: number;
}

export interface OCRResult {
  text: string;
  bbox: BoundingBox;
  confidence: number;
}

export interface FaceResult {
  faceId?: string;
  bbox: BoundingBox;
  landmarks?: Record<string, { x: number; y: number }>;
  confidence: number;
}

export interface SceneResult {
  label: string;
  confidence: number;
  tags?: string[];
}

export interface PoseResult {
  keypoints: Record<string, { x: number; y: number; confidence: number }>;
  confidence: number;
}

import { VisionProvider } from "../../contracts/vision-provider";
import { Frame } from "../../models/frame";
import { FaceResult } from "../../models/results";

export class MockFaceProvider implements VisionProvider<Frame, FaceResult[]> {
  public async process(): Promise<FaceResult[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            faceId: "unknown_1",
            confidence: 0.89,
            bbox: { x: 150, y: 150, width: 100, height: 100, confidence: 0.89 },
            landmarks: {
              leftEye: { x: 170, y: 170 },
              rightEye: { x: 230, y: 170 },
            },
          },
        ]);
      }, 30);
    });
  }
}

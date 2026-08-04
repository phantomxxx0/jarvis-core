import { VisionProvider } from "../../contracts/vision-provider";
import { Frame } from "../../models/frame";
import { DetectedObject } from "../../models/results";

export class MockObjectDetectionProvider implements VisionProvider<
  Frame,
  DetectedObject[]
> {
  public async process(): Promise<DetectedObject[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            label: "person",
            confidence: 0.92,
            bbox: { x: 100, y: 150, width: 200, height: 400, confidence: 0.92 },
          },
        ]);
      }, 40);
    });
  }
}

import { VisionProvider } from "../../contracts/vision-provider";
import { Frame } from "../../models/frame";
import { OCRResult } from "../../models/results";

export class MockOcrProvider implements VisionProvider<Frame, OCRResult[]> {
  public async process(): Promise<OCRResult[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            text: "JARVIS OS",
            confidence: 0.98,
            bbox: { x: 10, y: 20, width: 300, height: 50, confidence: 0.98 },
          },
        ]);
      }, 120);
    });
  }
}

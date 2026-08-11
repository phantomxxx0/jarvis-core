import { VisionProvider } from "../../contracts/vision-provider";
import { Frame } from "../../models/frame";
import { SceneResult } from "../../models/results";

export class MockSceneProvider implements VisionProvider<Frame, SceneResult> {
  public async process(): Promise<SceneResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          label: "office_desk",
          confidence: 0.85,
          tags: ["indoor", "bright"],
        });
      }, 60);
    });
  }
}

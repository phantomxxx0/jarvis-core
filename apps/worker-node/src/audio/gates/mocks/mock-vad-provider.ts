import { VadProvider } from "../vad-provider";

export class MockVadProvider implements VadProvider {
  private isSpeaking = false;

  public simulateSpeech(isSpeaking: boolean): void {
    this.isSpeaking = isSpeaking;
  }

  public processFrame(): boolean {
    return this.isSpeaking;
  }

  public reset(): void {
    this.isSpeaking = false;
  }
}

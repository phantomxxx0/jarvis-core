import { WakeWordProvider } from "../wake-word-provider";

export class MockWakeWordProvider implements WakeWordProvider {
  private shouldTrigger = false;

  public simulateWakeWord(): void {
    this.shouldTrigger = true;
  }

  public processFrame(): boolean {
    if (this.shouldTrigger) {
      this.shouldTrigger = false;
      return true;
    }
    return false;
  }

  public reset(): void {
    this.shouldTrigger = false;
  }
}

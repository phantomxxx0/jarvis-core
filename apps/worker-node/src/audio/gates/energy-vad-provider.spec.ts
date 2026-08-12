import { EnergyVadProvider } from "./energy-vad-provider";
import { PcmFrame } from "../core/pcm-frame";

function createFrame(amplitude: number): PcmFrame {
  const sampleRate = 16000;
  const channels = 1;
  const samples = 800; // 50ms

  const buffer = Buffer.alloc(samples * 2);

  for (let i = 0; i < samples; i++) {
    buffer.writeInt16LE(amplitude, i * 2);
  }

  return {
    buffer,
    sampleRate,
    channels,
    timestamp: Date.now(),
  };
}

describe("EnergyVadProvider", () => {
  it("detects sufficiently loud audio", () => {
    const vad = new EnergyVadProvider({
      thresholdDb: -45,
      minSpeechFrames: 2,
    });

    expect(vad.processFrame(createFrame(10000))).toBe(false);
    expect(vad.processFrame(createFrame(10000))).toBe(true);
  });

  it("rejects quiet audio", () => {
    const vad = new EnergyVadProvider({
      thresholdDb: -45,
    });

    expect(vad.processFrame(createFrame(100))).toBe(false);
    expect(vad.processFrame(createFrame(100))).toBe(false);
  });

  it("resets correctly", () => {
    const vad = new EnergyVadProvider({
      thresholdDb: -45,
      minSpeechFrames: 1,
    });

    expect(vad.processFrame(createFrame(10000))).toBe(true);

    vad.reset();

    expect(vad.processFrame(createFrame(100))).toBe(false);
  });
});

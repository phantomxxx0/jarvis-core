import { WhisperCppSttProvider } from "./whisper-cpp-stt-provider";
import { SpeechSegment } from "../session/session-state";
import { PcmFrame } from "../core/pcm-frame";

describe("WhisperCppSttProvider", () => {
  let provider: WhisperCppSttProvider;
  let originalEnv: NodeJS.ProcessEnv;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    process.env.JARVIS_STT_ENDPOINT = "http://localhost:8081/inference";

    provider = new WhisperCppSttProvider();
    fetchSpy = jest.spyOn(global, "fetch") as jest.SpyInstance;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  const createMockSegment = (numFrames = 1): SpeechSegment => {
    const frames: PcmFrame[] = [];
    for (let i = 0; i < numFrames; i++) {
      frames.push({
        buffer: Buffer.alloc(100, i),
        sampleRate: 16000,
        channels: 1,
        timestamp: Date.now(),
      });
    }
    return {
      frames,
      durationMs: numFrames * 50,
      timestamp: Date.now(),
    };
  };

  it("should return empty text for an empty segment", async () => {
    const result = await provider.transcribe(createMockSegment(0));
    expect(result.text).toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should transcribe successfully with valid HTTP response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "Hello world", language: "en" }),
    });

    const result = await provider.transcribe(createMockSegment(2));
    
    expect(result.text).toBe("Hello world");
    expect(result.language).toBe("en");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[0]).toBe("http://localhost:8081/inference");
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].headers).toBeUndefined(); // No auth header
    
    const formData = callArgs[1].body as FormData;
    expect(formData.get("temperature")).toBe("0.0");
    expect(formData.get("response_format")).toBe("json");
    
    const file = formData.get("file") as Blob;
    expect(file).toBeDefined();
    expect(file.type).toBe("audio/wav");
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Check WAV header signature
    expect(buffer.toString("utf8", 0, 4)).toBe("RIFF");
    expect(buffer.toString("utf8", 8, 12)).toBe("WAVE");
  });

  it("should throw an error on HTTP failure", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(provider.transcribe(createMockSegment())).rejects.toThrow("STT HTTP Error: 500 Internal Server Error");
  });

  it("should handle network errors", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(provider.transcribe(createMockSegment())).rejects.toThrow("Connection refused");
  });
  it("should throw if JARVIS_STT_ENDPOINT is missing", () => {
    delete process.env.JARVIS_STT_ENDPOINT;
    expect(() => new WhisperCppSttProvider()).toThrow("JARVIS_STT_ENDPOINT environment variable is not set");
  });
});

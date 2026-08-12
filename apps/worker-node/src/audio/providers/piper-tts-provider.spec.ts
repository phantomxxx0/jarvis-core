import { PiperTtsProvider } from "./piper-tts-provider";
import { spawn } from "child_process";
import { EventEmitter } from "events";

jest.mock("child_process");
jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
}));

describe("PiperTtsProvider", () => {
  let provider: PiperTtsProvider;
  let originalEnv: NodeJS.ProcessEnv;
  let mockSpawn: jest.Mock;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    process.env.JARVIS_PIPER_BIN = "/mock/piper";
    process.env.JARVIS_PIPER_MODEL = "/mock/model.onnx";
    process.env.JARVIS_TTS_SAMPLE_RATE = "16000";

    mockSpawn = spawn as jest.Mock;
    mockSpawn.mockClear();

    provider = new PiperTtsProvider();
    jest.useFakeTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("should return empty frames for empty text", async () => {
    const result = await provider.synthesize("");
    expect(result).toEqual([]);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("should spawn piper and return parsed PcmFrames", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: jest.fn((text, cb) => cb()),
      end: jest.fn(),
    };
    mockSpawn.mockReturnValue(mockProcess);

    const synthPromise = provider.synthesize("Hello world");

    expect(mockSpawn).toHaveBeenCalledWith("/mock/piper", [
      "--model", "/mock/model.onnx",
      "--output_raw"
    ]);

    expect(mockProcess.stdin.write).toHaveBeenCalledWith("Hello world", expect.any(Function));
    expect(mockProcess.stdin.end).toHaveBeenCalled();

    // 16000 hz * 1 ch * 2 bytes = 32000 bytes/sec
    // 50ms chunk = 1600 bytes
    const mockAudioData = Buffer.alloc(1600 + 400); // 1 full chunk + 400 remainder
    mockProcess.stdout.emit("data", mockAudioData);
    
    mockProcess.emit("exit");
    mockProcess.emit("close", 0);

    const frames = await synthPromise;
    expect(frames.length).toBe(2);
    expect(frames[0].buffer.length).toBe(1600);
    expect(frames[0].sampleRate).toBe(16000);
    expect(frames[1].buffer.length).toBe(400); // flush remainder
    expect(frames[1].sampleRate).toBe(16000);
  });

  it("should handle piper process error exit code", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: jest.fn(),
      end: jest.fn(),
    };
    mockSpawn.mockReturnValue(mockProcess);

    const synthPromise = provider.synthesize("Hello");

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockProcess.stderr.emit("data", Buffer.from("model not found"));
    mockProcess.emit("exit");
    mockProcess.emit("close", 1);

    await expect(synthPromise).rejects.toThrow("Piper exited with code 1. Error: model not found");
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  it("should handle spawn error", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: jest.fn(),
      end: jest.fn(),
    };
    mockSpawn.mockReturnValue(mockProcess);

    const synthPromise = provider.synthesize("Hello");

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockProcess.emit("error", new Error("ENOENT"));

    await expect(synthPromise).rejects.toThrow("ENOENT");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should enforce a 10s timeout", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    mockProcess.stdin = {
      write: jest.fn(),
      end: jest.fn(),
    };
    mockSpawn.mockReturnValue(mockProcess);

    const synthPromise = provider.synthesize("Timeout test");

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Fast forward 10s
    jest.advanceTimersByTime(10000);

    await expect(synthPromise).rejects.toThrow("Piper synthesis timed out");
    expect(mockProcess.kill).toHaveBeenCalledWith("SIGKILL");
    
    consoleErrorSpy.mockRestore();
  });
});

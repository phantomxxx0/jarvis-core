import { OpenWakeWordProvider } from "./openwakeword-provider";
import { PcmFrame } from "../core/pcm-frame";
import * as childProcess from "child_process";
import { EventEmitter } from "events";
import { PassThrough } from "stream";

jest.mock("child_process");

describe("OpenWakeWordProvider", () => {
  let provider: OpenWakeWordProvider;
  let mockSpawn: jest.Mock;
  let mockDaemon: any;

  beforeEach(() => {
    mockDaemon = new EventEmitter();
    mockDaemon.stdin = {
      write: jest.fn(),
      on: jest.fn(),
    };
    mockDaemon.stdout = new PassThrough();
    mockDaemon.stderr = new PassThrough();
    mockDaemon.kill = jest.fn();

    mockSpawn = childProcess.spawn as jest.Mock;
    mockSpawn.mockReturnValue(mockDaemon);

    provider = new OpenWakeWordProvider({
      pythonBin: "python3",
      daemonScript: "daemon.py",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createFrame = (): PcmFrame => ({
    buffer: Buffer.from([0, 0, 0, 0]),
    sampleRate: 16000,
    channels: 1,
    timestamp: Date.now(),
  });

  it("spawns daemon on initialize with default model", () => {
    provider.initialize();
    
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.stringContaining("python"),
      expect.arrayContaining(["--model", "hey_jarvis_v0.1.onnx"]),
      expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] })
    );
    expect(provider.processFrame(createFrame())).toBe(false);
  });

  it("spawns daemon with custom model if provided", () => {
    const customProvider = new OpenWakeWordProvider({ model: "custom_model.onnx" });
    customProvider.initialize();
    
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.stringContaining("python"),
      expect.arrayContaining(["--model", "custom_model.onnx"]),
      expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] })
    );
  });

  it("writes PCM frames to stdin", () => {
    provider.initialize();
    const frame = createFrame();
    const result = provider.processFrame(frame);
    
    expect(mockDaemon.stdin.write).toHaveBeenCalledWith(frame.buffer);
    expect(result).toBe(false); // Initially false
  });

  it("returns true on next frame after wake word JSON event", () => {
    provider.initialize();
    
    // Simulate JSON stdout event
    mockDaemon.stdout.write('{"event":"wake_word","model":"hey_jarvis_v0.1","score":0.85}\n');
    
    const frame = createFrame();
    
    // The next processFrame should return true and clear the flag
    expect(provider.processFrame(frame)).toBe(true);
    
    // The subsequent frame should return false again
    expect(provider.processFrame(frame)).toBe(false);
  });

  it("handles malformed JSON cleanly without throwing", () => {
    provider.initialize();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    
    mockDaemon.stdout.write('{"event": malformed...}\n');
    
    expect(provider.processFrame(createFrame())).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it("resets detection flag", () => {
    provider.initialize();
    mockDaemon.stdout.write('{"event":"wake_word"}\n');
    
    provider.reset();
    
    expect(provider.processFrame(createFrame())).toBe(false);
  });

  it("handles daemon failure and stops safely", () => {
    provider.initialize();
    mockDaemon.emit("error", new Error("Spawn error"));
    mockDaemon.emit("exit", 1, null);
    
    expect(provider.processFrame(createFrame())).toBe(false);
    
    provider.stop(); // Safe stop even if undefined
    expect(mockDaemon.kill).not.toHaveBeenCalled(); // daemon was undefined after exit
  });
});

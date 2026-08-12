import { NativeAudioDriver } from "./native-audio-driver";
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { AudioConfig } from "../core/audio-config";
import * as os from "os";

jest.mock("child_process");
jest.mock("os", () => ({
  ...jest.requireActual("os"),
  platform: jest.fn(),
}));

describe("NativeAudioDriver", () => {
  let driver: NativeAudioDriver;
  let mockSpawn: jest.Mock;

  beforeEach(() => {
    (os.platform as jest.Mock).mockReturnValue("linux");
    driver = new NativeAudioDriver();
    mockSpawn = spawn as jest.Mock;
    mockSpawn.mockClear();
    process.env.JARVIS_VOICE_DEVICE_IN = "hw:1,0";
    process.env.JARVIS_VOICE_DEVICE_OUT = "hw:2,0";
    delete process.env.JARVIS_VOICE_FORMAT_IN;
    delete process.env.JARVIS_VOICE_FORMAT_OUT;
  });

  afterEach(async () => {
    await driver.stopCapture();
  });

  it("should return default devices", async () => {
    const devices = await driver.getDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].id).toBe("default");
  });

  it("should start capture with ffmpeg and emit frames", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    mockSpawn.mockReturnValue(mockProcess);

    const onFrame = jest.fn();

    await driver.startCapture("default", onFrame);

    expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.arrayContaining([
      "-f", "alsa",
      "-i", "hw:1,0",
      "-acodec", "pcm_s16le",
    ]));

    // Simulate stdout data
    const chunkBytes = Math.floor(
      AudioConfig.TARGET_SAMPLE_RATE * AudioConfig.CHANNELS * 2 * 0.05
    );
    const mockData = Buffer.alloc(chunkBytes + 10);
    mockProcess.stdout.emit("data", mockData);

    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame.mock.calls[0][0].buffer.length).toBe(chunkBytes);
  });

  it("should select dshow format on Windows", async () => {
    (os.platform as jest.Mock).mockReturnValue("win32");
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    mockSpawn.mockReturnValue(mockProcess);

    const onFrame = jest.fn();
    await driver.startCapture("audio=Mic", onFrame);

    expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.arrayContaining([
      "-f", "dshow",
    ]));
  });

  it("should use JARVIS_VOICE_FORMAT_IN and JARVIS_VOICE_FORMAT_OUT overrides", async () => {
    process.env.JARVIS_VOICE_FORMAT_IN = "pulse";
    process.env.JARVIS_VOICE_FORMAT_OUT = "pulse";
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    mockProcess.stdin = { write: jest.fn((data, cb) => cb()), end: jest.fn() };
    mockSpawn.mockReturnValue(mockProcess);

    await driver.startCapture("default", jest.fn());
    expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.arrayContaining([
      "-f", "pulse",
    ]));

    mockSpawn.mockClear();
    const playPromise = driver.playAudio([
      { buffer: Buffer.alloc(100), timestamp: Date.now(), sampleRate: 16000, channels: 1 }
    ]);
    mockProcess.emit("close", 0);
    await playPromise;

    expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.arrayContaining([
      "-f", "pulse",
    ]));
  });

  it("should handle process failure during capture", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    mockSpawn.mockReturnValue(mockProcess);

    const onFrame = jest.fn();
    await driver.startCapture("default", onFrame);
    
    // Simulate error exit
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockProcess.emit("close", 1);
    
    expect(consoleWarnSpy).toHaveBeenCalledWith("[NativeAudioDriver] Capture process exited with code 1");
    consoleWarnSpy.mockRestore();
  });

  it("should fail to start if stdout is not available", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.kill = jest.fn();
    // Missing stdout
    mockSpawn.mockReturnValue(mockProcess);

    await expect(driver.startCapture("default", jest.fn())).rejects.toThrow("Failed to open stdout");
  });

  it("should cleanup process on stopCapture", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.kill = jest.fn();
    mockSpawn.mockReturnValue(mockProcess);

    await driver.startCapture("default", jest.fn());
    await driver.stopCapture();

    expect(mockProcess.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("should play audio via ffmpeg", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdin = {
      write: jest.fn((data, cb) => cb()),
      end: jest.fn(),
    };
    mockSpawn.mockReturnValue(mockProcess);

    const playPromise = driver.playAudio([
      {
        buffer: Buffer.alloc(100),
        timestamp: Date.now(),
        sampleRate: 16000,
        channels: 1
      }
    ]);

    expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.arrayContaining([
      "-f", "s16le",
      "-i", "pipe:0",
      "-f", "alsa",
      "hw:2,0"
    ]));

    // Simulate successful exit
    mockProcess.emit("close", 0);
    
    await playPromise;
    expect(mockProcess.stdin.write).toHaveBeenCalled();
    expect(mockProcess.stdin.end).toHaveBeenCalled();
  });

  it("should use dshow format on Windows for playAudio", async () => {
    (os.platform as jest.Mock).mockReturnValue("win32");
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdin = {
      write: jest.fn((data, cb) => cb()),
      end: jest.fn(),
    };
    mockSpawn.mockReturnValue(mockProcess);

    const playPromise = driver.playAudio([
      { buffer: Buffer.alloc(100), timestamp: Date.now(), sampleRate: 16000, channels: 1 }
    ]);

    expect(mockSpawn).toHaveBeenCalledWith("ffmpeg", expect.arrayContaining([
      "-f", "dshow",
    ]));
    
    mockProcess.emit("close", 0);
    await playPromise;
  });

  it("should reject playAudio if process fails", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdin = {
      write: jest.fn((data, cb) => cb()),
      end: jest.fn(),
    };
    mockSpawn.mockReturnValue(mockProcess);

    const playPromise = driver.playAudio([
      {
        buffer: Buffer.alloc(100),
        timestamp: Date.now(),
        sampleRate: 16000,
        channels: 1
      }
    ]);

    // Simulate error exit
    mockProcess.emit("close", 1);
    
    await expect(playPromise).rejects.toThrow("ffmpeg playback exited with code 1");
  });
});

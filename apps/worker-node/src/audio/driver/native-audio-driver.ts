import { AudioDriver, AudioDevice } from "./audio-driver";
import { PcmFrame } from "../core/pcm-frame";
import { AudioConfig } from "../core/audio-config";
import { spawn, ChildProcess } from "child_process";
import * as os from "os";

export class NativeAudioDriver implements AudioDriver {
  private captureProcess?: ChildProcess;
  private isCapturing = false;

  async getDevices(): Promise<AudioDevice[]> {
    const isWindows = os.platform() === "win32";
    return [
      {
        id: "default",
        name: isWindows ? "Default DirectShow Device" : "Default ALSA Device",
        isInput: true,
        isOutput: true,
        sampleRates: [16000],
      },
    ];
  }

  async startCapture(
    deviceId: string,
    onFrame: (frame: PcmFrame) => void,
  ): Promise<void> {
    if (this.isCapturing) {
      throw new Error("Capture already running");
    }

    this.isCapturing = true;

    const device = process.env.JARVIS_VOICE_DEVICE_IN || "default";
    const format = process.env.JARVIS_VOICE_FORMAT_IN || (os.platform() === "win32" ? "dshow" : "alsa");

    this.captureProcess = spawn("ffmpeg", [
      "-f", format,
      "-i", device,
      "-acodec", "pcm_s16le",
      "-ar", AudioConfig.TARGET_SAMPLE_RATE.toString(),
      "-ac", AudioConfig.CHANNELS.toString(),
      "-f", "s16le",
      "pipe:1",
    ]);

    if (!this.captureProcess.stdout) {
      this.isCapturing = false;
      throw new Error("Failed to open stdout from ffmpeg capture");
    }

    // 50ms chunks
    const chunkBytes = Math.floor(
      AudioConfig.TARGET_SAMPLE_RATE * AudioConfig.CHANNELS * 2 * 0.05,
    );

    let buffer = Buffer.alloc(0);

    this.captureProcess.stdout.on("data", (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);

      while (buffer.length >= chunkBytes) {
        const frameBuffer = buffer.subarray(0, chunkBytes);
        buffer = buffer.subarray(chunkBytes);

        onFrame({
          buffer: frameBuffer,
          timestamp: Date.now(),
          sampleRate: AudioConfig.TARGET_SAMPLE_RATE,
          channels: AudioConfig.CHANNELS,
        });
      }
    });

    this.captureProcess.stderr?.on("data", (data: Buffer) => {
      // ffmpeg writes status to stderr, we can optionally log errors
      const msg = data.toString();
      if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("cannot")) {
        console.error(`[NativeAudioDriver Capture Error] ${msg}`);
      }
    });

    this.captureProcess.on("close", (code) => {
      this.isCapturing = false;
      if (code !== 0 && code !== null && code !== 255) {
        console.warn(`[NativeAudioDriver] Capture process exited with code ${code}`);
      }
    });
  }

  async stopCapture(): Promise<void> {
    this.isCapturing = false;
    if (this.captureProcess) {
      this.captureProcess.kill("SIGKILL");
      this.captureProcess = undefined;
    }
  }

  async playAudio(frames: PcmFrame[]): Promise<void> {
    if (frames.length === 0) return;

    return new Promise((resolve, reject) => {
      const device = process.env.JARVIS_VOICE_DEVICE_OUT || "default";
      const format = process.env.JARVIS_VOICE_FORMAT_OUT || (os.platform() === "win32" ? "dshow" : "alsa");

      const playProcess = spawn("ffmpeg", [
        "-f", "s16le",
        "-ar", frames[0].sampleRate.toString(),
        "-ac", frames[0].channels.toString(),
        "-i", "pipe:0",
        "-f", format,
        device,
      ]);

      if (!playProcess.stdin) {
        return reject(new Error("Failed to open stdin for ffmpeg playback"));
      }

      playProcess.on("close", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`ffmpeg playback exited with code ${code}`));
        } else {
          resolve();
        }
      });

      playProcess.on("error", (err) => {
        reject(err);
      });

      const totalBuffer = Buffer.concat(frames.map((f) => f.buffer));
      
      playProcess.stdin.write(totalBuffer, (err) => {
        if (err) {
          console.error("[NativeAudioDriver] Error writing to ffmpeg stdin", err);
        }
        playProcess.stdin?.end();
      });
    });
  }
}

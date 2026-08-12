import { TtsProvider } from "./tts-provider";
import { PcmFrame } from "../core/pcm-frame";
import { spawn } from "child_process";
import * as fs from "fs";

export class PiperTtsProvider implements TtsProvider {
  private readonly piperBin: string;
  private readonly defaultModel: string;
  private readonly sampleRate: number;

  constructor() {
    this.piperBin = process.env.JARVIS_PIPER_BIN || "/opt/ai-stack/voice-deps/piper/piper";
    this.defaultModel = process.env.JARVIS_PIPER_MODEL || "/opt/ai-stack/jarvis-core/en_US-lessac-medium.onnx";
    this.sampleRate = parseInt(process.env.JARVIS_TTS_SAMPLE_RATE || "22050", 10);
    
    this.validateDependencies();
  }

  private validateDependencies(): void {
    if (!fs.existsSync(this.piperBin)) {
      throw new Error(`Piper executable not found at: ${this.piperBin}. Please install Piper or configure JARVIS_PIPER_BIN.`);
    }
    if (!fs.existsSync(this.defaultModel)) {
      throw new Error(`Piper model not found at: ${this.defaultModel}. Please download a model or configure JARVIS_PIPER_MODEL.`);
    }
  }

  public async synthesize(text: string, voice?: string): Promise<PcmFrame[]> {
    if (!text || text.trim() === "") {
      return [];
    }

    const modelPath = voice || this.defaultModel;

    return new Promise((resolve, reject) => {
      const piperProcess = spawn(this.piperBin, [
        "--model", modelPath,
        "--output_raw"
      ]);

      let errorOutput = "";
      const frames: PcmFrame[] = [];
      let audioBuffer = Buffer.alloc(0);

      // Piper produces 16-bit PCM (S16LE) Mono
      // Frame chunk size: ~50ms
      const bytesPerSample = 2;
      const channels = 1;
      const chunkBytes = Math.floor(this.sampleRate * channels * bytesPerSample * 0.05);

      piperProcess.stdout.on("data", (data: Buffer) => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= chunkBytes) {
          const frameBuffer = audioBuffer.subarray(0, chunkBytes);
          audioBuffer = audioBuffer.subarray(chunkBytes);

          frames.push({
            buffer: frameBuffer,
            sampleRate: this.sampleRate,
            channels: channels,
            timestamp: Date.now(),
          });
        }
      });

      piperProcess.stderr.on("data", (data: Buffer) => {
        const msg = data.toString();
        errorOutput += msg;
      });

      piperProcess.on("close", (code) => {
        if (code !== 0) {
          console.error("[PiperTtsProvider] Piper process failed");
          return reject(new Error(`Piper exited with code ${code}. Error: ${errorOutput}`));
        }

        // Flush remaining buffer if any
        if (audioBuffer.length > 0) {
          frames.push({
            buffer: audioBuffer,
            sampleRate: this.sampleRate,
            channels: channels,
            timestamp: Date.now(),
          });
        }

        resolve(frames);
      });

      piperProcess.on("error", (err) => {
        console.error("[PiperTtsProvider] Failed to spawn Piper");
        reject(err);
      });

      // Write text to stdin and close pipe
      piperProcess.stdin.write(text, (err) => {
        if (err) {
          console.error("[PiperTtsProvider] Error writing to Piper stdin");
        }
        piperProcess.stdin.end();
      });

      // Timeout safety (10s)
      const timeoutId = setTimeout(() => {
        console.error("[PiperTtsProvider] Piper process timed out");
        piperProcess.kill("SIGKILL");
        reject(new Error("Piper synthesis timed out"));
      }, 10000);

      // Clear timeout on exit
      piperProcess.on("exit", () => {
        clearTimeout(timeoutId);
      });
    });
  }
}

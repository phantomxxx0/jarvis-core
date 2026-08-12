import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as readline from "readline";
import { WakeWordProvider } from "./wake-word-provider";
import { PcmFrame } from "../core/pcm-frame";

export interface OpenWakeWordConfig {
  pythonBin?: string;
  daemonScript?: string;
  model?: string;
}

export class OpenWakeWordProvider implements WakeWordProvider {
  private daemon?: ChildProcess;
  private pendingDetection = false;
  private pythonBin: string;
  private daemonScript: string;
  private model: string;

  constructor(config: OpenWakeWordConfig = {}) {
    const cwd = process.cwd();
    this.pythonBin = config.pythonBin || process.env.JARVIS_OWW_PYTHON_BIN || path.join(cwd, ".venv-openwakeword", "bin", "python");
    this.daemonScript = config.daemonScript || process.env.JARVIS_OWW_DAEMON_SCRIPT || path.join(cwd, "apps", "worker-node", "src", "audio", "gates", "openwakeword-daemon.py");
    this.model = config.model || process.env.JARVIS_WAKE_WORD_MODEL || "hey_jarvis_v0.1.onnx";
  }

  public initialize(): void {
    if (this.daemon) {
      return;
    }

    this.daemon = spawn(this.pythonBin, [this.daemonScript, "--model", this.model], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (this.daemon.stdin) {
      this.daemon.stdin.on("error", (err) => {
        console.error("[OpenWakeWordProvider] Daemon stdin error (broken pipe):", err);
      });
    }

    this.daemon.on("error", (err) => {
      console.error("[OpenWakeWordProvider] Daemon spawn error:", err);
    });

    this.daemon.on("exit", (code, signal) => {
      console.error(`[OpenWakeWordProvider] Daemon exited with code ${code} and signal ${signal}`);
      this.daemon = undefined;
    });

    // Handle stderr for logging
    if (this.daemon.stderr) {
      this.daemon.stderr.on("data", (data) => {
        const msg = data.toString().trim();
        if (msg) {
          console.log(`[OpenWakeWord] ${msg}`);
        }
      });
    }

    // Handle stdout for JSON events
    if (this.daemon.stdout) {
      const rl = readline.createInterface({
        input: this.daemon.stdout,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        try {
          const event = JSON.parse(line);
          if (event.event === "wake_word") {
            this.pendingDetection = true;
          }
        } catch (err) {
          console.error("[OpenWakeWordProvider] Failed to parse daemon output:", line, err);
        }
      });
    }
  }

  public processFrame(frame: PcmFrame): boolean {
    if (!this.daemon || !this.daemon.stdin) {
      // If daemon is not running, we cannot detect wake words.
      return false;
    }

    // Write raw PCM bytes to daemon stdin
    this.daemon.stdin.write(frame.buffer);

    // Check if a detection occurred asynchronously since the last call
    if (this.pendingDetection) {
      this.pendingDetection = false;
      return true;
    }

    return false;
  }

  public reset(): void {
    this.pendingDetection = false;
  }

  public stop(): void {
    if (this.daemon) {
      this.daemon.kill("SIGTERM");
      this.daemon = undefined;
    }
  }
}

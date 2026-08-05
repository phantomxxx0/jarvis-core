import { spawn, ChildProcess } from "child_process";
import crypto from "crypto";
import { sandbox } from "./filesystem-sandbox";

export interface ProcessInfo {
  processId: string;
  command: string;
  args: string[];
  status: "running" | "completed" | "failed" | "killed";
  exitCode: number | null;
  pid: number | undefined;
  startTime: string;
}

export class ProcessManagerService {
  private processes = new Map<
    string,
    { process: ChildProcess; info: ProcessInfo }
  >();

  public spawnProcess(
    command: string,
    args: string[] = [],
    options: { cwd?: string; env?: Record<string, string> } = {},
  ): string {
    const processId = crypto.randomUUID();
    const safeCwd = sandbox.resolveSafePath(options.cwd || "");

    const child = spawn(command, args, {
      cwd: safeCwd,
      env: { ...process.env, ...options.env },
      stdio: "ignore", // We ignore stdio for now, unless we want to buffer it. Or maybe we shouldn't ignore?
      detached: true,
    });

    const info: ProcessInfo = {
      processId,
      command,
      args,
      status: "running",
      exitCode: null,
      pid: child.pid,
      startTime: new Date().toISOString(),
    };

    this.processes.set(processId, { process: child, info });

    child.on("exit", (code, signal) => {
      const entry = this.processes.get(processId);
      if (entry) {
        if (signal === "SIGKILL" || signal === "SIGTERM") {
          entry.info.status = "killed";
        } else if (code === 0) {
          entry.info.status = "completed";
        } else {
          entry.info.status = "failed";
        }
        entry.info.exitCode = code;
      }
    });

    child.on("error", (err) => {
      const entry = this.processes.get(processId);
      if (entry) {
        entry.info.status = "failed";
      }
    });

    return processId;
  }

  public getProcessList(): ProcessInfo[] {
    return Array.from(this.processes.values()).map((entry) => entry.info);
  }

  public getProcess(processId: string): ProcessInfo | undefined {
    const entry = this.processes.get(processId);
    return entry?.info;
  }

  public killProcess(processId: string): boolean {
    const entry = this.processes.get(processId);
    if (!entry) return false;

    if (entry.info.status === "running" && entry.process.pid) {
      if (process.platform === "win32") {
        entry.process.kill("SIGKILL");
      } else {
        try {
          process.kill(-entry.process.pid, "SIGKILL"); // kill process group
        } catch (e) {
          entry.process.kill("SIGKILL");
        }
      }
      entry.info.status = "killed";
      return true;
    }
    return false;
  }

  public async waitProcess(
    processId: string,
    timeoutMs: number = 30000,
  ): Promise<ProcessInfo> {
    const entry = this.processes.get(processId);
    if (!entry) throw new Error(`Process ${processId} not found`);

    if (entry.info.status !== "running") {
      return entry.info;
    }

    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout;

      const onExit = () => {
        clearTimeout(timer);
        resolve(entry.info);
      };

      timer = setTimeout(() => {
        entry.process.removeListener("exit", onExit);
        reject(new Error(`Wait timeout for process ${processId}`));
      }, timeoutMs);

      entry.process.once("exit", onExit);
    });
  }

  public cleanupAll() {
    for (const [processId, entry] of this.processes.entries()) {
      if (entry.info.status === "running") {
        try {
          this.killProcess(processId);
        } catch {}
      }
    }
    this.processes.clear();
  }
}

export const processManager = new ProcessManagerService();

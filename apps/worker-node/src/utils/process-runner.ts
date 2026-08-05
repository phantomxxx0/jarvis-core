import { spawn, SpawnOptionsWithoutStdio } from "child_process";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ProcessRunner {
  static async run(
    command: string,
    args: string[],
    options: SpawnOptionsWithoutStdio & { timeoutMs?: number },
  ): Promise<ProcessResult> {
    const timeoutMs = options.timeoutMs ?? 30000; // 30s default

    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      const child = spawn(command, args, {
        ...options,
        // Ensure child runs independently of terminal
        shell: options.shell ?? false,
      });

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      let hasTimedOut = false;
      let timeout: NodeJS.Timeout | null = null;
      if (timeoutMs > 0) {
        timeout = setTimeout(() => {
          hasTimedOut = true;
          child.stdout.destroy();
          child.stderr.destroy();
          child.kill("SIGKILL");
        }, timeoutMs);
      }

      child.on("close", (code) => {
        if (timeout) clearTimeout(timeout);

        if (hasTimedOut) {
          resolve({
            stdout,
            stderr:
              stderr + "\n[TIMEOUT] Process killed after " + timeoutMs + "ms",
            exitCode: 124,
          });
        } else {
          resolve({
            stdout,
            stderr,
            exitCode: code ?? 1,
          });
        }
      });

      child.on("error", (err) => {
        if (timeout) clearTimeout(timeout);
        reject(err);
      });
    });
  }
}

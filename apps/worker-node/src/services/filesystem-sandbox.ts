import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";

export class PathTraversalException extends Error {
  constructor(target: string) {
    super(`Access denied: Path '${target}' escapes workspace root.`);
    this.name = "PathTraversalException";
  }
}

export class FilesystemSandbox {
  private readonly workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    if (workspaceRoot) {
      this.workspaceRoot = path.resolve(workspaceRoot);
    } else if (process.env.WORKSPACE_ROOT) {
      this.workspaceRoot = path.resolve(process.env.WORKSPACE_ROOT);
    } else {
      console.warn(
        "WARNING: WORKSPACE_ROOT not provided. Defaulting to process.cwd() for FilesystemSandbox. This should only be used in development.",
      );
      this.workspaceRoot = path.resolve(process.cwd());
    }
  }

  public getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  public resolveSafePath(targetPath: string): string {
    const resolved = path.resolve(this.workspaceRoot, targetPath);
    if (
      !resolved.startsWith(this.workspaceRoot + path.sep) &&
      resolved !== this.workspaceRoot
    ) {
      throw new PathTraversalException(targetPath);
    }
    return resolved;
  }

  public async exists(targetPath: string): Promise<boolean> {
    const safePath = this.resolveSafePath(targetPath);
    try {
      await fsp.access(safePath);
      return true;
    } catch {
      return false;
    }
  }

  public async list(
    targetPath: string,
    recursive: boolean = false,
  ): Promise<any[]> {
    const safePath = this.resolveSafePath(targetPath);
    const results: any[] = [];

    const stack: string[] = [safePath];
    while (stack.length > 0) {
      const currentDir = stack.pop()!;
      try {
        const dirents = await fsp.readdir(currentDir, { withFileTypes: true });
        for (const dirent of dirents) {
          const fullPath = path.join(currentDir, dirent.name);
          const relativePath = path.relative(this.workspaceRoot, fullPath);

          try {
            const stats = await fsp.stat(fullPath);
            results.push({
              name: dirent.name,
              path: relativePath,
              type: dirent.isDirectory()
                ? "directory"
                : dirent.isFile()
                  ? "file"
                  : "other",
              size: stats.size,
              modifiedAt: stats.mtime.toISOString(),
            });

            if (recursive && dirent.isDirectory()) {
              stack.push(fullPath);
            }
          } catch (statErr) {
            // Ignore broken symlinks or unreadable files
          }
        }
      } catch (err) {
        // Ignore unreadable directories
      }
    }

    return results;
  }

  public async read(
    targetPath: string,
    encoding: "utf8" | "base64" = "utf8",
  ): Promise<{ encoding: string; content: string; size: number }> {
    const safePath = this.resolveSafePath(targetPath);
    const stats = await fsp.stat(safePath);

    if (!stats.isFile()) {
      throw new Error(`Path '${targetPath}' is not a file`);
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (stats.size > MAX_SIZE) {
      throw new Error(
        `File size (${stats.size} bytes) exceeds maximum allowed size (10 MB)`,
      );
    }

    const buffer = await fsp.readFile(safePath);
    return {
      encoding,
      content: buffer.toString(encoding),
      size: stats.size,
    };
  }

  public async write(
    targetPath: string,
    content: string,
    overwrite: boolean = false,
  ): Promise<{ success: boolean }> {
    const safePath = this.resolveSafePath(targetPath);

    if (!overwrite) {
      const fileExists = await this.exists(targetPath);
      if (fileExists) {
        throw new Error(
          `File '${targetPath}' already exists and overwrite is false`,
        );
      }
    }

    await fsp.mkdir(path.dirname(safePath), { recursive: true });
    await fsp.writeFile(safePath, content);

    return { success: true };
  }

  public async search(
    targetRoot: string,
    pattern: string,
    recursive: boolean = true,
  ): Promise<{ matches: string[] }> {
    if (pattern.length > 100) {
      throw new Error(
        "Search pattern exceeds maximum allowed length of 100 characters",
      );
    }

    const safeRoot = this.resolveSafePath(targetRoot);
    const matches: string[] = [];
    const ignoreDirs = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      "coverage",
    ]);

    const startTime = Date.now();
    const TIMEOUT_MS = 10000;

    const stack: string[] = [safeRoot];
    while (stack.length > 0) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error("Search operation timed out");
      }

      const currentDir = stack.pop()!;
      try {
        const dirents = await fsp.readdir(currentDir, { withFileTypes: true });
        for (const dirent of dirents) {
          const fullPath = path.join(currentDir, dirent.name);
          const relativePath = path.relative(this.workspaceRoot, fullPath);

          if (dirent.isDirectory()) {
            if (recursive && !ignoreDirs.has(dirent.name)) {
              stack.push(fullPath);
            }
          } else if (dirent.isFile()) {
            if (
              dirent.name.includes(pattern) ||
              new RegExp(pattern).test(dirent.name)
            ) {
              matches.push(relativePath);
            }
          }
        }
      } catch (err) {
        // Ignore unreadable directories
      }
    }

    return { matches };
  }

  public async move(
    sourcePath: string,
    destPath: string,
  ): Promise<{ success: boolean }> {
    const safeSource = this.resolveSafePath(sourcePath);
    const safeDest = this.resolveSafePath(destPath);

    await fsp.mkdir(path.dirname(safeDest), { recursive: true });
    await fsp.rename(safeSource, safeDest);
    return { success: true };
  }

  public async copy(
    sourcePath: string,
    destPath: string,
  ): Promise<{ success: boolean }> {
    const safeSource = this.resolveSafePath(sourcePath);
    const safeDest = this.resolveSafePath(destPath);

    await fsp.mkdir(path.dirname(safeDest), { recursive: true });
    await fsp.cp(safeSource, safeDest, { recursive: true });
    return { success: true };
  }

  public async delete(targetPath: string): Promise<{ success: boolean }> {
    const safePath = this.resolveSafePath(targetPath);
    await fsp.rm(safePath, { recursive: true, force: true });
    return { success: true };
  }

  public async mkdir(targetPath: string): Promise<{ success: boolean }> {
    const safePath = this.resolveSafePath(targetPath);
    await fsp.mkdir(safePath, { recursive: true });
    return { success: true };
  }

  public async stat(targetPath: string): Promise<any> {
    const safePath = this.resolveSafePath(targetPath);
    const stats = await fsp.stat(safePath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
    };
  }
}

export const sandbox = new FilesystemSandbox();

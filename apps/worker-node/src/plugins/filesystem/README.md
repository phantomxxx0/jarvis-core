# Filesystem Capabilities

The `filesystem` capabilities allow Jarvis Core to interact with the file system of connected worker nodes safely.

## Architecture & Security
All filesystem capabilities route through the `FilesystemSandbox` service. This service provides:
1. **Directory Traversal Protection**: Prevents path injection (e.g. `../../etc/passwd`).
2. **Workspace Isolation**: Restricts access strictly to `WORKSPACE_ROOT` (defaults to `process.cwd()` in dev).
3. **Large File Constraints**: Refuses to read files larger than 10MB to prevent memory bloat.

## 1. filesystem.list
**Purpose**: List files and directories within a specified path.
**Input**:
```json
{
  "path": "docs",
  "recursive": true
}
```
**Output**:
```json
{
  "entries": [
    {
      "name": "README.md",
      "path": "docs/README.md",
      "type": "file",
      "size": 1024,
      "modifiedAt": "2026-08-01T12:00:00Z"
    }
  ]
}
```

## 2. filesystem.read
**Purpose**: Reads the content of a file (up to 10MB limit).
**Input**:
```json
{
  "path": "src/index.ts",
  "encoding": "utf8" // or "base64" for binary data
}
```
**Output**:
```json
{
  "encoding": "utf8",
  "content": "console.log('hello');",
  "size": 21
}
```
**Failure Cases**: Throws if size > 10MB.

## 3. filesystem.write
**Purpose**: Writes text or base64 content to a file. Directories are created automatically.
**Input**:
```json
{
  "path": "output/log.txt",
  "content": "Error: ...",
  "overwrite": true
}
```
**Output**:
```json
{
  "success": true
}
```
**Failure Cases**: Refuses overwrite if `overwrite: false` and the file exists.

## 4. filesystem.search
**Purpose**: Scans filenames for a substring or RegExp match. Ignores `.git`, `node_modules`, `dist`, `build`, and `coverage` by default.
**Input**:
```json
{
  "root": "src",
  "pattern": "\\.ts$",
  "recursive": true
}
```
**Output**:
```json
{
  "matches": ["src/index.ts", "src/utils.ts"]
}
```
**Performance Notes**: Uses an iterative stack-based directory traversal to avoid call stack limits on deeply nested directories.

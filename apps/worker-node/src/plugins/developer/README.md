# Developer Capabilities

The developer capability pack provides Jarvis Core with powerful system and code tools. All capabilities execute securely within the `FilesystemSandbox` boundary and enforce timeouts to prevent runaway processes.

## 1. shell.exec
**Purpose**: Run a sandboxed shell command.
**Input**:
```json
{
  "command": "npm",
  "args": ["install"],
  "cwd": "project/dir",
  "timeoutMs": 60000
}
```
**Output**:
```json
{
  "stdout": "...",
  "stderr": "...",
  "exitCode": 0
}
```
**Security**: `cwd` is validated. Execution times out strictly.

## 2. node.exec / python.exec
**Purpose**: Run a script directly on the node without needing an existing file.
**Input**:
```json
{
  "scriptContent": "console.log('hello from node');",
  "cwd": "",
  "timeoutMs": 30000
}
```
**Output**: Same as `shell.exec`.
**Security**: The temporary script is created inside the sandbox and strictly cleaned up after execution.

## 3. git.*
**Purpose**: Execute Git operations and return structured JSON (no parsing needed on Core).
Capabilities:
- `git.status`: Returns `branch`, `ahead`, `behind`, `modified`, `added`, `untracked`.
- `git.diff`: Returns raw diff strings, optionally constrained by `file` or `staged`.
- `git.log`: Returns structured commit history `[{ hash, author, date, message }]`.
- `git.branch`: Returns `current` branch and list of `branches`.

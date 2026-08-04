# Phase 8: Worker SDK & Capability Platform
## Architecture Review Document (ARD)

### 1. Vision & Goals
The purpose of the official Jarvis Worker Platform is to decentralize execution by providing robust, native SDKs (Node.js & Python) that allow developers to seamlessly bind physical hardware, local models, and remote tools to the Jarvis Brain. 

This platform aims to standardize how remote nodes expose their capabilities, execute tasks, and return telemetry—without requiring deep knowledge of the Jarvis Cluster internals or underlying transport layers.

### 2. The Five Fundamental Laws of Jarvis
To maintain architectural integrity, all Worker SDKs and Capabilities must adhere to the following Five Laws:
1. **The Law of Intelligence**: The Brain governs all logic, reasoning, state management, and cognitive planning. Workers are strictly isolated, "dumb" engines that solely perform the requested compute or physical actuation.
2. **The Law of Compute**: Compute is distributed, inherently ephemeral, and untrusted. The network is assumed to be unreliable, and capabilities must be dynamically orchestrated.
3. **The Law of Hardware**: Underlying hardware (GPUs, microphones, sensors, robotics) must NEVER be accessed directly by business logic. Hardware is strictly abstracted behind isolated Driver Adapters.
4. **The Law of Contracts**: All communication across the system occurs via strictly typed, transport-agnostic Envelopes (`TaskEnvelope`, `ResultEnvelope`, `ProgressFrame`, `HeartbeatFrame`). There are no exceptions or direct remote procedure calls.
5. **The Law of State**: Workers and their plugins must be perfectly stateless. Any required context must be passed via the `TaskEnvelope`, and output must be returned via the `ResultEnvelope` (or Claim-Check `ArtifactRefs`). Workers hold zero persistent data.

### 3. Architecture & Responsibility Matrix
The Worker Node architecture is split into distinct boundaries to prevent cascading failures:

* **Worker Runtime (The Host)**: The daemon running on the physical node. Manages connection to the `ClusterManagerService` via the Gateway, maintains the lease, and proxies Envelopes.
* **Plugin Manager**: Orchestrates the loading, sandboxing, scaling, and lifecycle of individual `CapabilityPlugins`. 
* **Capability Plugin**: The specific implementation of a discrete task (e.g., "Run WhisperX", "Capture Camera Frame"). 
* **Hardware Driver (Driver Adapter)**: The lowest-level abstraction that natively interfaces with physical devices (e.g., CUDA libraries, V4L2 webcams).

**Example Pipeline (Vision Perception)**:
`Physical Camera` → `Hardware Driver (OpenCV)` → `Driver Adapter` → `Capability Plugin (Capture)` → `Worker Runtime` → `ResultEnvelope (ArtifactRef)` → `WebSocket Transport` → `Jarvis Core`

### 4. Core Interfaces (Draft)

These shapes represent the universal TS/Python contract for the SDKs:

```typescript
// CapabilityPlugin Contract (TypeScript/Python Equivalent)
export interface CapabilityPlugin<TConfig, TArgs, TResult> {
  // Metadata mapping to CapabilityDefinition
  readonly id: string;
  readonly version: string;

  // Lifecycle
  initialize(config: TConfig): Promise<void>;
  health(): Promise<'READY' | 'DEGRADED' | 'UNHEALTHY'>;
  shutdown(): Promise<void>;

  // Execution
  execute(args: TArgs, context: TracingContext): Promise<TResult>;
  cancel(executionId: string): Promise<void>;
}

// DriverAdapter Contract
export interface DriverAdapter<TDeviceState> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDeviceState(): Promise<TDeviceState>;
}
```

### 5. Security & Sandboxing
Workers operate in hostile, unstable environments (often bridging native C++ binaries for AI models).
- **Process Isolation**: Every `CapabilityPlugin` will be isolated. In Node.js, plugins run in isolated `Worker Threads` or `child_process` forks. In Python, `multiprocessing` pools will be utilized.
- **Crash Containment**: If a native Hardware Driver segfaults (e.g., an OpenCV CUDA crash), only the sandboxed plugin process will die. The Worker Runtime Host will catch the `SIGSEGV`/`SIGKILL`, translate it into a failed `ResultEnvelope`, and restart the plugin. The connection to the Cluster Manager remains uninterrupted.

### 6. Failure Modes & DR
- **Stateless Disposability**: Since workers hold zero state, any worker can be killed at any time.
- **Sudden Worker Death**: If a worker loses power or is disconnected:
  1. The `ClusterManagerService` will detect a missed heartbeat and expire the `NodeLease`.
  2. A `NodeOfflineEvent` will fire within the Core.
  3. The `ExecutionRunnerService` will receive a timeout on the internal event bus.
  4. The Task Engine will retry the capability execution on a different, healthy worker in the cluster via the DLQ or retry policy.

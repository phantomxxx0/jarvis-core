import { io, Socket } from "socket.io-client";
import { SandboxExecutor } from "../execution/sandbox-executor";
import { TaskEnvelope, HeartbeatFrame } from "../sdk/envelopes";
import { randomUUID } from "crypto";
import * as os from "os";

export class JarvisWorkerRuntime {
  private socket: Socket;
  private heartbeatInterval?: NodeJS.Timeout;
  private readonly nodeId: string;
  private readonly clusterUrl: string;

  constructor(private readonly executor: SandboxExecutor) {
    this.nodeId = randomUUID(); // Ephemeral ID for this session
    this.clusterUrl =
      process.env.CORE_SERVER_URL || "ws://localhost:3000/cluster";

    this.socket = io(this.clusterUrl, {
      autoConnect: false,
    });

    this.setupListeners();
  }

  public start(): void {
    console.log(
      `[Runtime] Starting worker node ${this.nodeId}, connecting to ${this.clusterUrl}`,
    );
    this.socket.connect();
  }

  public stop(): void {
    console.log(`[Runtime] Stopping worker node ${this.nodeId}`);
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.socket.disconnect();
  }

  private setupListeners(): void {
    this.socket.on("connect", () => {
      console.log(`[Runtime] Connected to cluster server.`);
      this.performHandshake();
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`[Runtime] Disconnected from cluster server: ${reason}`);
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    });

    this.socket.on("task.dispatch", (task: TaskEnvelope) => {
      console.log(
        `[Runtime] Received task ${task.taskId} for capability ${task.capabilityId}`,
      );

      // We handle execution asynchronously
      this.executor
        .executeTask(task)
        .then((result) => {
          this.socket.emit("result", result);
          console.log(
            `[Runtime] Sent result for task ${task.taskId} (status: ${result.status})`,
          );
        })
        .catch((err) => {
          console.error(
            `[Runtime] Unexpected failure executing task ${task.taskId}:`,
            err,
          );
        });
    });
  }

  private performHandshake(): void {
    const identity = {
      nodeId: this.nodeId,
      clusterId: "default-cluster",
      publicKey: "none",
      hardwareFingerprint: `${os.platform()}-${os.arch()}-${os.cpus().length}cores`,
      platform: os.platform(),
      architecture: os.arch(),
    };

    const manifest = {
      clusterVersion: "1.0",
      minimumWorkerVersion: "1.0",
      supportedProtocols: ["socket.io"],
    };

    this.socket.emit(
      "register",
      { identity, manifest },
      (response: unknown) => {
        console.log(
          `[Runtime] Registration response: ${JSON.stringify(response)}`,
        );
        if (
          response &&
          typeof response === "object" &&
          "status" in response &&
          (response as Record<string, unknown>).status === "REGISTERED"
        ) {
          this.startHeartbeat();
        }
      },
    );
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const frame: HeartbeatFrame = {
        nodeId: this.nodeId,
        timestamp: new Date(),
        activeTasks: 0, // Mock for now
        cpuLoad: os.loadavg()[0] || 0,
        ramUsage: os.freemem(),
      };
      this.socket.emit("heartbeat", frame);
    }, 10000); // 10 seconds
  }
}

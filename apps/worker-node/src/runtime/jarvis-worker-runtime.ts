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
      process.env.CORE_SERVER_URL || "ws://localhost:4000/cluster";

    this.socket = io(this.clusterUrl, {
      autoConnect: false,
    });

    this.setupListeners();
  }

  public start(): void {
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
      console.log("Connected");
      this.performHandshake();
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`[Runtime] Disconnected from cluster server: ${reason}`);
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    });

    this.socket.on("task.dispatch", (task: TaskEnvelope) => {
      console.log(`Received task ${task.taskId}`);

      // We handle execution asynchronously
      this.executor
        .executeTask(task)
        .then((result) => {
          console.log("Sending ResultEnvelope");
          this.socket.emit("result", result);
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
        if (
          response &&
          typeof response === "object" &&
          "status" in response &&
          (response as Record<string, unknown>).status === "REGISTERED"
        ) {
          console.log("Registration successful");
          this.startHeartbeat();
        } else {
          console.log(`[Runtime] Registration response: ${JSON.stringify(response)}`);
        }
      },
    );
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    const emitHeartbeat = () => {
      console.log("Heartbeat...");
      const frame: HeartbeatFrame = {
        nodeId: this.nodeId,
        timestamp: new Date(),
        activeTasks: 0, // Mock for now
        cpuLoad: os.loadavg()[0] || 0,
        ramUsage: os.freemem(),
      };
      this.socket.emit("heartbeat", frame);
    };

    emitHeartbeat();
    this.heartbeatInterval = setInterval(emitHeartbeat, 10000); // 10 seconds
  }
}

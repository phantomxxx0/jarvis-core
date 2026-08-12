import { AudioDriver, AudioDevice } from "./audio-driver";
import { PcmFrame } from "../core/pcm-frame";
import { AudioConfig } from "../core/audio-config";
import * as dgram from "dgram";

const MAGIC_BYTE = 0x4a; // 'J'
const VERSION = 1;
const HEADER_SIZE = 12;

export class UdpAudioDriver implements AudioDriver {
  private socket: dgram.Socket | null = null;
  private onFrameCallback: ((frame: PcmFrame) => void) | null = null;
  private isCapturing = false;
  private lastSeqNum = -1;

  private readonly bindAddress: string;
  private readonly port: number;
  private readonly targetHost: string;
  private readonly playbackPort: number;

  constructor() {
    this.bindAddress = process.env.JARVIS_UDP_BIND_ADDRESS || "0.0.0.0";
    this.port = parseInt(process.env.JARVIS_UDP_AUDIO_PORT || "4444", 10);
    this.targetHost = process.env.JARVIS_WINDOWS_HOST || "127.0.0.1";
    this.playbackPort = parseInt(process.env.JARVIS_UDP_PLAYBACK_PORT || "4445", 10);
  }

  async getDevices(): Promise<AudioDevice[]> {
    return [
      {
        id: "udp",
        name: `UDP Network Audio (${this.bindAddress}:${this.port})`,
        isInput: true,
        isOutput: true,
        sampleRates: [16000],
      },
    ];
  }

  async startCapture(
    deviceId: string,
    onFrame: (frame: PcmFrame) => void
  ): Promise<void> {
    if (this.isCapturing) {
      throw new Error("Capture already running");
    }

    this.isCapturing = true;
    this.onFrameCallback = onFrame;
    this.lastSeqNum = -1;

    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket("udp4");

      this.socket.on("error", (err) => {
        console.error(`[UdpAudioDriver] Socket error:\n${err.stack}`);
        this.socket?.close();
        this.isCapturing = false;
        reject(err);
      });

      this.socket.on("message", (msg, rinfo) => {
        this.handleMessage(msg);
      });

      this.socket.on("listening", () => {
        const address = this.socket?.address();
        if (address) {
          console.log(`[UdpAudioDriver] Listening on ${address.address}:${address.port}`);
          console.log(`[UdpAudioDriver] Expecting Format: ${AudioConfig.TARGET_SAMPLE_RATE}Hz, ${AudioConfig.CHANNELS} channels, 16-bit PCM`);
        }
        resolve();
      });

      this.socket.bind(this.port, this.bindAddress);
    });
  }

  private handleMessage(msg: Buffer): void {
    if (!this.isCapturing || !this.onFrameCallback) return;

    if (msg.length <= HEADER_SIZE) {
      console.warn(`[UdpAudioDriver] Received packet too small (${msg.length} bytes)`);
      return;
    }

    const magic = msg.readUInt8(0);
    const version = msg.readUInt8(1);

    if (magic !== MAGIC_BYTE || version !== VERSION) {
      console.warn(`[UdpAudioDriver] Invalid magic byte or version. Received Magic: ${magic}, Version: ${version}`);
      return;
    }

    const seqNum = msg.readUInt32BE(2);
    const sampleRate = msg.readUInt32BE(6);
    const channels = msg.readUInt8(10);
    const format = msg.readUInt8(11); // 0 = S16LE

    if (sampleRate !== AudioConfig.TARGET_SAMPLE_RATE || channels !== AudioConfig.CHANNELS || format !== 0) {
      console.warn(`[UdpAudioDriver] Invalid format parameters from sender. SR: ${sampleRate}, Ch: ${channels}, Fmt: ${format}`);
      return;
    }

    if (this.lastSeqNum !== -1 && seqNum !== this.lastSeqNum + 1) {
      console.warn(`[UdpAudioDriver] Dropped/Out-of-order packet detected. Expected: ${this.lastSeqNum + 1}, Got: ${seqNum}`);
    }

    this.lastSeqNum = seqNum;

    const payload = msg.subarray(HEADER_SIZE);

    if (seqNum % 50 === 0) {
      console.log(
        `[UdpAudioDriver] Received audio: seq=${seqNum}, payload=${payload.length} bytes, sr=${sampleRate}, ch=${channels}`
      );
    }

    this.onFrameCallback({
      buffer: payload,
      timestamp: Date.now(),
      sampleRate,
      channels,
    });
  }

  async stopCapture(): Promise<void> {
    this.isCapturing = false;
    this.onFrameCallback = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  async playAudio(frames: PcmFrame[]): Promise<void> {
    if (frames.length === 0) return;

    return new Promise((resolve, reject) => {
      const sock = dgram.createSocket("udp4");

      const totalBuffer = Buffer.concat(frames.map((f) => f.buffer));

      // To play nice with UDP limits, we could fragment here, but typically TTS responses
      // are larger than 64KB. ffmpeg playback requires raw stream, so we'll just stream it in chunks.
      const CHUNK_SIZE = 1400; // Safe UDP payload size
      let offset = 0;

      const sendNextChunk = () => {
        if (offset >= totalBuffer.length) {
          sock.close();
          resolve();
          return;
        }

        const chunk = totalBuffer.subarray(offset, Math.min(offset + CHUNK_SIZE, totalBuffer.length));
        offset += CHUNK_SIZE;

        sock.send(chunk, 0, chunk.length, this.playbackPort, this.targetHost, (err) => {
          if (err) {
            console.error(`[UdpAudioDriver] Failed to send playback chunk:`, err);
            sock.close();
            reject(err);
          } else {
            // Optional: small delay to avoid swamping receiver buffer, but local network is usually fine
            setImmediate(sendNextChunk);
          }
        });
      };

      sendNextChunk();
    });
  }
}

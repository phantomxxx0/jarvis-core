import { AudioDriver } from "../driver/audio-driver";
import { RingBuffer } from "../buffer/ring-buffer";
import { VadProvider } from "../gates/vad-provider";
import { WakeWordProvider } from "../gates/wake-word-provider";
import { SessionState, SpeechSegment } from "./session-state";
import { PcmFrame } from "../core/pcm-frame";

export class AudioSessionManager {
  private state: SessionState = SessionState.PASSIVE_LISTENING;
  private currentSegmentFrames: PcmFrame[] = [];
  private silenceDurationMs = 0;
  private segmentStartTimestamp = 0;

  public onSpeechSegmentComplete?: (segment: SpeechSegment) => void;

  constructor(
    private readonly driver: AudioDriver,
    private readonly ringBuffer: RingBuffer,
    private readonly vad: VadProvider,
    private readonly wakeWord: WakeWordProvider,
    private readonly silenceTimeoutMs: number = 2000,
    private readonly deviceId: string = "default",
  ) {}

  public async start(): Promise<void> {
    this.vad.reset();
    this.wakeWord.reset();

    await this.driver.startCapture(this.deviceId, (frame) =>
      this.handleFrame(frame),
    );
  }

  public async stop(): Promise<void> {
    await this.driver.stopCapture();
  }

  private handleFrame(frame: PcmFrame): void {
    this.ringBuffer.push(frame);

    const isSpeechActive = this.vad.processFrame(frame);

    // Estimate frame duration based on buffer length.
    // duration (s) = bytes / (sampleRate * channels * bytesPerSample)
    const bytesPerSample = 2; // Assuming 16-bit
    const frameDurationMs =
      (frame.buffer.length /
        (frame.sampleRate * frame.channels * bytesPerSample)) *
      1000;

    if (this.state === SessionState.PASSIVE_LISTENING) {
      if (isSpeechActive) {
        const isWakeWord = this.wakeWord.processFrame(frame);

        if (isWakeWord) {
          this.state = SessionState.ACTIVE_RECORDING;
          this.segmentStartTimestamp = Date.now();
          this.silenceDurationMs = 0;

          // Pre-populate segment with ring buffer context
          this.currentSegmentFrames = this.ringBuffer.flush();
        }
      }
    } else if (this.state === SessionState.ACTIVE_RECORDING) {
      this.currentSegmentFrames.push(frame);

      if (isSpeechActive) {
        this.silenceDurationMs = 0;
      } else {
        this.silenceDurationMs += frameDurationMs;
      }

      if (this.silenceDurationMs >= this.silenceTimeoutMs) {
        this.finalizeSegment();
      }
    }
  }

  private finalizeSegment(): void {
    if (this.onSpeechSegmentComplete && this.currentSegmentFrames.length > 0) {
      // Calculate total duration using frame duration estimation
      let totalDurationMs = 0;
      const bytesPerSample = 2;
      for (const f of this.currentSegmentFrames) {
        totalDurationMs +=
          (f.buffer.length / (f.sampleRate * f.channels * bytesPerSample)) *
          1000;
      }

      const segment: SpeechSegment = {
        frames: [...this.currentSegmentFrames],
        durationMs: totalDurationMs,
        timestamp: this.segmentStartTimestamp,
      };

      this.onSpeechSegmentComplete(segment);
    }

    // Reset back to passive
    this.state = SessionState.PASSIVE_LISTENING;
    this.currentSegmentFrames = [];
    this.silenceDurationMs = 0;
    this.vad.reset();
    this.wakeWord.reset();
  }
}

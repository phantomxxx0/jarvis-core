import { SttProvider } from "./stt-provider";
import { SpeechSegment } from "../session/session-state";

export class WhisperCppSttProvider implements SttProvider {
  private readonly endpoint: string;

  constructor() {
    if (!process.env.JARVIS_STT_ENDPOINT) {
      throw new Error("JARVIS_STT_ENDPOINT environment variable is not set. Example: http://<WINDOWS_IP>:8081/inference");
    }
    this.endpoint = process.env.JARVIS_STT_ENDPOINT;
  }

  public async transcribe(
    segment: SpeechSegment,
  ): Promise<{ text: string; language: string; confidence: number }> {
    if (segment.frames.length === 0) {
      return { text: "", language: "en", confidence: 1 };
    }

    const sampleRate = segment.frames[0].sampleRate;
    const channels = segment.frames[0].channels;
    const rawPcm = Buffer.concat(segment.frames.map((f) => f.buffer));

    const wavBuffer = this.encodeWAV(rawPcm, sampleRate, channels);
    const blob = new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" });
    
    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("temperature", "0.0");
    formData.append("response_format", "json");

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        body: formData,
        // AbortController could be used here for timeouts, Node 18+ has AbortSignal.timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`STT HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        text: data.text || "",
        language: data.language || "en", // Default to English if not provided
        confidence: 0.99, // whisper.cpp /inference might not return confidence
      };
    } catch (error) {
      console.error("[WhisperCppSttProvider] Transcription failed", error);
      throw error;
    }
  }

  private encodeWAV(samples: Buffer, sampleRate: number, numChannels: number): Buffer {
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const buffer = Buffer.alloc(44 + samples.length);

    // RIFF chunk descriptor
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + samples.length, 4);
    buffer.write("WAVE", 8);

    // fmt sub-chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // BitsPerSample

    // data sub-chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(samples.length, 40);

    samples.copy(buffer, 44);

    return buffer;
  }
}

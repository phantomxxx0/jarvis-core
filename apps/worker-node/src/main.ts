import { PluginRegistry } from "./execution/plugin-registry";
import { SandboxExecutor } from "./execution/sandbox-executor";
import { JarvisWorkerRuntime } from "./runtime/jarvis-worker-runtime";
import { PluginLoader } from "./execution/plugin-loader";
import { processManager } from "./services/process-manager";
import { NativeAudioDriver } from "./audio/driver/native-audio-driver";
import { UdpAudioDriver } from "./audio/driver/udp-audio-driver";
import { AudioSessionManager } from "./audio/session/audio-session-manager";
import { WhisperCppSttProvider } from "./audio/providers/whisper-cpp-stt-provider";
import { PiperTtsProvider } from "./audio/providers/piper-tts-provider";
import { VoiceGateway } from "./audio/gateway/voice-gateway";
import { EnergyVadProvider } from "./audio/gates/energy-vad-provider";
import { MockWakeWordProvider } from "./audio/gates/mocks/mock-wake-word-provider";
import { OpenWakeWordProvider } from "./audio/gates/openwakeword-provider";
import { RingBuffer } from "./audio/buffer/ring-buffer";
import { SttPlugin } from "./audio/plugins/stt-plugin";
import { TtsPlugin } from "./audio/plugins/tts-plugin";
async function bootstrap() {
  console.log("Bootstrapping Worker...");

  const registry = new PluginRegistry();
  const loader = new PluginLoader(registry);
  await loader.loadAll();

  const executor = new SandboxExecutor(registry);
  const runtime = new JarvisWorkerRuntime(executor);

  runtime.start();

  let sessionManager: AudioSessionManager | undefined;
  let wakeWordProvider: any;

  if (process.env.JARVIS_VOICE_ENABLED === 'true') {
    console.log("Initializing Voice Gateway...");
    
    const audioDriver = process.env.JARVIS_AUDIO_DRIVER === 'udp' 
      ? new UdpAudioDriver() 
      : new NativeAudioDriver();

    const thresholdDb = process.env.JARVIS_VAD_THRESHOLD_DB 
      ? parseFloat(process.env.JARVIS_VAD_THRESHOLD_DB)
      : -45;
    const vadProvider = new EnergyVadProvider({ thresholdDb });
    
    const wakeWordModel = process.env.JARVIS_WAKE_WORD_MODEL;
    wakeWordProvider = process.env.JARVIS_WAKE_WORD_ENABLED === 'true'
      ? new OpenWakeWordProvider({ model: wakeWordModel })
      : new MockWakeWordProvider();
      
    if (process.env.JARVIS_WAKE_WORD_ENABLED === 'true') {
      (wakeWordProvider as OpenWakeWordProvider).initialize();
    }
    const ringBuffer = new RingBuffer(1000, 50); // 1s buffer with 50ms frames
    sessionManager = new AudioSessionManager(audioDriver, ringBuffer, vadProvider, wakeWordProvider);

    const sttProvider = new WhisperCppSttProvider();
    const ttsProvider = new PiperTtsProvider();
    const sttPlugin = new SttPlugin(sttProvider);
    const ttsPlugin = new TtsPlugin(ttsProvider);

    const voiceGateway = new VoiceGateway(
      sessionManager,
      sttPlugin,
      ttsPlugin,
      (task) => {
        runtime.emitTask(task);
      }
    );

    voiceGateway.initialize();

    runtime.onVoiceResponse((text) => {
      voiceGateway.playAudioResponse(text).catch(err => {
        console.error("Failed to play response:", err);
      });
    });

    await sessionManager.start();
  }

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
    if (sessionManager) {
      sessionManager.stop().catch(console.error);
    }
    if (process.env.JARVIS_WAKE_WORD_ENABLED === 'true') {
      (wakeWordProvider as any).stop?.();
    }
    processManager.cleanupAll();
    runtime.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nGracefully shutting down from SIGTERM");
    if (sessionManager) {
      sessionManager.stop().catch(console.error);
    }
    if (process.env.JARVIS_WAKE_WORD_ENABLED === 'true') {
      (wakeWordProvider as any).stop?.();
    }
    processManager.cleanupAll();
    runtime.stop();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap worker node:", err);
  process.exit(1);
});

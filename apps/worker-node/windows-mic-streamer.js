const { spawn } = require("child_process");
const dgram = require("dgram");

const TARGET_HOST = process.env.JARVIS_UDP_HOST || "192.168.31.x"; // Set to Linux IP
const TARGET_PORT = parseInt(process.env.JARVIS_UDP_PORT || "4444", 10);
const DEVICE_IN = process.env.JARVIS_VOICE_DEVICE_IN || 'audio="Microphone"';
const FORMAT_IN = process.env.JARVIS_VOICE_FORMAT_IN || "dshow";
const CHUNK_MS = 40;
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const CHUNK_BYTES = Math.floor(SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * (CHUNK_MS / 1000));
const HEADER_SIZE = 12;

const client = dgram.createSocket("udp4");

const ffmpegArgs = [
  "-f", FORMAT_IN,
  "-i", DEVICE_IN,
  "-acodec", "pcm_s16le",
  "-ar", SAMPLE_RATE.toString(),
  "-ac", CHANNELS.toString(),
  "-f", "s16le",
  "pipe:1"
];

console.log(`Starting Windows Mic Streamer...`);
console.log(`Target: ${TARGET_HOST}:${TARGET_PORT}`);
console.log(`Command: ffmpeg ${ffmpegArgs.join(" ")}`);

const ffmpeg = spawn("ffmpeg", ffmpegArgs);

let seqNum = 0;
let audioBuffer = Buffer.alloc(0);

ffmpeg.stdout.on("data", (data) => {
  audioBuffer = Buffer.concat([audioBuffer, data]);

  while (audioBuffer.length >= CHUNK_BYTES) {
    const payload = audioBuffer.subarray(0, CHUNK_BYTES);
    audioBuffer = audioBuffer.subarray(CHUNK_BYTES);

    const packet = Buffer.alloc(HEADER_SIZE + CHUNK_BYTES);
    packet.writeUInt8(0x4a, 0); // 'J'
    packet.writeUInt8(1, 1);    // v1
    packet.writeUInt32BE(seqNum++, 2); // seq
    packet.writeUInt32BE(SAMPLE_RATE, 6); // sr
    packet.writeUInt8(CHANNELS, 10); // ch
    packet.writeUInt8(0, 11); // format 0 = S16LE

    payload.copy(packet, HEADER_SIZE);

    client.send(packet, TARGET_PORT, TARGET_HOST, (err) => {
      if (err) console.error("Error sending packet:", err);
    });
  }
});

ffmpeg.stderr.on("data", (data) => {
  // ffmpeg outputs info to stderr
  const msg = data.toString();
  if (msg.toLowerCase().includes("error")) {
    console.error(`[FFMPEG Error] ${msg}`);
  }
});

ffmpeg.on("close", (code) => {
  console.log(`ffmpeg exited with code ${code}`);
  client.close();
  process.exit(code);
});

// Clean exit
process.on("SIGINT", () => {
  ffmpeg.kill("SIGINT");
  client.close();
  process.exit(0);
});

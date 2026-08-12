import { UdpAudioDriver } from "./udp-audio-driver";
import * as dgram from "dgram";
import { AudioConfig } from "../core/audio-config";

describe("UdpAudioDriver", () => {
  let driver: UdpAudioDriver;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    process.env.JARVIS_UDP_AUDIO_PORT = "4444";
    process.env.JARVIS_UDP_BIND_ADDRESS = "127.0.0.1";
    process.env.JARVIS_WINDOWS_HOST = "127.0.0.1";
    process.env.JARVIS_UDP_PLAYBACK_PORT = "4445";

    driver = new UdpAudioDriver();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await driver.stopCapture();
  });

  it("should return correct device list", async () => {
    const devices = await driver.getDevices();
    expect(devices.length).toBe(1);
    expect(devices[0].id).toBe("udp");
    expect(devices[0].name).toContain("UDP Network Audio (127.0.0.1:4444)");
  });

  it("should capture UDP packets, validate header, and emit frames", async () => {
    const onFrame = jest.fn();
    
    await driver.startCapture("udp", onFrame);

    const client = dgram.createSocket("udp4");
    
    // Create valid packet
    // Magic (1), Version (1), SeqNum (4), SR (4), Channels (1), Format (1)
    const packet = Buffer.alloc(12 + 100);
    packet.writeUInt8(0x4a, 0); // J
    packet.writeUInt8(1, 1);    // v1
    packet.writeUInt32BE(100, 2); // seq
    packet.writeUInt32BE(16000, 6); // sr
    packet.writeUInt8(1, 10);   // ch
    packet.writeUInt8(0, 11);   // fmt
    
    // Payload
    packet.fill(0xff, 12);

    await new Promise<void>((resolve) => {
      client.send(packet, 4444, "127.0.0.1", () => {
        client.close();
        // Wait a tick for receiving
        setTimeout(resolve, 50);
      });
    });

    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame).toHaveBeenCalledWith(expect.objectContaining({
      sampleRate: 16000,
      channels: 1,
      buffer: expect.any(Buffer),
    }));
    
    const frame = onFrame.mock.calls[0][0];
    expect(frame.buffer.length).toBe(100);
    expect(frame.buffer[0]).toBe(0xff);
  });

  it("should drop packets with invalid magic or version", async () => {
    const onFrame = jest.fn();
    await driver.startCapture("udp", onFrame);

    const client = dgram.createSocket("udp4");
    
    const packet = Buffer.alloc(12 + 100);
    packet.writeUInt8(0x00, 0); // Invalid magic
    packet.writeUInt8(1, 1);
    packet.writeUInt32BE(100, 2);
    packet.writeUInt32BE(16000, 6);
    packet.writeUInt8(1, 10);
    packet.writeUInt8(0, 11);

    await new Promise<void>((resolve) => {
      client.send(packet, 4444, "127.0.0.1", () => {
        client.close();
        setTimeout(resolve, 50);
      });
    });

    expect(onFrame).not.toHaveBeenCalled();
  });
});

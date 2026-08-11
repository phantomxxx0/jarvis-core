import { Frame } from "../models/frame";
import { createHash } from "crypto";

export class ArtifactCache {
  private readonly recentHashes: Map<string, number> = new Map();

  constructor(private readonly maxEntries: number = 100) {}

  public generateHash(frame: Frame): string {
    return createHash("sha256").update(frame.buffer).digest("hex");
  }

  public shouldUpload(frame: Frame): boolean {
    const hash = this.generateHash(frame);

    if (this.recentHashes.has(hash)) {
      // Update access time for LRU behavior
      this.recentHashes.set(hash, Date.now());
      return false; // Skip upload, already seen
    }

    // New hash, store it
    this.recentHashes.set(hash, Date.now());

    // Enforce bound
    if (this.recentHashes.size > this.maxEntries) {
      // Find oldest entry to remove
      let oldestHash = "";
      let oldestTime = Infinity;
      for (const [h, t] of this.recentHashes.entries()) {
        if (t < oldestTime) {
          oldestTime = t;
          oldestHash = h;
        }
      }
      if (oldestHash) {
        this.recentHashes.delete(oldestHash);
      }
    }

    return true;
  }
}

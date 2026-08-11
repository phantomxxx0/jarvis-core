import * as dns from "dns";
import { URL } from "url";

export class SSRFViolationError extends Error {
  constructor(ip: string) {
    super(
      `SSRF Protection: Access to private/internal network target (${ip}) is blocked.`,
    );
    this.name = "SSRFViolationError";
  }
}

export class NetworkValidator {
  /**
   * Checks if an IP address is private, loopback, link-local, multicast, or AWS metadata.
   */
  public static isPrivateIp(ip: string): boolean {
    if (ip === "::1") return true;

    // IPv4 checks
    const parts = ip.split(".");
    if (parts.length === 4) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);

      if (p1 === 127) return true; // localhost 127.0.0.0/8
      if (p1 === 10) return true; // 10.0.0.0/8
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return true; // 172.16.0.0/12
      if (p1 === 192 && p2 === 168) return true; // 192.168.0.0/16
      if (p1 === 169 && p2 === 254) return true; // link-local and AWS metadata
      if (p1 >= 224 && p1 <= 239) return true; // multicast
      if (p1 === 0) return true; // 0.0.0.0
    }

    // Basic IPv6 private checks (fe80::/10, fc00::/7)
    if (
      ip.toLowerCase().startsWith("fe8") ||
      ip.toLowerCase().startsWith("fe9") ||
      ip.toLowerCase().startsWith("fea") ||
      ip.toLowerCase().startsWith("feb")
    )
      return true;

    if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd"))
      return true;

    return false;
  }

  /**
   * Validates a URL against SSRF rules.
   * Throws an error if the URL resolves to a private IP, unless ALLOW_PRIVATE_NETWORK=true.
   */
  public static async validateUrl(urlString: string): Promise<void> {
    const allowPrivate = process.env.ALLOW_PRIVATE_NETWORK === "true";
    if (allowPrivate) return;

    const parsed = new URL(urlString);

    if (parsed.protocol === "file:") {
      throw new Error("SSRF Protection: file:// protocol is blocked.");
    }

    const hostname = parsed.hostname;

    // Quick check if it's explicitly localhost or an IP
    if (hostname === "localhost") {
      throw new SSRFViolationError("localhost");
    }

    try {
      const lookup = await dns.promises.lookup(hostname);
      if (this.isPrivateIp(lookup.address)) {
        throw new SSRFViolationError(lookup.address);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "SSRFViolationError") throw err;
      // If DNS lookup fails, fetch will fail anyway. We let it pass or block based on strictness.
      // We will allow it to pass so fetch can throw the proper ENOTFOUND error.
    }
  }
}

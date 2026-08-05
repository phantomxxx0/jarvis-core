import fs from "fs";
import os from "os";
import path from "path";

export interface JarvisConfig {
  server: string;
  accessToken?: string;
  refreshToken?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".jarvis");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: JarvisConfig = {
  server: "http://localhost:3000",
};

export function loadConfig(): JarvisConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }

  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: JarvisConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function clearConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

export function isLoggedIn(): boolean {
  const cfg = loadConfig();
  return !!cfg.accessToken;
}

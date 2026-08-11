import axios, { AxiosInstance } from "axios";
import { loadConfig, saveConfig } from "./config.js";

export class JarvisAPI {
  private client: AxiosInstance;

  constructor() {
    const cfg = loadConfig();

    this.client = axios.create({
      baseURL: cfg.server,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (cfg.accessToken) {
      this.client.defaults.headers.common.Authorization =
        `Bearer ${cfg.accessToken}`;
    }
  }

  async login(email: string, password: string) {
    const res = await this.client.post("/auth/login", {
      email,
      password,
    });

    const cfg = loadConfig();

    cfg.accessToken = res.data.data.accessToken;
    cfg.refreshToken = res.data.data.refreshToken;

    saveConfig(cfg);

    this.client.defaults.headers.common.Authorization =
      `Bearer ${cfg.accessToken}`;

    return res.data;
  }

  async profile() {
    const res = await this.client.get("/auth/profile");
    return res.data;
  }

  async chat(message: string) {
    const res = await this.client.post("/ai/chat", {
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    return res.data.data;
  }
}

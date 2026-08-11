import { saveConfig, loadConfig } from "./config.js";

saveConfig({
  server: "http://localhost:3000",
  accessToken: "abc",
  refreshToken: "xyz",
});

console.log(loadConfig());

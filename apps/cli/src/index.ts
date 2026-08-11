import readline from "node:readline";
import { JarvisAPI } from "./api.js";
import {
  clearConfig,
  isLoggedIn,
} from "./config.js";

const api = new JarvisAPI();

console.clear();

console.log("======================================");
console.log("            JARVIS CLI");
console.log("======================================");
console.log("");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function handleCommand(input: string) {
  const cmd = input.trim();

  if (!cmd) {
    return;
  }

  if (cmd === "exit") {
    console.log("Goodbye.");
    rl.close();
    process.exit(0);
  }

  if (cmd === "logout") {
    clearConfig();
    console.log("Logged out.");
    return;
  }

  if (cmd === "login") {
    const email = await ask("Email: ");
    const password = await ask("Password: ");

    try {
      await api.login(email, password);
      console.log("Login successful.");
    } catch (err: any) {
      console.log("Login failed.");
      console.log(err?.response?.data ?? err.message);
    }

    return;
  }

  if (cmd === "whoami") {
    if (!isLoggedIn()) {
      console.log("Not logged in.");
      return;
    }

    try {
      const profile = await api.profile();
      console.log(JSON.stringify(profile, null, 2));
    } catch (err: any) {
      console.log(err?.response?.data ?? err.message);
    }

    return;
  }

  if (!isLoggedIn()) {
    console.log("Please login first.");
    return;
  }

  try {
    process.stdout.write("\nJarvis> ");

    const answer = await api.chat(cmd);

    console.log(answer);
    console.log("");
  } catch (err: any) {
    console.log(err?.response?.data ?? err.message);
  }
}

async function loop() {
  const input = await ask("You> ");

  await handleCommand(input);

  loop();
}

loop();

import readline from "node:readline";

console.clear();

console.log("╔══════════════════════════════╗");
console.log("║        JARVIS CLI           ║");
console.log("╚══════════════════════════════╝");
console.log("");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question("You> ", (input) => {
    if (input === "exit") {
      console.log("Goodbye.");
      rl.close();
      process.exit(0);
    }

    console.log("");
    console.log("Jarvis>");
    console.log(`You said: ${input}`);
    console.log("");

    prompt();
  });
}

prompt();

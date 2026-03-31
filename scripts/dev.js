const { spawn } = require("child_process");

function run(name, command, args, color) {
  const child = spawn(command, args, { shell: true, stdio: ["inherit", "pipe", "pipe"] });

  child.stdout.on("data", (data) => {
    process.stdout.write(`${color}[${name}]\x1b[0m ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`${color}[${name}]\x1b[0m ${data}`);
  });

  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      process.stderr.write(`[${name}] exited with code ${code}\n`);
    }
  });

  return child;
}

const backend = run("api", "npm", ["run", "dev", "--prefix", "backend"], "\x1b[36m");
const frontend = run("web", "npm", ["run", "dev", "--prefix", "frontend"], "\x1b[33m");

function shutdown() {
  backend.kill();
  frontend.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

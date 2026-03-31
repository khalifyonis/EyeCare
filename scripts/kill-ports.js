const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORTS = [3000, 3001, 5000];

function parsePorts(argv) {
  const input = argv.find((a) => a.startsWith('--ports='));
  if (!input) return DEFAULT_PORTS;

  const raw = input.slice('--ports='.length);
  const parsed = raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0 && v <= 65535);

  return parsed.length > 0 ? parsed : DEFAULT_PORTS;
}

function hasConfirm(argv) {
  return argv.includes('--yes') || process.env.ALLOW_KILL_PORTS === '1';
}

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = out
        .trim()
        .split('\n')
        .filter((l) => l.includes('LISTENING'));
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`Freed port ${port} (PID ${pid})`);
        } catch {
          // ignore per PID failures
        }
      }
    } else {
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
      console.log(`Freed port ${port}`);
    }
  } catch {
    // Port not in use
  }
}

function clearNextLock() {
  try {
    const lockPath = path.join(__dirname, '..', 'frontend', '.next', 'dev', 'lock');
    fs.rmSync(lockPath, { force: true });
  } catch {
    // ignore
  }
}

function main() {
  const argv = process.argv.slice(2);
  const ports = parsePorts(argv);

  if (!hasConfirm(argv)) {
    console.log('Refusing to kill processes without explicit confirmation.');
    console.log(`Target ports: ${ports.join(', ')}`);
    console.log('Run with --yes or set ALLOW_KILL_PORTS=1');
    process.exit(1);
  }

  ports.forEach(killPort);
  clearNextLock();
}

main();

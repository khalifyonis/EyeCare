const { execSync } = require('child_process');
const ports = [3000, 5000];

function killPort(port) {
    try {
        if (process.platform === 'win32') {
            const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = out.trim().split('\n').filter((l) => l.includes('LISTENING'));
            const pids = new Set();
            for (const line of lines) {
                const m = line.trim().split(/\s+/);
                const pid = m[m.length - 1];
                if (pid && /^\d+$/.test(pid)) pids.add(pid);
            }
            for (const pid of pids) {
                try {
                    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                    console.log(`Freed port ${port} (PID ${pid})`);
                } catch (_) {}
            }
        } else {
            execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
            console.log(`Freed port ${port}`);
        }
    } catch (_) {
        // Port not in use
    }
}

ports.forEach(killPort);

/**
 * Development Supervisor Script
 * 
 * Cleanly starts both the backend API server and Vite frontend dev server.
 * Guarantees:
 * 1. Verifies if port 8001 is already occupied before spawning to avoid EADDRINUSE collisions
 * 2. Manages child process lifecycles and cleans up on shutdown (SIGINT / SIGTERM)
 */

import { spawn } from 'child_process';
import net from 'net';
import fs from 'fs';

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  const backendPort = 8001;
  const inUse = await isPortInUse(backendPort);
  let backendProcess = null;

  if (!inUse) {
    console.log(`[Dev] Starting Avenquis Backend on port ${backendPort}...`);
    const useTsx = fs.existsSync('node_modules/.bin/tsx') || fs.existsSync('node_modules/.bin/tsx.cmd');
    const isWin = process.platform === 'win32';
    const bin = useTsx ? (isWin ? 'node_modules\\.bin\\tsx.cmd' : 'node_modules/.bin/tsx') : 'node';
    const args = useTsx ? ['backend/src/server.ts'] : ['backend/dist/src/server.js'];

    backendProcess = spawn(bin, args, {
      stdio: 'inherit',
      env: { ...process.env, DOTENV_CONFIG_PATH: 'backend/.env' },
      shell: process.platform === 'win32',
    });

    backendProcess.on('error', (err) => {
      console.error('[Dev] Failed to start backend:', err);
    });

    backendProcess.on('exit', (code) => {
      if (code && code !== 0) {
        console.error(`[Dev] Backend process exited with code ${code}`);
      }
    });

    // Await backend readiness to prevent ECONNREFUSED on initial Vite proxy requests
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (await isPortInUse(backendPort)) {
        console.log(`[Dev] Backend listening and ready on port ${backendPort}`);
        break;
      }
    }
  } else {
    console.log(`[Dev] Backend service already active on port ${backendPort}. Connecting seamlessly.`);
  }

  console.log('[Dev] Starting Vite frontend server on port 3000...');
  const viteProcess = spawn(process.platform === 'win32' ? 'node_modules\\.bin\\vite.cmd' : 'node_modules/.bin/vite', ['--port=3000', '--host=0.0.0.0'], {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  const cleanup = () => {
    if (backendProcess && !backendProcess.killed) {
      try {
        backendProcess.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
    if (viteProcess && !viteProcess.killed) {
      try {
        viteProcess.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  viteProcess.on('exit', (code) => {
    if (backendProcess && !backendProcess.killed) {
      try {
        backendProcess.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error('[Dev] Startup failure:', err);
  process.exit(1);
});

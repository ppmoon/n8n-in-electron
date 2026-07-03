'use strict';

const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { resolveN8nBinaryPath } = require('./n8n-binary');

let n8nProcess = null;
let mainWindow = null;

function log(...args) {
  // Prefix so n8n's own logs are easy to distinguish from the shell's.
  console.log('[n8n-electron]', ...args);
}

function resolveN8nBinary() {
  return resolveN8nBinaryPath({
    isPackaged: app.isPackaged,
    devRoot: path.join(__dirname, '..'),
    resourcesPath: process.resourcesPath,
    platform: process.platform,
  });
}

function startN8n(userDataDir) {
  fs.mkdirSync(userDataDir, { recursive: true });

  const bin = resolveN8nBinary();
  log(`Starting n8n (${bin}) on ${config.n8nBaseUrl()} ...`);

  n8nProcess = spawn(bin, ['start'], {
    env: config.n8nChildEnv(userDataDir),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  n8nProcess.on('exit', (code, signal) => {
    log(`n8n process exited (code=${code}, signal=${signal})`);
    n8nProcess = null;
    // If n8n dies while the app is running, there is nothing left to show.
    if (!app.isQuiting) {
      app.quit();
    }
  });
}

// Poll a URL until it responds with HTTP 200. Used both for the /healthz
// endpoint (server up) and the editor root (frontend assets actually served).
// The root check matters because /healthz turns green slightly before the
// editor UI is mounted, which otherwise shows a transient "Cannot GET /" page.
function waitForUrl(url, { timeoutMs = 120000, intervalMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(2000, () => req.destroy());
    };

    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`));
        return;
      }
      setTimeout(attempt, intervalMs);
    };

    attempt();
  });
}

async function waitForN8n(options = {}) {
  await waitForUrl(config.n8nHealthUrl(), options);
  await waitForUrl(config.n8nBaseUrl(), options);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'n8n',
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open external links (docs, community, etc.) in the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(config.n8nBaseUrl())) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Safety net: if the very first load loses the race against n8n mounting its
  // frontend, retry the load a few times instead of leaving a broken page.
  let reloadAttempts = 0;
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc, validatedURL) => {
    if (reloadAttempts >= 5 || errorCode === -3) {
      return; // -3 is ERR_ABORTED (e.g. user-initiated navigation); ignore.
    }
    reloadAttempts += 1;
    log(`Load failed (${errorCode} ${errorDesc}) for ${validatedURL}; retrying (${reloadAttempts}/5)...`);
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.loadURL(config.n8nBaseUrl());
      }
    }, 1000);
  });

  mainWindow.loadURL(config.n8nBaseUrl());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function bootstrap() {
  const userDataDir = config.resolveDataDir(app.getPath('userData'));
  startN8n(userDataDir);

  try {
    await waitForN8n();
    log('n8n is healthy, opening editor window.');
    createWindow();
  } catch (err) {
    log('Failed to start n8n:', err.message);
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && n8nProcess) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (n8nProcess) {
    log('Stopping n8n process...');
    n8nProcess.kill('SIGTERM');
  }
});

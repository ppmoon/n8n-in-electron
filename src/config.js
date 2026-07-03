'use strict';

const path = require('path');

// Central configuration for the embedded n8n instance.
// Kept in its own module so it can be unit-tested without booting Electron.
const N8N_HOST = process.env.N8N_HOST || '127.0.0.1';
const N8N_PORT = Number(process.env.N8N_PORT || 5678);

function n8nBaseUrl() {
  return `http://${N8N_HOST}:${N8N_PORT}`;
}

function n8nHealthUrl() {
  return `${n8nBaseUrl()}/healthz`;
}

// Environment passed to the n8n child process. We disable telemetry and the
// personalization survey so the desktop app boots straight into the editor,
// and store all data under a local folder so the app is self-contained.
function n8nChildEnv(userDataDir) {
  return {
    ...process.env,
    N8N_HOST,
    N8N_PORT: String(N8N_PORT),
    N8N_USER_FOLDER: userDataDir,
    N8N_DIAGNOSTICS_ENABLED: 'false',
    N8N_PERSONALIZATION_ENABLED: 'false',
    N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
    N8N_SECURE_COOKIE: 'false',
    DB_SQLITE_POOL_SIZE: '1',
  };
}

module.exports = {
  N8N_HOST,
  N8N_PORT,
  n8nBaseUrl,
  n8nHealthUrl,
  n8nChildEnv,
  resolveDataDir: (base) => path.join(base, 'n8n-data'),
};

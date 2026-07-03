# AGENTS.md

## Cursor Cloud specific instructions

This repo is an Electron desktop shell around **n8n**. The Electron main
process (`src/main.js`) spawns a local n8n server (`node_modules/.bin/n8n
start`) on `http://127.0.0.1:5678`, waits for both `/healthz` **and** the
editor root `/` to return 200, then opens the editor in a window. Config
(host/port/child env) lives in `src/config.js`.

### Services

Single logical service: the Electron app, which manages its own embedded n8n
child process (n8n also opens an internal task-broker port 5679). There is no
separate backend to start.

### Running / building / testing

Standard commands live in `package.json` scripts; see also `README.md`.

- Run the app: `npm start`. In this cloud VM you MUST set the display and
  disable the Chromium sandbox: `DISPLAY=:1 ELECTRON_DISABLE_SANDBOX=1 npm start`.
  Running it plain (no `DISPLAY` / sandbox flags) will fail in the container.
- Lint: `npm run lint`. Tests: `npm test` (Node's built-in runner; unit tests
  cover `src/config.js` only — the Electron/n8n integration is verified by
  running the app, not by automated tests).

### Non-obvious gotchas

- **Port 5678 must be free before launch.** Only one n8n instance can bind it.
  A previously launched n8n can linger after the parent exits; if a relaunch
  logs `n8n's port 5678 is already in use`, find the stray process
  (`ps -eo pid,cmd | grep 'n8n start'`) and kill it **by PID** (never
  `pkill -f`). The app's `before-quit` handler stops its own n8n child on a
  graceful Electron quit, so kill the Electron main process by PID to stop
  everything cleanly.
- **Data persistence / resetting onboarding.** n8n stores its SQLite DB,
  config, and encryption key under the Electron user-data dir:
  `~/.config/n8n-in-electron/n8n-data`. The owner account and workflows persist
  across restarts (a fresh launch goes straight to login/editor, not the
  "set up owner" screen). Delete that folder to reset first-run onboarding.
- **First load race is handled in-app.** `/healthz` goes green slightly before
  n8n mounts its frontend, which used to show a transient "Cannot GET /". The
  app now waits for the root `/` to return 200 and also auto-reloads on
  `did-fail-load`, so no manual refresh is needed.
- **Harmless container noise in logs:** `Failed to connect to the bus` (dbus),
  GPU/`command_buffer` errors, and `Failed to start Python task runner in
  internal mode` are expected in this headless VM — the JS Task Runner still
  registers and workflows execute fine.
- n8n's `npm audit` warnings originate from n8n's own dependency tree, not from
  this app's code; do not "fix" them as part of unrelated work.

# n8n-in-electron

Run the [n8n](https://n8n.io/) workflow automation editor inside an [Electron](https://www.electronjs.org/) desktop shell.

The Electron main process boots a local n8n server as a child process, waits
for it to become healthy, and then loads the editor UI in a desktop window.

## Requirements

- Node.js 20+ (developed on Node 22)
- A graphical environment (Electron opens a native window)

## Install

```bash
npm install
```

> Note: n8n is a large dependency and pulls in a couple thousand transitive
> packages, so the first install takes a few minutes.

## Run (development)

```bash
npm start
```

This launches Electron, which starts n8n on `http://127.0.0.1:5678` and opens
it in a desktop window. All n8n data (SQLite DB, config, encryption key) is
stored under the Electron user-data directory in an `n8n-data/` subfolder, so
the app is self-contained.

On the first launch, n8n asks you to create an owner account. That account
persists across restarts.

### Running on a headless / container environment

Electron needs a display and, inside containers, the Chromium sandbox must be
disabled:

```bash
DISPLAY=:1 ELECTRON_DISABLE_SANDBOX=1 npm start
```

## Lint & test

```bash
npm run lint   # ESLint (flat config in eslint.config.js)
npm test       # Node's built-in test runner (test/*.test.js)
```

## Releases

Official macOS (Universal DMG) and Windows (x64 NSIS) installers are built
automatically when a version tag is pushed.

1. Update `version` in `package.json` (recommended).
2. Commit and push to `main`.
3. Create and push a tag:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. GitHub Actions builds both platforms and publishes a
   [GitHub Release](https://github.com/ppmoon/n8n-in-electron/releases)
   with `.dmg` and `.exe` assets.

Release builds bundle **production** `node_modules` only (via
`scripts/prepare-prod-node-modules.js`), excluding dev tools such as
`electron-builder` and ESLint from the installer.

Installers are unsigned. macOS users may need to right-click the app and choose
**Open**; Windows may show a SmartScreen warning.

## Configuration

The embedded n8n instance is configured in `src/config.js`. Override the host
or port with the `N8N_HOST` / `N8N_PORT` environment variables.

## Project layout

| Path             | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `src/main.js`    | Electron main process: boots n8n, opens the window.  |
| `src/config.js`  | n8n host/port/env configuration (unit-tested).       |
| `test/`          | Unit tests for the configuration helpers.            |
| `eslint.config.js` | ESLint flat config.                                |

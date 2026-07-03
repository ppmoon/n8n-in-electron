# GitHub Actions Release Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tag-triggered GitHub Actions that build unsigned macOS Universal DMG and Windows x64 NSIS installers via electron-builder and publish them to GitHub Releases.

**Architecture:** `electron-builder` config in `package.json` bundles `src/` into asar and copies `node_modules/` to `resources/` via `extraResources`. A small pure `resolveN8nBinaryPath()` helper selects the n8n CLI path for dev vs packaged runs. A three-job workflow (`build-mac`, `build-windows`, `publish`) runs on `v*` tags.

**Tech Stack:** Electron 43, electron-builder 25.x, GitHub Actions (`macos-latest`, `windows-latest`, `softprops/action-gh-release@v2`), Node 22.

## Global Constraints

- Trigger: push `v*` tags only (e.g. `v0.1.0`); push to `main` does **not** build.
- Publishing: official GitHub Releases (`draft: false`, not pre-release).
- Code signing: none (`CSC_IDENTITY_AUTO_DISCOVERY=false`).
- macOS artifact: Universal DMG (`arch: universal`).
- Windows artifact: x64 NSIS installer (`.exe`, `oneClick: false`).
- `appId`: `com.n8n-in-electron.app`; `productName`: `n8n`; output dir: `dist/`.
- CI Node version: 22.
- Run `npm run lint` and `npm test` in each build job before packaging.
- No Linux builds, no auto-update, no custom icons in this plan.

## File Map

| File | Responsibility |
|---|---|
| `package.json` | electron-builder `build` config, build scripts, devDependency |
| `src/n8n-binary.js` | Pure function: resolve n8n CLI path for dev vs packaged |
| `src/main.js` | Call `resolveN8nBinaryPath()` with Electron runtime values |
| `test/n8n-binary.test.js` | Unit tests for path resolution |
| `.github/workflows/release.yml` | Tag-triggered CI: build mac/win, publish Release |
| `README.md` | Document release tagging process |

`.gitignore` already contains `dist/` — no change needed.

---

### Task 1: Add electron-builder dependency and build config

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (via `npm install`)

**Interfaces:**
- Produces: npm scripts `build`, `build:mac`, `build:win`; `build` field for electron-builder.

- [ ] **Step 1: Install electron-builder**

```bash
npm install --save-dev electron-builder@^25.1.8
```

Expected: `package-lock.json` updated; `electron-builder` appears under `devDependencies`.

- [ ] **Step 2: Add build scripts to `package.json`**

In the `"scripts"` object, add:

```json
"build": "electron-builder",
"build:mac": "electron-builder --mac --publish never",
"build:win": "electron-builder --win --publish never"
```

- [ ] **Step 3: Add `build` field to `package.json`**

Add a top-level `"build"` key (sibling of `"scripts"`):

```json
"build": {
  "appId": "com.n8n-in-electron.app",
  "productName": "n8n",
  "directories": {
    "output": "dist"
  },
  "files": [
    "src/**",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "node_modules",
      "to": "node_modules",
      "filter": ["**/*"]
    }
  ],
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["universal"]
      }
    ]
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

- [ ] **Step 4: Verify lint and tests still pass**

```bash
npm run lint
npm test
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add electron-builder config for macOS and Windows"
```

---

### Task 2: n8n binary path resolution (testable module)

**Files:**
- Create: `src/n8n-binary.js`
- Create: `test/n8n-binary.test.js`

**Interfaces:**
- Produces: `resolveN8nBinaryPath({ isPackaged, devRoot, resourcesPath, platform })` → `string` (absolute path if binary exists, else bare command name).

- [ ] **Step 1: Write the failing test**

Create `test/n8n-binary.test.js`:

```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveN8nBinaryPath } = require('../src/n8n-binary');

function makeFakeBin(root, platform) {
  const binDir = path.join(root, 'node_modules', '.bin');
  fs.mkdirSync(binDir, { recursive: true });
  const binName = platform === 'win32' ? 'n8n.cmd' : 'n8n';
  const binPath = path.join(binDir, binName);
  fs.writeFileSync(binPath, '');
  return binPath;
}

test('resolveN8nBinaryPath uses devRoot when not packaged', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-bin-'));
  const expected = makeFakeBin(tmp, 'linux');
  const result = resolveN8nBinaryPath({
    isPackaged: false,
    devRoot: tmp,
    resourcesPath: '/unused',
    platform: 'linux',
  });
  assert.strictEqual(result, expected);
});

test('resolveN8nBinaryPath uses resourcesPath when packaged', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-bin-'));
  const expected = makeFakeBin(tmp, 'darwin');
  const result = resolveN8nBinaryPath({
    isPackaged: true,
    devRoot: '/unused',
    resourcesPath: tmp,
    platform: 'darwin',
  });
  assert.strictEqual(result, expected);
});

test('resolveN8nBinaryPath uses n8n.cmd on win32', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-bin-'));
  const expected = makeFakeBin(tmp, 'win32');
  const result = resolveN8nBinaryPath({
    isPackaged: true,
    devRoot: '/unused',
    resourcesPath: tmp,
    platform: 'win32',
  });
  assert.strictEqual(result, expected);
});

test('resolveN8nBinaryPath falls back to bare command when missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-bin-'));
  const result = resolveN8nBinaryPath({
    isPackaged: false,
    devRoot: tmp,
    resourcesPath: '/unused',
    platform: 'linux',
  });
  assert.strictEqual(result, 'n8n');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/n8n-binary'`.

- [ ] **Step 3: Implement `src/n8n-binary.js`**

```javascript
'use strict';

const fs = require('fs');
const path = require('path');

function resolveN8nBinaryPath({ isPackaged, devRoot, resourcesPath, platform }) {
  const binName = platform === 'win32' ? 'n8n.cmd' : 'n8n';
  const modulesRoot = isPackaged ? resourcesPath : devRoot;
  const localBin = path.join(modulesRoot, 'node_modules', '.bin', binName);
  return fs.existsSync(localBin) ? localBin : binName;
}

module.exports = { resolveN8nBinaryPath };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: all tests PASS (8 total: 4 existing config tests + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/n8n-binary.js test/n8n-binary.test.js
git commit -m "feat: add testable n8n binary path resolver for packaged builds"
```

---

### Task 3: Wire main.js to use n8n-binary module

**Files:**
- Modify: `src/main.js:19-23`

**Interfaces:**
- Consumes: `resolveN8nBinaryPath` from `./n8n-binary`.

- [ ] **Step 1: Add import and replace `resolveN8nBinary`**

At top of `src/main.js`, after existing requires, add:

```javascript
const { resolveN8nBinaryPath } = require('./n8n-binary');
```

Replace the existing `resolveN8nBinary` function (lines 19–23) with:

```javascript
function resolveN8nBinary() {
  return resolveN8nBinaryPath({
    isPackaged: app.isPackaged,
    devRoot: path.join(__dirname, '..'),
    resourcesPath: process.resourcesPath,
    platform: process.platform,
  });
}
```

- [ ] **Step 2: Run lint and tests**

```bash
npm run lint
npm test
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: resolve n8n binary from resources in packaged app"
```

---

### Task 4: GitHub Actions release workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `npm run build:mac`, `npm run build:win` from Task 1.
- Produces: GitHub Release with `.dmg` and `.exe` assets on `v*` tag push.

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Resolve version from tag
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> "$GITHUB_ENV"

      - run: npm ci

      - run: npm run lint

      - run: npm test

      - name: Build macOS Universal DMG
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: 'false'
        run: npm run build:mac -- --config.extraMetadata.version="$VERSION"

      - uses: actions/upload-artifact@v4
        with:
          name: mac-dist
          path: dist/*.dmg
          if-no-files-found: error

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Resolve version from tag
        shell: bash
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> "$GITHUB_ENV"

      - run: npm ci

      - run: npm run lint

      - run: npm test

      - name: Build Windows x64 NSIS installer
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: 'false'
        run: npm run build:win -- --config.extraMetadata.version="$VERSION"

      - uses: actions/upload-artifact@v4
        with:
          name: win-dist
          path: dist/*.exe
          if-no-files-found: error

  publish:
    needs: [build-mac, build-windows]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: '*-dist'
          path: dist
          merge-multiple: true

      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: dist/**
```

- [ ] **Step 2: Validate workflow YAML syntax**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/release.yml')); print('YAML OK')"
```

Expected: `YAML OK` (install `python3-yaml` or use `pip install pyyaml` if missing).

If Python yaml is unavailable, at minimum confirm the file exists:

```bash
test -f .github/workflows/release.yml && echo "workflow file exists"
```

- [ ] **Step 3: Run lint and tests locally**

```bash
npm run lint
npm test
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add tag-triggered release workflow for macOS and Windows"
```

---

### Task 5: Document release process in README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Releases" section to README.md**

Append before the final section or after "Lint & test":

```markdown
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

Installers are unsigned. macOS users may need to right-click the app and choose
**Open**; Windows may show a SmartScreen warning.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document tag-triggered release build process"
```

---

### Task 6: Final verification and push

- [ ] **Step 1: Run full local verification**

```bash
npm run lint
npm test
```

Expected: exit 0.

- [ ] **Step 2: Push branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 3: Smoke-test CI (after merge or on branch)**

Push a test tag to trigger the workflow (only after merging to default branch
or pushing tag to a branch GitHub Actions can see):

```bash
git tag v0.1.0-test
git push origin v0.1.0-test
```

Monitor the Actions tab. Expected: `build-mac` and `build-windows` succeed;
`publish` creates a Release with DMG and EXE attached.

Delete the test tag afterward if it was only for validation:

```bash
git push origin :refs/tags/v0.1.0-test
git tag -d v0.1.0-test
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| electron-builder config (Universal DMG, NSIS x64) | Task 1 |
| `extraResources` for `node_modules` | Task 1 |
| Packaged n8n binary path via `process.resourcesPath` | Tasks 2–3 |
| Tag trigger `v*` only | Task 4 |
| `contents: write` permission | Task 4 |
| lint + test before build | Task 4 |
| `CSC_IDENTITY_AUTO_DISCOVERY=false` | Task 4 |
| Version from tag | Task 4 |
| `softprops/action-gh-release@v2` | Task 4 |
| README release docs | Task 5 |
| `dist/` gitignored | Already present |

## Out of Scope (confirmed not in plan)

- Code signing, Linux builds, auto-update, main-branch builds, custom icons.

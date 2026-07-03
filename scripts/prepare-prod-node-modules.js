'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const stagingDir = path.join(root, '.packaging');
const outputDir = path.join(root, 'node_modules_prod');

function copyManifests(dest) {
  for (const file of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(root, file), path.join(dest, file));
  }
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });

copyManifests(stagingDir);
execSync('npm ci --omit=dev', { cwd: stagingDir, stdio: 'inherit' });
fs.renameSync(path.join(stagingDir, 'node_modules'), outputDir);
fs.rmSync(stagingDir, { recursive: true, force: true });

console.log('[prepare-prod-node-modules] Wrote', outputDir);

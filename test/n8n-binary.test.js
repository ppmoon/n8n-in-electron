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

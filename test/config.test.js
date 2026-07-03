'use strict';

const test = require('node:test');
const assert = require('node:assert');

const config = require('../src/config');

test('n8nBaseUrl builds an http url from host and port', () => {
  assert.match(config.n8nBaseUrl(), /^http:\/\/.+:\d+$/);
});

test('n8nHealthUrl targets the /healthz endpoint', () => {
  assert.ok(config.n8nHealthUrl().endsWith('/healthz'));
  assert.ok(config.n8nHealthUrl().startsWith(config.n8nBaseUrl()));
});

test('n8nChildEnv disables telemetry and sets the user folder', () => {
  const env = config.n8nChildEnv('/tmp/example');
  assert.strictEqual(env.N8N_DIAGNOSTICS_ENABLED, 'false');
  assert.strictEqual(env.N8N_PERSONALIZATION_ENABLED, 'false');
  assert.strictEqual(env.N8N_USER_FOLDER, '/tmp/example');
  assert.strictEqual(env.N8N_PORT, String(config.N8N_PORT));
});

test('resolveDataDir nests n8n data under the given base', () => {
  assert.strictEqual(config.resolveDataDir('/base'), '/base/n8n-data');
});

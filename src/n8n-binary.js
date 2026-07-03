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

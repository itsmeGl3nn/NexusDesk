const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

/** Recursively find all *.handler.ts files under a directory. */
function findHandlers(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      results.push(...findHandlers(fullPath));
    } else if (entry.endsWith('.handler.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Build { 'user': 'src/module/user/user.handler.ts', ... }
// so esbuild outputs flat: dist/handlers/user.js
// Lambda handler strings become "<module>.<export>" (single dot) which
// the Node runtime parses correctly (e.g. "user.listUsers").
const entryPoints = {};
for (const filePath of findHandlers('src/module')) {
  // Strip ".handler" suffix so "user.handler.ts" -> output key "user"
  const name = path.basename(filePath, '.ts').replace(/\.handler$/, '');
  entryPoints[name] = filePath;
}

console.log('Building handlers:', Object.keys(entryPoints));

esbuild.build({
  entryPoints,
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: 'dist/handlers',
  external: ['@aws-sdk/*'],
}).then(() => {
  console.log(`✓ Built ${Object.keys(entryPoints).length} handler(s) → dist/handlers/`);
}).catch(() => process.exit(1));
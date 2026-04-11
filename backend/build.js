const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/handlers/ping.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: 'dist/handlers',
}).catch(() => process.exit(1));
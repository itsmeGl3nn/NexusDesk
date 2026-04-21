const esbuild = require('esbuild');

esbuild.build({
  entryPoints: [
    'src/handlers/ping.ts',
    'src/module/user/user.handler.ts',
  ],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: 'dist/handlers',
  external: ['@aws-sdk/*'],
}).catch(() => process.exit(1));
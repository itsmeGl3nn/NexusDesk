const esbuild = require('esbuild');

esbuild.build({
  entryPoints: [
    'src/module/user/user.handler.ts',
    'src/module/auth/auth.handler.ts',
  ],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: 'dist/handlers',
  external: ['@aws-sdk/*'],
}).catch(() => process.exit(1));
import { build } from 'esbuild'
import { altvClientWorker } from "altv-esbuild-client-worker"

build({
  watch: true,
  bundle: true,
  target: 'esnext',
  logLevel: 'info',
  format: 'esm',
  entryPoints: ['src/main.ts'],
  outdir: 'dist',
  external: [
    'alt-shared',
    'alt-client',
    'natives',
  ],
  plugins: [
    altvClientWorker()
  ]
})
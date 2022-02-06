import * as esbuild from "esbuild"
import { argv } from "process"

const [,, dev] = argv
const devMode = dev === '-dev'
const watch = devMode

// worker file that will be handled later with altv-esbuild-client-worker
esbuild.build({
  entryPoints: ['src/streamer/streamer.worker.ts'],
  bundle: true,
  watch,
  outfile: 'dist/streamer.worker.js',
  target: 'esnext',
  format: 'esm',
  logLevel: 'info',
  external: [
    'alt-shared',
    'alt-worker'
  ],
  define: {
    '___DEVMODE': devMode
  },
})
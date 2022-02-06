import * as esbuild from "esbuild"
import { argv } from "process"

const [,, dev] = argv
const devMode = dev === '-dev'
const watch = devMode

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  watch,
  outfile: 'dist/main.js',
  target: 'esnext',
  format: 'esm',
  logLevel: 'info',
  external: [
    'alt-shared',
    'alt-client', 
    // worker files will be handled later with altv-esbuild-client-worker
    'worker!*'
  ],
  define: {
    '___DEVMODE': devMode
  },
})
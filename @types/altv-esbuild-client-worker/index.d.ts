import * as alt from "alt-client"

/**
 * typings for worker imports altv-esbuild-client-worker
 * e.g.
 * 
 * import worker from "./example.worker.ts"
 * or
 * import worker from "worker!./example.worker"
 * 
 * `worker` will be {@link alt.Worker} instance
 */

declare module "*.worker.ts" {
  import { Worker } from "alt-client"
  
  const worker: Worker
  export default worker
}

declare module "worker!*" {
  import { Worker } from "alt-client"
  
  const worker: Worker
  export default worker
}
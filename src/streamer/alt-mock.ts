/* eslint-disable @typescript-eslint/ban-types */

const workerEvents = {}
const workerDelayedEvents = new Map<string, (unknown[])[]>()
const clientEvents = {}

export const worker = {
  log(...args: unknown[]): void {
    console.log("[worker]", ...args)
  },
  logError(...args: unknown[]): void {
    console.error("[worker]", ...args)
  },
  logWarning(...args: unknown[]): void {
    console.warn("[worker]", ...args)
  },
  on(event: string, handler: Function): void {
    // @ts-expect-error awdawd
    workerEvents[event] = handler
  },
  emit(event: string, ...args: unknown[]): void {
    // @ts-expect-error awdawd
    clientEvents[event](...args)
  },
  ready() {
    for (const [event, calls] of workerDelayedEvents) {
      console.log("worker.ready", "calling event:", event, "calls:", calls.length)
      for (const args of calls)
        workerEvents[event](...args)
    }
  },
}

export const client = {
  on(event: string, handler: Function): void {
    // @ts-expect-error awdawd
    clientEvents[event] = handler
  },
  emit(event: string, ...args: unknown[]): void {
    // @ts-expect-error awdawd
    const handler = workerEvents[event]
    if (!handler) {
      const calls = (workerDelayedEvents.get(event) ?? [])
      workerDelayedEvents.set(event, calls)
      calls.push(args)
      return
    }
    handler(...args)
  },
}

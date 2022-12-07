import type { WorkerIntoEvents, IWorkerIntoEvent } from "./events"

export class WorkerEventQueue {
  private events: [
    WorkerIntoEvents,
    Parameters<IWorkerIntoEvent[WorkerIntoEvents]>,
  ][] = []

  constructor(private readonly worker: { emit(event: string, ...args: unknown[]): void }) {}

  public add<K extends WorkerIntoEvents>(eventName: K, args: Parameters<IWorkerIntoEvent[K]>): void {
    this.events.push([eventName, args])
  }

  public send(): void {
    for (const [name, args] of this.events)
      this.worker.emit(name, ...args)

    this.events = []
  }
}

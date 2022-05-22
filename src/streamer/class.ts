import * as alt from "alt-client"
import {
  WorkerFromEvents,
  WorkerIntoEvents,
} from "./events"
import type {
  IWorkerFromEvent,
  IWorkerIntoEvent,
} from "./events"
import type { Entity } from "../entity"
import type {
  IEntityCreateQueue,
  IWorkerEntityPoolOptions,
} from "./types"
import worker from "worker!./streamer.worker"
import { Logger } from "@/logger"
import { WorkerEventQueue } from "./worker-event-queue"

export class Streamer {
  private static _instance: Streamer | null = null

  public static get instance(): Streamer {
    return (Streamer._instance ??= new Streamer())
  }

  private readonly mainStreamSleepMs = 20

  private readonly workerEventHandlers: { [K in WorkerFromEvents]: IWorkerFromEvent[K] } = {
    [WorkerFromEvents.StreamResult]: (streamOut, streamIn) => {
      if (streamOut.length > 0 || streamIn.length > 0)
        this.log.moreInfo("[StreamResult]", "out:", streamOut, "in:", streamIn)
      // this.log.moreInfo("this.thisTickDestroyedEntities:", this.thisTickDestroyedEntities)

      for (let i = 0; i < streamOut.length; ++i) {
        const entityId = streamOut[i]

        if (this.thisTickDestroyedEntities[entityId]) {
          this.log.warn(`destroyed entity: ${entityId} streamOut`)
          continue
        }
        this.streamOutEntityHandler(entityId)
      }

      for (let i = 0; i < streamIn.length; ++i) {
        const entityId = streamIn[i]

        if (this.thisTickDestroyedEntities[entityId]) {
          this.log.warn(`destroyed entity: ${entityId} streamIn`)
          continue
        }

        this.streamInEntityHandler(entityId)
      }

      this.thisTickDestroyedEntities = {}

      this.workerEventQueue.send()
      alt.setTimeout(() => this.runMainStream(), this.mainStreamSleepMs)
    },

    [WorkerFromEvents.EntitiesCreated]: () => {
      const { entityCreateQueue } = this

      if (!entityCreateQueue.sendPromise) return

      entityCreateQueue.sendPromise.resolve()
      entityCreateQueue.sendPromise = null
    },
  }

  private readonly localPlayer = alt.Player.local

  private streamInEntityHandler!: (entityId: number) => void
  private streamOutEntityHandler!: (entityId: number) => void

  private readonly entityCreateQueue: IEntityCreateQueue = {
    chunkSize: 10000,
    entities: [],
    sendPromise: null,
    started: false,
  }

  private readonly log = new Logger("streamer")

  private thisTickDestroyedEntities: Record<Entity["id"], true> = {}

  private readonly workerEventQueue = new WorkerEventQueue(worker)

  constructor() {
    worker.start()
    this.initEvents()
    this.runMainStream()
  }

  public onStreamIn(handler: (entityId: number) => void): void {
    this.streamInEntityHandler = handler
  }

  public onStreamOut(handler: (entityId: number) => void): void {
    this.streamOutEntityHandler = handler
  }

  // #region pool methods

  public addPool(pool: IWorkerEntityPoolOptions): void {
    this.emitWorker(WorkerIntoEvents.CreatePool, pool)
  }

  public setPoolMaxStreamedIn(poolId: number, value: number): void {
    this.log.log("streamer setPoolMaxStreamedIn: ", "poolId:", poolId, "value:", value)

    this.emitWorker(WorkerIntoEvents.UpdatePool, {
      id: poolId,
      maxStreamedIn: value,
    })
  }
  // #endregion

  // #region entity methods

  public addEntity(entity: Entity): void {
    this.entityCreateQueue.entities.push({
      id: entity.id,
      poolId: entity.poolId,
      pos: {
        x: entity.pos.x,
        y: entity.pos.y,
      },
      streamRange: entity.streamRange,
    })
    this.startEntityCreateQueue().catch(this.log.error)
  }

  public removeEntity({ id }: Entity): void {
    const { entities } = this.entityCreateQueue
    const idx = entities.findIndex(e => e.id === id)
    if (idx !== -1)
      entities.splice(idx, 1)

    if (this.thisTickDestroyedEntities[id]) return
    this.thisTickDestroyedEntities[id] = true

    this.emitWorker(WorkerIntoEvents.DestroyEntity, id)
  }

  public setEntityPos(entity: Entity, value: alt.IVector2): void {
    this.emitWorker(WorkerIntoEvents.UpdateEntity, {
      id: entity.id,
      pos: {
        x: value.x,
        y: value.y,
      },
    })
  }

  // #endregion

  // #region worker event methods

  private initEvents() {
    for (const eventName in this.workerEventHandlers)
      worker.on(eventName, this.workerEventHandlers[eventName as WorkerFromEvents])
  }

  private emitWorker <K extends WorkerIntoEvents>(eventName: K, ...args: Parameters<IWorkerIntoEvent[K]>) {
    // // TEST
    // if (eventName !== WorkerIntoEvents.Stream) {
    //   const logArgs = [...args]
    //   // if (eventName === WorkerIntoEvents.CreateEntities) {
    //   //   let [arr] = logArgs as Parameters<IWorkerIntoEvent["createEntities"]>
    //   //   arr = [...arr]

    //   //   if ((arr as IWorkerEntityCreate[]).length > 10) {
    //   //     arr.splice(10)
    //   //     arr.push("...and more" as any)
    //   //   }

    //   //   logArgs = [arr] as any
    //   // }
    //   this.log.moreInfo("[emitWorker]", eventName, logArgs)
    // }

    this.workerEventQueue.add(eventName, args)
  }

  private emitWorkerRaw <K extends WorkerIntoEvents>(eventName: K, ...args: Parameters<IWorkerIntoEvent[K]>) {
    // TEST
    // if (eventName !== WorkerIntoEvents.Stream) {
    //   const logArgs = [...args]
    //   // if (eventName === WorkerIntoEvents.CreateEntities) {
    //   //   let [arr] = logArgs as Parameters<IWorkerIntoEvent["createEntities"]>
    //   //   arr = [...arr]

    //   //   if ((arr as IWorkerEntityCreate[]).length > 10) {
    //   //     arr.splice(10)
    //   //     arr.push("...and more" as any)
    //   //   }

    //   //   logArgs = [arr] as any
    //   // }
    //   this.log.moreInfo("[emitWorker]", eventName, logArgs)
    // }

    worker.emit(eventName, ...args)
  }

  // #endregion

  private runMainStream() {
    const { pos } = this.localPlayer

    this.emitWorkerRaw(WorkerIntoEvents.Stream, {
      x: pos.x,
      y: pos.y,
    })
  }

  private async startEntityCreateQueue() {
    const { entityCreateQueue } = this

    if (entityCreateQueue.started) return
    entityCreateQueue.started = true

    const { entities, chunkSize } = entityCreateQueue

    while (entities.length > 0) {
      const entitiesToSend = entities.splice(0, chunkSize)
      if (entitiesToSend.length < 1) return

      // const label = `entitiesCreate (${entitiesToSend[entitiesToSend.length - 1].id})`
      // const start = +new Date()

      this.emitWorker(WorkerIntoEvents.CreateEntities, entitiesToSend)
      await this.waitEntitiesCreate()

      // this.log.log(label, "ms:", +new Date() - start)
    }

    entityCreateQueue.started = false
  }

  private waitEntitiesCreate(): Promise<void> {
    return new Promise<void>(resolve => {
      this.entityCreateQueue.sendPromise = { resolve }
    }).catch(this.log.error)
  }
}
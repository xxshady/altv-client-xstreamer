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

export class Streamer {
  private static _instance: Streamer | null = null

  public static get instance(): Streamer {
    return (Streamer._instance ??= new Streamer())
  }

  private readonly mainStreamSleepMs = 20

  private readonly eventHandlers: { [K in WorkerFromEvents]: IWorkerFromEvent[K] } = {
    [WorkerFromEvents.StreamResult]: (streamOut, streamIn, mainStream) => {
      for (let i = 0; i < streamOut.length; ++i)
        this.streamOutEntityHandler(streamOut[i])

      for (let i = 0; i < streamIn.length; ++i)
        this.streamInEntityHandler(streamIn[i])

      if (mainStream)
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
  private oldPos: alt.IVector2 = { x: 0, y: 0 }

  private streamInEntityHandler!: (entityId: number) => void
  private streamOutEntityHandler!: (entityId: number) => void

  private readonly entityCreateQueue: IEntityCreateQueue = {
    chunkSize: 10000,
    entities: [],
    sendPromise: null,
    started: false,
  }

  private readonly log = new Logger("streamer")

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

  public removeEntity(entity: Entity): void {
    this.emitWorker(WorkerIntoEvents.DestroyEntity, entity.id)
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
    for (const eventName in this.eventHandlers)
      worker.on(eventName, this.eventHandlers[eventName as WorkerFromEvents])
  }

  private emitWorker <K extends WorkerIntoEvents>(eventName: K, ...args: Parameters<IWorkerIntoEvent[K]>) {
    worker.emit(eventName, ...args)
  }

  // #endregion

  private runMainStream() {
    const {
      pos: { x, y },
    } = this.localPlayer

    if (x === this.oldPos.x && y === this.oldPos.y) {
      alt.setTimeout(() => this.runMainStream(), this.mainStreamSleepMs)
      return
    }
    this.oldPos = { x, y }

    this.emitWorker(WorkerIntoEvents.Stream, this.oldPos)
  }

  private async startEntityCreateQueue() {
    const { entityCreateQueue } = this

    if (entityCreateQueue.started) return
    entityCreateQueue.started = true

    const { entities, chunkSize } = entityCreateQueue

    while (entities.length > 0) {
      const entitiesToSend = entities.splice(0, chunkSize)
      if (entitiesToSend.length < 1) return

      const label = `entitiesCreate (${entitiesToSend[entitiesToSend.length - 1].id})`
      const start = +new Date()

      this.emitWorker(WorkerIntoEvents.CreateEntities, entitiesToSend)
      await this.waitEntitiesCreate()

      this.log.log(label, "ms:", +new Date() - start)
    }

    entityCreateQueue.started = false
  }

  private waitEntitiesCreate(): Promise<void> {
    return new Promise<void>(resolve => {
      this.entityCreateQueue.sendPromise = { resolve }
    }).catch(this.log.error)
  }
}
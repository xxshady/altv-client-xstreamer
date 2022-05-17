import type { IVector2 } from "alt-shared"
import * as alt from "alt-worker"
import { distance2dInRange } from "../utils"
import type {
  IWorkerFromEvent,
  IWorkerIntoEvent,
} from "./events"
import {
  WorkerIntoEvents,
  WorkerFromEvents,
} from "./events"
import type {
  IWorkerEntity,
  IWorkerEntityArrElement,
  IWorkerEntityPool,
} from "./types"

class StreamWorker {
  private readonly eventHandlers: { [K in WorkerIntoEvents]: IWorkerIntoEvent[K] } = {
    [WorkerIntoEvents.CreateEntities]: (entities) => {
      for (let i = 0; i < entities.length; i++) {
        const {
          id,
          poolId,
          pos,
          streamRange,
        } = entities[i]

        const entity: IWorkerEntity = {
          id,
          poolId,
          pos,
          streamRange,
          streamed: false,
        }

        this.addEntityIntoArray(entity)
        this.entities[id] = entity
      }

      this.emitClient(WorkerFromEvents.EntitiesCreated)
    },

    [WorkerIntoEvents.DestroyEntity]: (entityId) => {
      const entity = this.entities[entityId]

      if (!entity) {
        this.logError(`[destroyEntity] id: ${entityId} not found`)
        return
      }

      delete this.entities[entityId]
      this.regenerateEntityArray()
    },

    [WorkerIntoEvents.CreatePool]: ({ id, maxStreamedIn }) => {
      if (this.pools[id]) {
        this.logError(`[createPool] id: ${id} already exists`)
        return
      }

      this.pools[id] = {
        id,
        maxStreamedIn,
      }
    },

    [WorkerIntoEvents.Stream]: (streamingPos) => {
      this.runStreamProcess(streamingPos)
    },

    [WorkerIntoEvents.UpdatePool]: (poolUpdate) => {
      const pool = this.pools[poolUpdate.id]

      if (!pool) {
        this.logError(`[updatePool] pool: ${poolUpdate.id} not found`)
        return
      }

      const {
        maxStreamedIn,
      } = poolUpdate

      if (maxStreamedIn != null)
        pool.maxStreamedIn = maxStreamedIn
    },

    [WorkerIntoEvents.UpdateEntity]: (entityUpdate) => {
      const entity = this.entities[entityUpdate.id]

      if (!entity) {
        this.logError(`[updateEntity] entity: ${entityUpdate.id} not found`)
        return
      }

      const {
        pos,
      } = entityUpdate

      if (pos != null)
        entity.pos = pos
    },
  }

  private readonly pools: Record<number, IWorkerEntityPool> = {}
  private readonly entities: Record<number, IWorkerEntity> = {}
  private entityArray: IWorkerEntityArrElement[] = []

  private readonly log = (___DEVMODE
    ? (...args: unknown[]) => alt.log("~cl~[streamer-worker]~w~", ...args)
    : () => {}
  )

  constructor() {
    this.initEvents()
  }

  // #region event methods

  private initEvents() {
    for (const eventName in this.eventHandlers)
      alt.on(eventName, this.eventHandlers[eventName as WorkerIntoEvents])
  }

  private emitClient <K extends WorkerFromEvents>(eventName: K, ...args: Parameters<IWorkerFromEvent[K]>) {
    alt.emit(eventName, ...args)
  }

  // #endregion

  // #region log methods

  private logError(...args: unknown[]) {
    alt.logError("[streamer-worker]", ...args)
  }

  private logWarn(...args: unknown[]) {
    alt.logWarning("[streamer-worker]", ...args)
  }

  // #endregion

  // #region entityArray methods

  private addEntityIntoArray(entity: IWorkerEntity) {
    this.entityArray.push({
      id: entity.id,
      poolId: entity.poolId,
      pos: {
        x: entity.pos.x,
        y: entity.pos.y,
      },
      streamRange: entity.streamRange,
      streamed: entity.streamed,
      dist: Infinity,
    })
  }

  private regenerateEntityArray() {
    this.entityArray = []

    for (const entityId in this.entities)
      this.addEntityIntoArray(this.entities[entityId])
  }

  // #endregion

  private streamProcess(streamingPos: IVector2): {
    streamIn: number[]
    streamOut: number[]
  } {
    const streamInIds: number[] = []
    const streamOutIds: number[] = []
    const { entityArray, entities } = this

    for (let i = 0; i < entityArray.length; i++) {
      const arrEntity = entityArray[i]
      const entity = entities[arrEntity.id]

      arrEntity.dist = distance2dInRange(
        entity.pos,
        streamingPos,
        arrEntity.streamRange,
      )
    }

    // const startBench = +new Date()
    entityArray.sort(this.sortEntitiesByDistance)

    // this.log("stream process1", +new Date() - startBench)

    // { [pool id]: <streamed in number of entities> }
    const poolsStreamIn: Record<IWorkerEntityPool["id"], number> = {}
    for (const poolId in this.pools)
      poolsStreamIn[poolId] = 0

    let lastIdx = 0

    for (let i = 0; i < entityArray.length; i++) {
      const arrEntity = entityArray[lastIdx]
      const entity = entities[arrEntity.id]

      if (arrEntity.dist > arrEntity.streamRange) {
        lastIdx++
        this.streamOutEntity(entity, arrEntity, streamOutIds)
        continue
      }

      const poolStreamIn = poolsStreamIn[arrEntity.poolId] + 1

      if (poolStreamIn > this.pools[arrEntity.poolId].maxStreamedIn)
        continue

      lastIdx++
      poolsStreamIn[arrEntity.poolId] = poolStreamIn
      this.streamInEntity(entity, arrEntity, streamInIds)
    }

    for (let i = lastIdx; i < entityArray.length; i++) {
      const arrEntity = entityArray[i]
      const entity = entities[arrEntity.id]

      this.streamOutEntity(entity, arrEntity, streamOutIds)
    }

    return {
      streamIn: streamInIds,
      streamOut: streamOutIds,
    }
  }

  private sortEntitiesByDistance(a: IWorkerEntityArrElement, b: IWorkerEntityArrElement) {
    return a.dist - b.dist
  }

  private streamOutEntity(entity: IWorkerEntity, arrEntity: IWorkerEntityArrElement, streamOutIds: number[]) {
    if (!entity.streamed) return

    entity.streamed = false
    arrEntity.streamed = false

    streamOutIds.push(entity.id)
  }

  private streamInEntity(entity: IWorkerEntity, arrEntity: IWorkerEntityArrElement, streamInIds: number[]) {
    if (entity.streamed) return

    entity.streamed = true
    arrEntity.streamed = false

    streamInIds.push(entity.id)
  }

  private runStreamProcess(streamingPos: IVector2) {
    // const start = +new Date()
    const {
      streamIn,
      streamOut,
    } = this.streamProcess(streamingPos)

    // if (___DEVMODE) {
    //   this.log("stream process~yl~", +new Date() - start)
    //   streamIn.length && this.log(`stream in entity ids: ${JSON.stringify(streamIn)}`)
    // }

    this.emitClient(
      WorkerFromEvents.StreamResult,
      streamOut,
      streamIn,
    )
  }
}

new StreamWorker()
import { Logger } from "@/logger"
import type * as alt from "alt-client"
import { IdProvider } from "../id-provider"
import { Streamer } from "../streamer"
import { init, validEntity } from "./decorators"
import type { IEntityPoolOptions } from "./decorators/types"
import { UndefinedEntityPoolError } from "./errors"
import type { IEntityPool } from "./types"

const log = new Logger("Entity")

@init({
  streamer: {
    onStreamIn: Entity.onStreamInEntityId.bind(Entity),
    onStreamOut: Entity.onStreamOutEntityId.bind(Entity),
  },
})
export class Entity {
  private static __poolId: number | null = null
  private static __maxStreamedIn: number | null = null
  private static __streamedIn: Entity[] | null = null

  private static readonly __entityIdProvider = new IdProvider()
  private static readonly __poolIdProvider = new IdProvider()

  private static readonly __entities: Record<Entity["id"], Entity> = {}
  private static readonly __pools: Record<number, IEntityPool> = {}

  public static get maxStreamedIn(): number {
    if (this.__poolId == null || this.__maxStreamedIn == null)
      throw new UndefinedEntityPoolError(this)

    return this.__maxStreamedIn
  }

  public static set maxStreamedIn(value: number) {
    if (this.__poolId == null)
      throw new UndefinedEntityPoolError(this)

    if (value < 0)
      throw new Error("Entity.maxStreamedIn must be > 0")

    this.__maxStreamedIn = value
    Streamer.instance.setPoolMaxStreamedIn(this.__poolId, value)

    const pool = Entity.__pools[this.__poolId]
    if (!pool)
      throw new Error(`Entity set maxStreamedIn unknown pool id: ${this.__poolId}`)

    pool.maxStreamedIn = this.__poolId
  }

  public static getStreamedIn<T extends typeof Entity>(this: T): InstanceType<T>[] {
    if (this.__poolId == null || this.__streamedIn == null)
      throw new UndefinedEntityPoolError(this)

    return this.__streamedIn as InstanceType<T>[]
  }

  public static defineEntityPool<T extends typeof Entity>(this: T, options: IEntityPoolOptions<InstanceType<T>> = {}): void {
    if (this === Entity)
      throw new Error("Entity.defineEntityPool cannot be called on Entity class, call it on your class extended from Entity")

    if (this.__poolId != null)
      throw new Error(`${this.name} pool already defined`)

    const {
      maxStreamedIn = 50,
      onStreamIn = () => {},
      onStreamOut = () => {},
    } = options

    const id = Entity.__poolIdProvider.getNext()

    Streamer.instance.addPool({
      id,
      maxStreamedIn,
    })

    const pool: IEntityPool<InstanceType<T>> = {
      streamedIn: [],
      maxStreamedIn,
      onStreamIn,
      onStreamOut,
    }

    // TODO fix this shit
    Entity.__pools[id] = pool as unknown as IEntityPool

    this.__poolId = id
    this.__maxStreamedIn = maxStreamedIn
    this.__streamedIn = pool.streamedIn
  }

  public static getByID(id: number): Entity | null {
    return Entity.__entities[id] ?? null
  }

  private static onStreamInEntityId(entityId: number) {
    const entity = Entity.__entities[entityId]

    if (!entity) {
      log.error(`Entity.onStreamIn unknown entity: ${entityId}`)
      return
    }

    if (entity.__streamed) {
      log.error(`Entity.onStreamInEntityId already streamed in: ${entityId}`)
      return
    }
    entity.__streamed = true

    const pool = this.__pools[entity.poolId]

    if (!pool) {
      log.error(`Entity.onStreamInEntityId unknown pool id: ${entity.poolId}`)
      return
    }

    if (pool.streamedIn.length >= pool.maxStreamedIn) {
      log.error(`Entity.onStreamInEntityId streamedIn.length == pool maxStreamed (${pool.maxStreamedIn})`)
      return
    }

    pool.onStreamIn(entity)
    pool.streamedIn.push(entity)
  }

  private static onStreamOutEntityId(entityId: number) {
    const entity = Entity.__entities[entityId]

    if (!entity) {
      log.error(`Entity.onStreamOutEntityId unknown entity: ${entityId}`)
      return
    }

    if (!entity.__streamed) {
      log.error(`Entity.onStreamOutEntityId already streamed out: ${entityId}`)
      return
    }
    entity.__streamed = false

    const pool = this.__pools[entity.poolId]

    if (!pool) {
      log.error(`Entity.onStreamInEntityId unknown pool id: ${entity.poolId}`)
      return
    }

    pool.onStreamOut(entity)
    pool.streamedIn.splice(
      pool.streamedIn.indexOf(entity),
      1,
    )
  }

  private __streamed = false
  private __valid = true
  private __pos: alt.IVector3

  public readonly id = Entity.__entityIdProvider.getNext()
  public readonly poolId: number
  public readonly streamRange: number

  constructor(pos: alt.IVector3, streamRange = 50) {
    const { __poolId: poolId } = this.constructor as typeof Entity

    if (poolId == null)
      throw new UndefinedEntityPoolError(this.constructor)

    this.poolId = poolId
    this.__pos = pos
    this.streamRange = streamRange

    Entity.__entities[this.id] = this
    Streamer.instance.addEntity(this)

    log.log(`create entity: ${this.id}`)
  }

  public get valid(): boolean {
    return this.__valid
  }

  // @validEntity()
  public get pos(): alt.IVector3 {
    return this.__pos
  }

  @validEntity()
  public set pos(value: alt.IVector3) {
    this.__pos = value
    Streamer.instance.setEntityPos(this, value)
  }

  @validEntity()
  public get streamed(): boolean {
    return this.__streamed
  }

  @validEntity()
  public destroy(): void {
    this.__valid = false

    if (this.__streamed)
      Entity.onStreamOutEntityId(this.id)

    delete Entity.__entities[this.id]
    Entity.__entityIdProvider.freeId(this.id)
    Streamer.instance.removeEntity(this)

    log.log(`destroy entity: ${this.id}`)
  }
}
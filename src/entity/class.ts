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
  private static poolId: number | null = null
  private static _maxStreamedIn: number | null = null
  private static _streamedIn: Entity[] | null = null
  private static readonly entityIdProvider = new IdProvider()
  private static readonly poolIdProvider = new IdProvider()

  private static readonly entities: Record<Entity["id"], Entity> = {}
  private static readonly pools: Record<number, IEntityPool> = {}

  public static get maxStreamedIn(): number {
    if (this.poolId == null || this._maxStreamedIn == null)
      throw new UndefinedEntityPoolError(this)

    return this._maxStreamedIn
  }

  public static set maxStreamedIn(value: number) {
    if (this.poolId == null)
      throw new UndefinedEntityPoolError(this)

    if (value < 0)
      throw new Error("Entity.maxStreamedIn must be > 0")

    this._maxStreamedIn = value
    Streamer.instance.setPoolMaxStreamedIn(this.poolId, value)
  }

  public static getStreamedIn<T extends typeof Entity>(this: T): InstanceType<T>[] {
    if (this.poolId == null || this._streamedIn == null)
      throw new UndefinedEntityPoolError(this)

    return this._streamedIn as InstanceType<T>[]
  }

  public static defineEntityPool<T extends typeof Entity>(this: T, options: IEntityPoolOptions<InstanceType<T>> = {}): void {
    if (this === Entity)
      throw new Error("Entity.defineEntityPool cannot be called on Entity class, call it on your class extended from Entity")

    if (this.poolId != null)
      throw new Error(`${this.name} pool already defined`)

    const {
      maxStreamedIn = 50,
      onStreamIn = () => {},
      onStreamOut = () => {},
    } = options

    const id = Entity.poolIdProvider.getNext()

    Streamer.instance.addPool({
      id,
      maxStreamedIn,
    })

    const pool: IEntityPool<InstanceType<T>> = {
      streamedIn: [],
      onStreamIn,
      onStreamOut,
    }

    // TODO fix this shit
    Entity.pools[id] = pool as unknown as IEntityPool

    this.poolId = id
    this._maxStreamedIn = maxStreamedIn
    this._streamedIn = pool.streamedIn
  }

  public static getByID(id: number): Entity | null {
    return Entity.entities[id] ?? null
  }

  private static onStreamInEntityId(entityId: number) {
    const entity = Entity.entities[entityId]

    if (!entity) {
      log.error(`Entity.onStreamIn unknown entity: ${entityId}`)
      return
    }

    if (entity._streamed) {
      log.error(`Entity.onStreamInEntityId already streamed in: ${entityId}`)
      return
    }
    entity._streamed = true

    const pool = this.pools[entity.poolId]

    if (!pool) {
      log.error(`Entity.onStreamInEntityId unknown pool id: ${entity.poolId}`)
      return
    }

    pool.onStreamIn(entity)
    pool.streamedIn.push(entity)
  }

  private static onStreamOutEntityId(entityId: number) {
    const entity = Entity.entities[entityId]

    if (!entity) {
      log.error(`Entity.onStreamOutEntityId unknown entity: ${entityId}`)
      return
    }

    if (!entity._streamed) {
      log.error(`Entity.onStreamOutEntityId already streamed out: ${entityId}`)
      return
    }
    entity._streamed = false

    const pool = this.pools[entity.poolId]

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

  private _streamed = false
  private _valid = true
  private _pos: alt.IVector3

  public readonly id = Entity.entityIdProvider.getNext()
  public readonly poolId: number
  public readonly streamRange: number

  constructor(pos: alt.IVector3, streamRange = 50) {
    const { poolId } = this.constructor as typeof Entity

    if (poolId == null)
      throw new UndefinedEntityPoolError(this.constructor)

    this.poolId = poolId
    this._pos = pos
    this.streamRange = streamRange

    Entity.entities[this.id] = this
    Streamer.instance.addEntity(this)
  }

  public get valid(): boolean {
    return this._valid
  }

  // @validEntity()
  public get pos(): alt.IVector3 {
    return this._pos
  }

  @validEntity()
  public set pos(value: alt.IVector3) {
    this._pos = value
  }

  @validEntity()
  public get streamed(): boolean {
    return this._streamed
  }

  @validEntity()
  public destroy(): void {
    this._valid = false
    delete Entity.entities[this.id]
    Entity.entityIdProvider.freeId(this.id)
    Streamer.instance.removeEntity(this)

    if (this._streamed)
      Entity.pools[this.poolId].onStreamOut(this)
  }
}
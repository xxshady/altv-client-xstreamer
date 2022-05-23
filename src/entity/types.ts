import type { Entity } from "./class"

export interface IEntityPool<TEntity extends Entity = Entity> {
  readonly id: number
  streamedIn: TEntity[]
  maxStreamedIn: number
  singleEntityStreamInPerTick: boolean
  readonly onStreamIn: (entity: TEntity) => void
  readonly onStreamOut: (entity: TEntity) => void
}
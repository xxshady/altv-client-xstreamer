import type { Entity } from "./class"

export interface IEntityPool<TEntity extends Entity = Entity> {
  streamedIn: TEntity[]
  onStreamIn: (entity: TEntity) => void
  onStreamOut: (entity: TEntity) => void
}
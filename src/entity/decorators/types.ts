import type { Entity } from "../class"

export interface IEntityPoolOptions<TEntity extends Entity = Entity> {
  maxStreamedIn?: number
  onStreamIn?: (entity: TEntity) => void
  onStreamOut?: (entity: TEntity) => void
}

export interface IEntityInitOptions {
  streamer: {
    onStreamIn: (entityId: number) => void
    onStreamOut: (entityId: number) => void
  }
}
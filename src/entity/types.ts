import type { Entity } from "./class"

export interface IEntityPool {
  streamedIn: Entity[]
  onStreamIn: (entity: Entity) => void
  onStreamOut: (entity: Entity) => void
}
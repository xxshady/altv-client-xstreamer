import type * as alt from "alt-shared"
import type {
  IWorkerEntityCreate,
  IWorkerEntityPoolOptions,
  IWorkerEntityPoolUpdate,
  IWorkerEntityUpdate,
} from "../types"

export enum WorkerIntoEvents {
  CreateEntities = "createEntities",
  DestroyEntity = "destroyEntity",
  UpdateEntity = "updateEntity",
  CreatePool = "createPool",
  UpdatePool = "updatePool",
  Stream = "stream",
}

export interface IWorkerIntoEvent {
  [WorkerIntoEvents.CreateEntities]: (entities: IWorkerEntityCreate[]) => void
  [WorkerIntoEvents.DestroyEntity]: (entityId: number) => void
  [WorkerIntoEvents.UpdateEntity]: (entityUpdate: IWorkerEntityUpdate) => void
  [WorkerIntoEvents.CreatePool]: (pool: IWorkerEntityPoolOptions) => void
  [WorkerIntoEvents.UpdatePool]: (poolUpdate: IWorkerEntityPoolUpdate) => void
  [WorkerIntoEvents.Stream]: (pos: alt.IVector2) => void
}
export enum WorkerFromEvents {
  StreamResult = "streamResult",
  EntitiesCreated = "entitiesCreated",
}

export interface IWorkerFromEvent {
  [WorkerFromEvents.StreamResult]: (streamOutEntityIds: number[], streamInEntityIds: number[]) => void
  [WorkerFromEvents.EntitiesCreated]: () => void
}
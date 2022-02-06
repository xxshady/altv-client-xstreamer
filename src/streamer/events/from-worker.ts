export enum WorkerFromEvents {
  StreamResult = "streamResult",
  EntitiesCreated = "entitiesCreated",
}

export interface IWorkerFromEvent {
  [WorkerFromEvents.StreamResult]: (streamOutEntityIds: number[], streamInEntityIds: number[], mainStream: boolean) => void
  [WorkerFromEvents.EntitiesCreated]: () => void
}
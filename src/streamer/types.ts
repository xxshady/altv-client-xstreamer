import type * as alt from "alt-shared"

export interface IWorkerEntityPoolOptions {
  readonly id: number
  maxStreamedIn: number
}

export interface IWorkerEntityPool {
  readonly id: number
  maxStreamedIn: number
}

export interface IWorkerEntityPoolUpdate {
  readonly id: number
  maxStreamedIn?: number
}

export interface IWorkerEntity {
  readonly id: number
  readonly poolId: number
  pos: alt.IVector2
  streamRange: number
  streamed: boolean
}

export interface IWorkerEntityArrElement {
  readonly id: number
  readonly poolId: number
  pos: alt.IVector2
  streamRange: number
  dist: number
  streamed: boolean
}

export interface IWorkerEntityCreate {
  id: number
  poolId: number
  pos: alt.IVector2
  streamRange: number
}

export interface IEntityCreateQueue {
  readonly chunkSize: number
  readonly entities: IWorkerEntityCreate[]
  sendPromise: { resolve: () => void } | null
  started: boolean
}
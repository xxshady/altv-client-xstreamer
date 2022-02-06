import type { Entity } from "../class"
import type { IEntityPoolOptions } from "./types"

export const defineEntityPool = <T extends Entity>(options: IEntityPoolOptions<T> = {}) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (EntityClass: { new (...args: any[]): T; defineEntityPool: (options?: IEntityPoolOptions<any>) => void }): void => {
    EntityClass.defineEntityPool(options)
  }
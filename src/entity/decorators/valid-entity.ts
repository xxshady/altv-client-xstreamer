import type { Entity } from "../class"

export const validEntity = () => function(
  target: { constructor: { name: string } },
  propertyName: string,
  descriptor: PropertyDescriptor,
): void {
  const originalMethod = descriptor.value
  const originalSetter = descriptor.set
  const originalGetter = descriptor.get

  if (typeof originalMethod === "function") {
    descriptor.value = function(this: Entity, ...args: unknown[]): void {
      assertValidEntity(this)
      originalMethod.apply(this, args)
    }

    return
  }

  if (typeof originalSetter === "function") {
    descriptor.set = function(this: Entity, value: unknown): void {
      assertValidEntity(this)
      originalSetter.call(this, value)
    }
  }

  if (typeof originalGetter === "function") {
    descriptor.get = function(this: Entity): unknown {
      assertValidEntity(this)
      return originalGetter.call(this)
    }
  }
}

function assertValidEntity(entity: Entity) {
  if (entity.valid) return
  throw new Error(`entity id: ${entity.id} (${entity.constructor?.name}) pool id: ${entity.poolId}) was destroyed`)
}
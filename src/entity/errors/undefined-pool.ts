export class UndefinedEntityPoolError extends Error {
  constructor(EntityClass: { name: string }) {
    super(
      `Entity class: ${EntityClass.name} is not defined as pool.\n` +
      `\t\t\tCall ${EntityClass.name}.defineEntityPool() or use @defineEntityPool() class decorator`,
    )
  }
}
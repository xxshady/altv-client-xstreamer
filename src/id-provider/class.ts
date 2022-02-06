export class IdProvider {
  // will be used as stack
  private readonly freeIds: number[] = []
  private currentId = 0

  public getNext(): number {
    const freeId = this.freeIds.pop()

    if (freeId != null) return freeId

    const next = this.currentId++

    if (next >= Number.MAX_SAFE_INTEGER)
      throw new Error(`[IdProvider] failed get next id: next >= ${Number.MAX_SAFE_INTEGER}`)

    return next
  }

  public freeId(id: number): void {
    this.freeIds.push(id)
  }
}
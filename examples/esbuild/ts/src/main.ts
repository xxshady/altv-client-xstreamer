import * as alt from "alt-client"
import * as native from "natives"
import { Entity, defineEntityPool, validEntity } from "altv-client-xstreamer"

@defineEntityPool<Marker>({
  maxStreamedIn: 2,
  onStreamIn: (marker) => marker.streamIn(),
  onStreamOut: (marker) => marker.streamOut(),
})
class Marker extends Entity {
  static {
    // also we can get all streamed in entities(here markers) using Marker.getStreamedIn()
    // and e.g. destroy them on disconnect/resourceStop
    // but here its just useless xd because these are markers
    // this is just an example

    alt.on("resourceStop", () => {
      const markers = Marker.getStreamedIn()
      for (let i = 0; i < markers.length; i++) {
        markers[i].streamOut()
      }
    })
  }

  private render: number | null = null

  constructor(
    pos: alt.IVector3, 
    private readonly type = 1, 
    private _scale = 0.5
  ) {
    super(pos, 5.0)
  }

  // @validEntity()
  public get scale() {
    return this._scale
  }

  // @validEntity() asserts that the entity has not yet been destroyed 
  // (entity.destroy() has not yet been called)
  @validEntity()
  public set scale(value: number) {
    this._scale = value
  }

  private streamIn() {
    this.render = alt.everyTick(() => {
      native.drawMarker(
        this.type,
        this.pos.x, this.pos.y, this.pos.z,
        0, 0, 0,
        0, 0, 0,
        this.scale, this.scale, this.scale,
        100, 170, 255, 200,
        false,
        false,
        2,
        true,
        undefined as unknown as string,
        undefined as unknown as string,
        false,
      )
    })
  }

  private  streamOut() {
    if (this.render == null) return
    alt.clearEveryTick(this.render)
    this.render = null
  }
}

// later we can change the limit of the streaming entities
Marker.maxStreamedIn = 3

new Marker(new alt.Vector3(0, 0, 71))
new Marker(new alt.Vector3(0, 1, 71))
new Marker(new alt.Vector3(0, 2, 71))
new Marker(new alt.Vector3(0, 3, 71))

const marker = new Marker(new alt.Vector3(0, 4, 71))

marker.destroy()

// error, because the entity is already destroyed and we used @validEntity() on setter/getter
marker.scale = 1.5 
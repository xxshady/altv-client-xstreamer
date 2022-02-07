import * as alt from "alt-client"
import * as native from "natives"
import { Entity } from "./streamer"

class Marker extends Entity {
  constructor(pos, type = 1, scale = 0.5) {
    super(pos, 5.0)
    this.type = type
    this.scale = scale
  }

  _streamIn() {
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
        undefined,
        undefined,
        false,
      )
    })
  }

  _streamOut() {
    alt.clearEveryTick(this.render)
    this.render = null
  }
}

Marker.defineEntityPool({
  maxStreamedIn: 2,
  onStreamIn: (marker) => marker._streamIn(),
  onStreamOut: (marker) => marker._streamOut(),
})

new Marker(new alt.Vector3(0, 0, 71))
new Marker(new alt.Vector3(0, 1, 71))
new Marker(new alt.Vector3(0, 2, 71))
new Marker(new alt.Vector3(0, 3, 71))
new Marker(new alt.Vector3(0, 4, 71))

// later we can change the limit of the streaming entities
Marker.maxStreamedIn = 3
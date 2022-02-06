import { Streamer } from "../../streamer"
import type { IEntityInitOptions } from "./types"

export const init = ({ streamer }: IEntityInitOptions): ClassDecorator =>
  (): void => {
    Streamer.instance.onStreamIn(streamer.onStreamIn)
    Streamer.instance.onStreamOut(streamer.onStreamOut)
  }
import {
  Logger as XLogger, LogLevel,
} from "altv-xlogger"

export class Logger extends XLogger {
  constructor(name: string) {
    super(`client-xstreamer > ${name}`, {
      logLevel: ___DEVMODE ? LogLevel.Info : LogLevel.Warn,
    })
  }
}
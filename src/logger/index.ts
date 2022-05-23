import {
  Logger as XLogger, LogLevel,
} from "altv-xlogger"

export class Logger extends XLogger {
  constructor(
    name: string,
    logLevel: LogLevel = ___DEVMODE ? LogLevel.Info : LogLevel.Warn,
  ) {
    super(`client-xstreamer > ${name}`, {
      logLevel,
    })
  }
}
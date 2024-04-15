import { Logger } from "types/src";

export const logger: Logger = {
  fatal: (...args: any[]) => {},
  error: (...args: any[]) => {},
  warn: (...args: any[]) => {},
  info: (...args: any[]) => {},
  debug: (...args: any[]) => {},
  trace: (...args: any[]) => {},
  silent: (...args: any[]) => {},
}

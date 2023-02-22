/* eslint-disable */
import { createLogger, format, transports } from "winston";
import Transport from "winston-transport";

/**
 * https://stackoverflow.com/a/41407246
 * Log level escpace codes
 */
const levelStyleMap: { [key: string]: string } = {
  error: "\x1b[41m%s\x1b[0m",
  warn: "\x1b[33m%s\x1b[0m",
  info: "\x1b[94m%s\x1b[0m",
  verbose: "\x1b[35m%s\x1b[0m",
  debug: "\x1b[32m%s\x1b[0m",
  silly: "\x1b[36m%s\x1b[0m",
};

class ConsoleLogTransport extends Transport {
  log(info: any, callback: { (): void }): void {
    const label = info.consoleLoggerOptions?.label! || (info.level as string).toUpperCase();
    const metadata = info.metadata.data ?
      ` ${JSON.stringify(info.metadata.data, undefined, 2)}` : "";
    const finalMessage = `[${new Date().toISOString()}] [${label}] ${info.message}${metadata}`;
    console.log(levelStyleMap[info.level], finalMessage);
    info.stack && console.log("\t", info.stack);
    callback();
  }
}

const logTransports = [
  new transports.File({
    level: "error",
    filename: "./logs/error.log",
    format: format.json({
      replacer: (key, value) => {
        if (key === "error") {
          return {
            message: (value as Error).message,
            stack: (value as Error).stack,
          };
        }
        return value;
      },
    }),
  }),
  new ConsoleLogTransport(),
];

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.splat(),
    format.metadata({ fillExcept: ["message", "level", "timestamp", "label"] })
  ),
  transports: logTransports,
  level: "silly",
});

export default logger;

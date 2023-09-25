import { ICliCommandOptions } from "../util/command";

export type LogFormat = "human" | "json";
export const logFormats: LogFormat[] = ["human", "json"];

export enum LogLevel {
  error = "error",
  warn = "warn",
  info = "info",
  verbose = "verbose",
  debug = "debug",
  trace = "trace",
}

export const LogLevels = Object.values(LogLevel);
export const LOG_FILE_DISABLE_KEYWORD = "none";
export const LOG_LEVEL_DEFAULT = LogLevel.info;
export const LOG_FILE_LEVEL_DEFAULT = LogLevel.debug;
export const LOG_DAILY_ROTATE_DEFAULT = 5;

export interface ILogArgs {
  logLevel?: LogLevel;
  logFile?: string;
  logFileLevel?: LogLevel;
  logFileDailyRotate?: number;
  logPrefix?: string;
  logFormat?: string;
  logLevelModule?: string[];
}

export const logOptions: ICliCommandOptions<ILogArgs> = {
  logLevel: {
    choices: LogLevels,
    description: "Logging verbosity level for logs to terminal",
    default: LOG_LEVEL_DEFAULT,
    type: "string",
  },

  logFile: {
    description: `Path to output all logs to a persistent log file, use '${LOG_FILE_DISABLE_KEYWORD}' to disable`,
    type: "string",
  },

  logFileLevel: {
    choices: LogLevels,
    description: "Logging verbosity level for logs to file",
    default: LOG_FILE_LEVEL_DEFAULT,
    type: "string",
  },

  logFileDailyRotate: {
    description:
      "Daily rotate log files, set to an integer to limit the file count, set to 0(zero) to disable rotation",
    default: LOG_DAILY_ROTATE_DEFAULT,
    type: "number",
  },

  logPrefix: {
    hidden: true,
    description: "Logger prefix module field with a string ID",
    type: "string",
  },

  logFormat: {
    hidden: true,
    description:
      "Log format used when emitting logs to the terminal and / or file",
    choices: logFormats,
    type: "string",
  },

  logLevelModule: {
    hidden: true,
    description:
      "Set log level for a specific module by name: 'chain=debug' or 'network=debug,chain=debug'",
    type: "array",
    string: true,
    coerce: (args: string[]) => args.map((item) => item.split(",")).flat(1),
  },
};

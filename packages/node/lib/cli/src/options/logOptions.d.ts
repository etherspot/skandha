import { ICliCommandOptions } from "../util/command.js";
export declare type LogFormat = "human" | "json";
export declare const logFormats: LogFormat[];
export declare enum LogLevel {
    error = "error",
    warn = "warn",
    info = "info",
    verbose = "verbose",
    debug = "debug",
    trace = "trace"
}
export declare const LogLevels: LogLevel[];
export declare const LOG_FILE_DISABLE_KEYWORD = "none";
export declare const LOG_LEVEL_DEFAULT = LogLevel.info;
export declare const LOG_FILE_LEVEL_DEFAULT = LogLevel.debug;
export declare const LOG_DAILY_ROTATE_DEFAULT = 5;
export interface ILogArgs {
    logLevel?: LogLevel;
    logFile?: string;
    logFileLevel?: LogLevel;
    logFileDailyRotate?: number;
    logPrefix?: string;
    logFormat?: string;
    logLevelModule?: string[];
}
export declare const logOptions: ICliCommandOptions<ILogArgs>;
//# sourceMappingURL=logOptions.d.ts.map
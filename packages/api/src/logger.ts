import pino from "pino";
import * as dotenv from 'dotenv';
dotenv.config();

// Severities fatal - 60, error - 50, warn - 40, info - 30, debug - 20, trace - 10
// if LOG_LEVEL is set to "info" severity, then debug and trace logs will be suppressed
const logger = pino({
  enabled: !process.env.BENCHMARK,
  level: process.env.LOG_LEVEL || "trace",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
  serializers: {
    res: () => null,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      body: req.body,
    }),
  },
});

export type Logger = typeof logger;

export default logger;

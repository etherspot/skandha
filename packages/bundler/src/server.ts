import bodyParser from "body-parser";
import compression from "compression";
import express, { Request, Response, NextFunction, Application } from "express";
import logger from "./logger";
import RpcError from "./errors/rpc-error";
import ApplicationError from "./errors/application-error";

function logResponseTime(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    let message = `${req.method} ${res.statusCode} ${elapsedTimeInMs}ms\t${req.path}`;
    if (req.method === "POST") {
      message += JSON.stringify(req.body);
    }
    logger.log({
      level: "debug",
      message,
      consoleLoggerOptions: { label: "API" },
    });
  });

  next();
}

export class Server {
  private app: Application;

  constructor() {
    this.app = express();
    this.setup();
  }

  setup(): void {
    this.app.use(logResponseTime);

    this.app.use(compression());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
  }

  listen(...args: any[]): void {
    this.app.use(
      (
        err: ApplicationError,
        req: Request,
        res: Response,
        next: NextFunction
      ) => {
        if (res.headersSent) {
          return next(err);
        }

        if (err instanceof RpcError) {
          const error = {
            message: err.message,
            data: err.data,
            code: err.code,
          };
          return res.status(200).json({
            jsonrpc: req.body.jsonrpc,
            id: req.body.id,
            error,
          });
        }

        // eslint-disable-next-line no-console
        console.log(err);

        return res.status(err.status || 500).json({
          error: "Unexpected behaviour",
        });
      }
    );

    this.app.listen(...args);
  }

  get application(): Application {
    return this.app;
  }
}

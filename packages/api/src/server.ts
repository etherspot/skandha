import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bodyParser from "body-parser";
import compression from "compression";
import express, { Request, Response, NextFunction, Application } from "express";
import RpcError from "types/lib/api/errors/rpc-error";
import ApplicationError from "types/lib/api/errors/application-error";
import logger from "./logger";

const packageJson = resolve(process.cwd(), "package.json");

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
      level: "info",
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

    // GET /version
    this.version();
  }

  version(): void {
    const { version } = JSON.parse(readFileSync(packageJson).toString());
    this.app.get("/version", (req, res) => {
      res.json({
        version,
      });
    });
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

        // eslint-disable-next-line no-console
        console.log(err);

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

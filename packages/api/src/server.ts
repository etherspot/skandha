import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fastify, { FastifyInstance } from "fastify";
import RpcError from "types/lib/api/errors/rpc-error";
import { ServerConfig } from "types/src/api/interfaces";
import logger from "./logger";

const packageJson = resolve(process.cwd(), "package.json");

export class Server {
  private app: FastifyInstance;

  constructor(private config: ServerConfig) {
    this.app = fastify({
      logger,
      disableRequestLogging: !config.enableRequestLogging,
      ignoreTrailingSlash: true,
    });
    this.setup();

    this.app.addHook("preHandler", (req, reply, done) => {
      if (req.method === "POST") {
        req.log.info(
          {
            method: req.method,
            url: req.url,
            body: req.body,
          },
          "REQUEST ::"
        );
      } else {
        req.log.info(
          {
            method: req.method,
            url: req.url,
          },
          "REQUEST ::"
        );
      }
      done();
    });
    // RESPONSE LOG
    this.app.addHook("preSerialization", (request, reply, payload, done) => {
      if (payload) {
        request.log.info({ body: payload }, "RESPONSE ::");
      }
      done();
    });
  }

  setup(): void {
    this.version();
  }

  version(): void {
    const { version } = JSON.parse(readFileSync(packageJson).toString());
    this.app.get("/version", () => {
      return {
        version,
      };
    });
  }

  listen(): void {
    this.app.setErrorHandler((err, req, res) => {
      // eslint-disable-next-line no-console
      logger.error(err);

      if (err instanceof RpcError) {
        const body = req.body as any;
        const error = {
          message: err.message,
          data: err.data,
          code: err.code,
        };
        return res.status(200).send({
          jsonrpc: body.jsonrpc,
          id: body.id,
          error,
        });
      }

      return res.status(err.statusCode ?? 500).send({
        error: "Unexpected behaviour",
      });
    });

    void this.app.listen({
      port: this.config.port,
      host: this.config.host,
    });
  }

  get application(): FastifyInstance {
    return this.app;
  }
}

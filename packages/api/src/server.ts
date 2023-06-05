import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import RpcError from "types/lib/api/errors/rpc-error";
import { ServerConfig } from "types/lib/api/interfaces";
import logger from "./logger";

export class Server {
  constructor(private app: FastifyInstance, private config: ServerConfig) {
    this.setup();
  }

  static async init(config: ServerConfig): Promise<Server> {
    const app = fastify({
      logger,
      disableRequestLogging: !config.enableRequestLogging,
      ignoreTrailingSlash: true,
    });

    await app.register(cors, {
      origin: config.cors,
    });

    app.addHook("preHandler", (req, reply, done) => {
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
    app.addHook("preSerialization", (request, reply, payload, done) => {
      if (payload) {
        request.log.info({ body: payload }, "RESPONSE ::");
      }
      done();
    });

    return new Server(app, config);
  }

  setup(): void {
    this.app.get("*", () => {
      return "GET requests are not supported. Visit https://docs.etherspot.io/etherspot-skandha-bundler";
    });
  }

  async listen(): Promise<void> {
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

    await this.app.listen({
      port: this.config.port,
      host: this.config.host,
    });
  }

  get application(): FastifyInstance {
    return this.app;
  }
}